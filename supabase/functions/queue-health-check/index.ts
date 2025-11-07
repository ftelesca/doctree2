import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("Running queue health check...");

    // Buscar itens "travados" (processando há mais de 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckItems, error } = await supabase
      .from("doc_queue")
      .select("id, nome_arquivo, tentativas_processamento, processando_desde")
      .eq("status", "processando")
      .lt("processando_desde", fiveMinutesAgo);

    if (error) {
      console.error("Error fetching stuck items:", error);
      throw error;
    }

    if (!stuckItems || stuckItems.length === 0) {
      console.log("No stuck items found");
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No stuck items found",
          count: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${stuckItems.length} stuck items:`, stuckItems.map(i => i.nome_arquivo));

    // Resetar status para "aguardando" ou "erro" dependendo das tentativas
    const resetPromises = stuckItems.map((item) => {
      // Se já tentou 3x, marcar como erro permanente
      if (item.tentativas_processamento >= 3) {
        console.log(`Marking as error (max retries): ${item.nome_arquivo}`);
        return supabase.from("doc_queue").update({
          status: "erro",
          mensagem_atual: "Timeout após 3 tentativas - processamento travado",
          processando_desde: null,
          updated_at: new Date().toISOString()
        }).eq("id", item.id);
      }
      
      // Caso contrário, resetar para retry
      console.log(`Resetting to aguardando (retry ${item.tentativas_processamento}/3): ${item.nome_arquivo}`);
      return supabase.from("doc_queue").update({
        status: "aguardando",
        mensagem_atual: `Resetado por timeout (tentativa ${item.tentativas_processamento}/3) - aguardando retry`,
        processando_desde: null,
        updated_at: new Date().toISOString()
      }).eq("id", item.id);
    });

    await Promise.all(resetPromises);

    console.log(`Successfully reset ${stuckItems.length} stuck items`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Reset ${stuckItems.length} stuck items`,
        count: stuckItems.length,
        items: stuckItems.map(i => ({
          nome: i.nome_arquivo,
          tentativas: i.tentativas_processamento,
          travado_desde: i.processando_desde
        }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Health check error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
