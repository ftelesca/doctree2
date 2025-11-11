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
    const { storagePath } = await req.json();

    if (!storagePath) {
      return new Response(JSON.stringify({ success: false, error: "storagePath é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Downloading PDF from storage:", storagePath);

    // Baixar PDF do storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documentos")
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("Error downloading file:", downloadError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao baixar arquivo do storage" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Converter para ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log("PDF downloaded, size:", uint8Array.length, "bytes");

    // Criar arquivo temporário
    const tempInputPath = `/tmp/input_${crypto.randomUUID()}.pdf`;
    const tempOutputPath = `/tmp/output_${crypto.randomUUID()}.pdf`;

    await Deno.writeFile(tempInputPath, uint8Array);

    console.log("Running ocrmypdf...");

    // Executar ocrmypdf
    const command = new Deno.Command("ocrmypdf", {
      args: [
        "--skip-text",
        "--deskew",
        "--clean",
        "--language",
        "por",
        "--output-type",
        "pdf",
        tempInputPath,
        tempOutputPath,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error("ocrmypdf error:", errorText);
      
      // Se ocrmypdf falhar, tentar extrair texto do PDF original
      console.log("Fallback: extracting text from original PDF");
      return await extractTextFallback(tempInputPath);
    }

    console.log("ocrmypdf completed successfully");

    // Ler PDF processado
    const processedPdf = await Deno.readFile(tempOutputPath);

    // Extrair texto do PDF processado usando pdftotext
    const textCommand = new Deno.Command("pdftotext", {
      args: ["-layout", tempOutputPath, "-"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code: textCode, stdout: textStdout, stderr: textStderr } = await textCommand.output();

    // Limpar arquivos temporários
    await Deno.remove(tempInputPath);
    await Deno.remove(tempOutputPath);

    if (textCode !== 0) {
      const errorText = new TextDecoder().decode(textStderr);
      console.error("pdftotext error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao extrair texto do PDF" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const extractedText = new TextDecoder().decode(textStdout);

    console.log("Text extracted, length:", extractedText.length);

    return new Response(
      JSON.stringify({
        success: true,
        extractedText: extractedText.trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-pdf-text:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Fallback para extrair texto de PDF original
async function extractTextFallback(pdfPath: string) {
  try {
    const textCommand = new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await textCommand.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error("pdftotext fallback error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao extrair texto do PDF (fallback)" }),
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        }
      );
    }

    const extractedText = new TextDecoder().decode(stdout);

    return new Response(
      JSON.stringify({
        success: true,
        extractedText: extractedText.trim(),
      }),
      { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      }
    );
  }
}
