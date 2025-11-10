import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para processar em background
async function processInBackground(queueId: string, queueItem: any, supabase: any) {
  try {
    console.log(`[Background] Starting processing for: ${queueId}`);

    // Buscar texto já extraído no frontend
    const extractedText = queueItem.extracted_text;

    // Sanitizar texto para prevenir erros de null bytes
    const sanitizedText = extractedText
      ? extractedText
          .replace(/\u0000/g, "")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
          .trim()
      : "";

    if (!sanitizedText || sanitizedText.length < 10) {
      throw new Error("Texto extraído não encontrado ou insuficiente (após sanitização)");
    }

    const removedChars = extractedText.length - sanitizedText.length;
    if (removedChars > 0) {
      console.log(`[Background] Removed ${removedChars} problematic characters from text`);
    }

    console.log(`[Background] Using pre-extracted text: ${sanitizedText.length} characters`);

    // Atualizar: analisando com IA
    await supabase
      .from("doc_queue")
      .update({
        mensagem_atual: "Analisando documento com IA...",
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueId);

    // Chamar função processar-documento
    console.log("[Background] Calling processar-documento function");
    const fileDate = queueItem.file_date || queueItem.created_at;
    console.log("[Background] 📅 FileDate enviado para processamento:", fileDate);

    const processingPayload = {
      extractedText: sanitizedText,
      fileName: queueItem.nome_arquivo,
      fileDate: fileDate,
      userId: queueItem.usuario_criador_id,
    };

    const { data: analysisData, error: analysisError } = await supabase.functions.invoke("processar-documento", {
      body: processingPayload,
    });

    if (analysisError) {
      console.error("[Background] Error in processar-documento:", analysisError);
      throw new Error(`Erro na análise: ${analysisError.message}`);
    }

    if (!analysisData.success) {
      console.error("[Background] Processing failed:", analysisData);
      throw new Error(analysisData.error || "Erro no processamento");
    }

    // ✅ SUCESSO: Finalizar com sucesso
    console.log("[Background] Processing completed successfully");
    await supabase
      .from("doc_queue")
      .update({
        status: "finalizado",
        mensagem_atual: "Processamento concluído",
        dados_extraidos: analysisData.data,
        processando_desde: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueId);
  } catch (error) {
    console.error("[Background] Error in processing:", error);

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const tentativas = queueItem.tentativas_processamento;

    // ❌ ERRO: Verificar se deve fazer retry
    if (tentativas < 3) {
      // RETRY: Resetar para "aguardando" (será reprocessado quando FilaImportacao montar)
      console.log(`[Background] Retry ${tentativas}/3 - Resetting to aguardando`);
      await supabase
        .from("doc_queue")
        .update({
          status: "aguardando",
          mensagem_atual: `Tentativa ${tentativas}/3 falhou - Aguardando retry: ${errorMessage}`,
          processando_desde: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueId);
    } else {
      // ERRO PERMANENTE: 3 tentativas esgotadas
      console.log(`[Background] Max retries reached (${tentativas}/3) - Marking as error`);
      await supabase
        .from("doc_queue")
        .update({
          status: "erro",
          mensagem_atual: `Erro após ${tentativas} tentativas: ${errorMessage}`,
          processando_desde: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueId);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let queueId: string | null = null;

  try {
    // Validate input with Zod
    const requestSchema = z.object({
      queueId: z.string().uuid('queueId must be a valid UUID')
    });

    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid input', 
          details: validation.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    queueId = validation.data.queueId;

    console.log("Processing queue item:", queueId);

    // Buscar item da fila
    const { data: queueItem, error: queueError } = await supabase
      .from("doc_queue")
      .select("*")
      .eq("id", queueId)
      .single();

    if (queueError) {
      console.error("Error fetching queue item:", queueError);
      throw new Error("Item não encontrado na fila");
    }

    // Verificar tentativas (se >= 3, falhar permanentemente)
    if (queueItem.tentativas_processamento >= 3) {
      console.error(`Max retries exceeded for queue item: ${queueId}`);
      await supabase
        .from("doc_queue")
        .update({
          status: "erro",
          mensagem_atual: "Máximo de tentativas excedido (3/3)",
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueId);

      return new Response(JSON.stringify({ success: false, error: "Máximo de tentativas excedido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Atualizar status para processando + incrementar tentativas
    const novaTentativa = (queueItem.tentativas_processamento || 0) + 1;
    console.log(`Starting processing attempt ${novaTentativa}/3 for: ${queueId}`);

    await supabase
      .from("doc_queue")
      .update({
        status: "processando",
        tentativas_processamento: novaTentativa,
        processando_desde: new Date().toISOString(),
        ultima_tentativa_em: new Date().toISOString(),
        mensagem_atual: `Iniciando processamento (tentativa ${novaTentativa}/3)...`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueId);

    // ✅ RETORNAR RESPOSTA IMEDIATA (não esperar processamento)
    console.log("Returning immediate response - processing will continue in background");

    // 🔄 PROCESSAR EM BACKGROUND (não bloqueia a resposta)
    // Em Deno, simplesmente não fazer await permite que a função continue executando
    if (queueId) {
      processInBackground(queueId, queueItem, supabase).catch((err) => {
        console.error("[Background] Unhandled error in background task:", err);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Processamento iniciado em background",
        attempt: novaTentativa,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in file-ingest (initial setup):", error);

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    // Atualizar status para erro (apenas erros na configuração inicial)
    if (queueId) {
      await supabase
        .from("doc_queue")
        .update({
          status: "erro",
          mensagem_atual: `Erro na configuração inicial: ${errorMessage}`,
          processando_desde: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueId);
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
