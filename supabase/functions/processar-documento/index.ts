import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { extractedText, fileName, fileDate, userId } = await req.json();

    console.log("Processing document:", { fileName, fileDate, userId });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    if (!extractedText || typeof extractedText !== "string") {
      throw new Error("No extracted text provided");
    }

    console.log("Received extracted text, length:", extractedText.length);

    // Buscar entidades configuradas no sistema
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: entidades, error: entidadesError } = await supabase
      .from("entity_type")
      .select("nome, prompt")
      .order("nome");

    if (entidadesError) {
      console.error("Erro ao buscar entidades:", entidadesError);
      throw new Error("Erro ao buscar configuração de entidades");
    }

    console.log("Entidades configuradas:", entidades?.length || 0);

    // Construir prompt dinâmico com base nas entidades configuradas
    const entidadesPrompts = entidades?.map((e) => e.prompt).join("\n\n") || "";

    // Analyze extracted text
    console.log("Step 2: Analyzing extracted text");
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você é um extrator extremamente conservador. SUA ÚNICA FONTE é o texto fornecido pelo usuário. NUNCA invente, não complete lacunas, não assuma abreviações. Se estiver em dúvida, OMITA. Só retorne entidades quando todos os critérios forem atendidos. Sempre valide CPF/CNPJ pelos dígitos verificadores (módulo 11). Retorne APENAS JSON válido.",
          },
          {
            role: "user",
            content: `ASSISTENTE ESPECIALIZADO EM EXTRAÇÃO DE DADOS (DOCUMENTOS JURÍDICOS E IMOBILIÁRIOS)

OBJETIVO
Extrair com precisão dados das entidades configuradas a partir do TEXTO abaixo (resultado de OCR LOCAL + texto nativo do PDF), validando CPFs/CNPJs e normalizando datas.

DIRETIVAS FUNDAMENTAIS:
- NÃO INVENTE NOMES DE ENTIDADES QUE NÃO ESTÃO PRESENTES NO DOCUMENTO.
- CRÍTICO: identificador_1 e identificador_2 NÃO PODEM CONTER ESPAÇOS EM BRANCO. Se o identificador tiver espaços, use APENAS o primeiro trecho antes do primeiro espaço. Exemplos:
  * "01201680 - CL nº 06992-2" → use apenas "01201680"
  * "95087 CL 123" → use apenas "95087"
  * "12345 ABC" → use apenas "12345"

RESTRIÇÃO ABSOLUTA
- NUNCA inventar informações que não estejam literalmente no texto.
- Não inferir nomes ou endereços. Se não constar no texto, OMITA.
- CORREÇÃO DE OCR: Em contextos numéricos (CPF, CNPJ, CEP, números de endereço, matrículas), corrigir confusões comuns:
  * O (letra) → 0 (zero)
  * l (L minúsculo) ou I (i maiúsculo) ou ] (colchete) → 1 (um)
  * S (letra) → 5 (cinco) quando em sequência numérica
  * B (letra) → 8 (oito) quando em sequência numérica

VALIDAÇÃO OBRIGATÓRIA DE CPF/CNPJ
- Ler CPF/CNPJ completos próximos às palavras "CPF" e "CNPJ".
- Calcular os dois dígitos verificadores pelo algoritmo de módulo 11 (regras específicas para CPF e CNPJ).
- Comparar com os dois últimos dígitos lidos.
- Se NÃO coincidirem: considerar leitura incorreta → NÃO incluir a entidade.

ENTIDADES A EXTRAIR
${entidadesPrompts}

REGRAS GERAIS
- Endereços DEVEM seguir este formato (incluindo APENAS as partes que existem no documento):
  tipo logradouro numero complemento, bairro, cidade-estado, CEP
  Usar abreviações dos Correios para tipo de logradouro: Av. (Avenida), R. (Rua), Pç. (Praça), Al. (Alameda), Trav. (Travessa), Rod. (Rodovia), Est. (Estrada)
  Usar abreviações para complemento: Apto. (Apartamento), Bl. (Bloco), Conj. (Conjunto), Ed. (Edifício), Sl. (Sala), Lj. (Loja), Sobreloja (Solj.)
  IMPORTANTE: Se alguma parte do endereço não existir no documento (bairro, CEP, etc.), OMITIR essa parte completamente. NÃO usar "null", "undefined" ou qualquer placeholder.
  Exemplo completo: Av. Edson Passos 541 Apto. C-01, Freguesia do Engenho Velho, Rio de Janeiro-RJ, 20940-200
  Exemplo sem bairro e CEP: Av. Edson Passos 541 Apto. C-01, Rio de Janeiro-RJ
- Não duplicar entidades.
- Não usar endereços que sejam apenas qualificação de pessoas/organizações.

DESCRIÇÃO DO EVENTO
- Produzir um resumo COMPREENSIVO do documento, incluindo:
  * Tipo e natureza do documento (ex: "Certidão de matrícula de imóvel", "Contrato de compra e venda", "Escritura pública", "Alteração de contrato social")
  * Principais fatos, transações ou eventos descritos no documento
  * Contexto relevante que ajude a identificar o documento posteriormente
- PODE incluir referências gerais a transações (ex: "compra e venda", "constituição de sociedade", "alteração de endereço")
- Manter o resumo objetivo e informativo, entre 1-3 frases
- Exemplo: "Alteração do contrato social para mudança de endereço da sede da empresa de Mesquita-RJ para Rio de Janeiro-RJ"

DATA DE REFERÊNCIA – PRIORIDADE DE BUSCA E EXTRAÇÃO EXATA
- PRIMEIRA PRIORIDADE: Procurar datas de assinatura, emissão ou execução nas ÚLTIMAS PÁGINAS do documento (final do texto). Datas em documentos jurídicos geralmente aparecem no final.
- SEGUNDA PRIORIDADE: Procurar datas de emissão no cabeçalho ou início do documento.
- TERCEIRA PRIORIDADE: Se não encontrar data no texto, usar a data do arquivo: ${fileDate ? new Date(fileDate).toISOString().split("T")[0] : "não disponível"}

REGRAS CRÍTICAS PARA EXTRAÇÃO DE DATAS:
- Transcrever EXATAMENTE o dia, mês e ano que aparecem no documento
- NÃO fazer nenhuma conversão de timezone ou ajuste de dia
- Formatos aceitos no documento: DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA, "DD de MMMM de AAAA"
- Normalização final: converter para AAAA-MM-DD mantendo EXATAMENTE o mesmo dia
- Exemplos CORRETOS: 
  * "26/05/2025" → "2025-05-26" (dia 26 permanece 26)
  * "19 de janeiro de 2023" → "2023-01-19" (dia 19 permanece 19)
  * "05/02/2024" → "2024-02-05" (dia 05 permanece 05)
- NUNCA subtrair ou adicionar dias durante a conversão

FORMATO DE SAÍDA
- Cada entidade deve seguir EXATAMENTE o formato JSON especificado no seu próprio prompt
- O JSON final deve conter:
{
"descricao": "resumo do documento",
"data_referencia": "YYYY-MM-DD ou null",
"entidades": [array de entidades seguindo o formato específico de cada tipo]
}

TEXTO A SER ANALISADO (única fonte):
${extractedText}

Retorne apenas o JSON final, sem markdown.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI API error:", aiResponse.status, errorText);

      let errorMessage = "OpenAI API error";
      if (aiResponse.status === 401) {
        errorMessage = "API key inválida ou não autorizada";
      } else if (aiResponse.status === 429) {
        errorMessage = "Rate limit excedido. Tente novamente em alguns instantes";
      } else if (aiResponse.status === 402) {
        errorMessage = "Créditos insuficientes na conta OpenAI";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: errorText,
          status: aiResponse.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let aiData;
    try {
      aiData = await aiResponse.json();
      console.log("AI response received, has choices:", !!aiData?.choices);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse AI response",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("AI analysis complete");
    const analysisText = aiData?.choices?.[0]?.message?.content ?? "";

    if (!analysisText) {
      console.error("AI response has no content");
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI returned empty response",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse JSON from AI response (remove markdown if present)
    let analysisJson;
    try {
      if (!analysisText) throw new Error("Empty AI response content");
      const cleaned = analysisText.trim().replace(/^```json\s*|```$/g, "");
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      analysisJson = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
      console.log("AI returned entities:", JSON.stringify(analysisJson?.entidades || []));
    } catch (e) {
      console.error("Failed to parse AI response:", analysisText);
      throw new Error("Failed to parse AI analysis");
    }

    // Validação server-side para evitar dados inventados
    const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
    const isRepeated = (s: string) => /^(\d)\1+$/.test(s);

    // Converter para title case inteligente (preserva endereços e siglas)
    const toSmartTitleCase = (str: string) => {
      if (!str) return str;

      // Detectar se é endereço (contém padrões mais específicos)
      const isAddress = /\d+.*,|Av\.|R\.|Pç\.|Al\.|Trav\.|Rod\.|Est\.|Apto\.|Bl\.|CEP|,.*-[A-Z]{2}$/i.test(str);
      if (isAddress) {
        return str; // Não modificar endereços
      }

      // Siglas e abreviações comuns que devem ser preservadas em maiúsculas
      const preservedAcronyms = new Set([
        "LTDA",
        "LTDA.",
        "S.A.",
        "S/A",
        "ME",
        "MEI",
        "EPP",
        "EIRELI",
        "CIA",
        "CIA.",
        "INC",
        "INC.",
        "CORP",
        "CORP.",
      ]);

      // Palavras que devem ficar em minúsculas (exceto no início)
      const lowercaseWords = new Set(["de", "da", "do", "dos", "das", "e", "em", "a", "o", "os", "as"]);

      const words = str.toLowerCase().split(" ");
      const originalWords = str.split(" ");

      return words
        .map((word, index) => {
          const originalWord = originalWords[index];

          // Primeira palavra sempre maiúscula, mesmo que seja preposição
          if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1);
          }

          // Preposições e artigos em minúscula (verificar ANTES de preservar siglas curtas)
          if (lowercaseWords.has(word)) {
            return word;
          }

          // Preservar siglas conhecidas
          const wordUpper = word.toUpperCase().replace(/\./g, "");
          if (preservedAcronyms.has(wordUpper)) {
            return originalWord.toUpperCase();
          }

          // Preservar siglas curtas (2-4 letras todas maiúsculas no original)
          // Mas apenas se não forem preposições (já verificado acima)
          if (originalWord && originalWord.length <= 4 && originalWord === originalWord.toUpperCase()) {
            return originalWord;
          }

          // Demais palavras: primeira letra maiúscula
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
    };

    const validateCPF = (input: string) => {
      let cpf = onlyDigits(input);
      if (cpf.length !== 11 || isRepeated(cpf)) return false;
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
      let rest = (sum * 10) % 11;
      if (rest === 10) rest = 0;
      if (rest !== parseInt(cpf[9])) return false;
      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
      rest = (sum * 10) % 11;
      if (rest === 10) rest = 0;
      return rest === parseInt(cpf[10]);
    };

    const validateCNPJ = (input: string) => {
      let cnpj = onlyDigits(input);
      if (cnpj.length !== 14 || isRepeated(cnpj)) return false;
      const calc = (base: string, weights: number[]) => {
        let sum = 0;
        for (let i = 0; i < weights.length; i++) sum += parseInt(base[i]) * weights[i];
        const mod = sum % 11;
        return mod < 2 ? 0 : 11 - mod;
      };
      const d1 = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
      const d2 = calc(cnpj.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
      return d1 === parseInt(cnpj[12]) && d2 === parseInt(cnpj[13]);
    };

    // Normalizar texto removendo acentos e caracteres especiais para comparação
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[çÇ]/g, "c") // Substitui cedilha
        .replace(/\s+/g, " ")
        .trim();
    };

    const textNormalized = normalizeText(extractedText || "");
    const appearsInText = (s?: string) => {
      if (!s) return false;
      const norm = normalizeText(s);
      return norm.length > 2 && textNormalized.includes(norm);
    };

    const original = Array.isArray(analysisJson?.entidades) ? analysisJson.entidades : [];

    const filtered = original.filter((e: any) => {
      // Validação básica: tipo e nome são obrigatórios
      if (!e || !e.tipo || !e.nome) {
        console.log("Filtered out (missing tipo or nome):", JSON.stringify(e));
        return false;
      }

      // Para pessoa e organização, identificador_1 é obrigatório
      // Para imóvel, identificador_1 é opcional (pode ter apenas endereço)
      if ((e.tipo === "pessoa" || e.tipo === "organizacao") && !e.identificador_1) {
        console.log("Filtered out (missing identificador_1):", JSON.stringify(e));
        return false;
      }

      if (e.tipo === "pessoa") {
        const valid = validateCPF(e.identificador_1) && appearsInText(e.nome);
        if (!valid)
          console.log(
            "Filtered out pessoa:",
            e,
            "CPF valid:",
            validateCPF(e.identificador_1),
            "Name in text:",
            appearsInText(e.nome),
          );
        return valid;
      }

      if (e.tipo === "organizacao") {
        // Aceitar se tiver CNPJ válido OU se o nome contiver indicadores corporativos (LTDA, S.A., etc.)
        const hasCorporateIndicator = /\b(ltda|s\.?a\.?|s\/a|me\b|mei\b|epp\b|eireli)/i.test(e.nome);
        const cnpjValid = validateCNPJ(e.identificador_1);
        const nameInText = appearsInText(e.nome);

        const valid = nameInText && (cnpjValid || hasCorporateIndicator);
        if (!valid)
          console.log(
            "Filtered out organizacao:",
            e,
            "CNPJ valid:",
            cnpjValid,
            "Has corporate indicator:",
            hasCorporateIndicator,
            "Name in text:",
            nameInText,
          );
        return valid;
      }

      if (e.tipo === "imovel") {
        // Para imóveis, aceitar se tiver identificador_1 OU identificador_2 (matrícula) OU se o endereço aparecer no texto
        const valid =
          (e.identificador_1 && e.identificador_1.length > 0) ||
          (e.identificador_2 && e.identificador_2.length > 0) ||
          appearsInText(e.nome);
        if (!valid)
          console.log(
            "Filtered out imovel:",
            e,
            "Has identifier_1:",
            !!e.identificador_1,
            "Has identifier_2:",
            !!e.identificador_2,
            "Address in text:",
            appearsInText(e.nome),
          );
        return valid;
      }

      return false;
    });

    console.log("Entities after filtering:", JSON.stringify(filtered));

    // Aplicar title case aos nomes das entidades
    const entitiesWithTitleCase = filtered.map((e: any) => ({
      ...e,
      nome: toSmartTitleCase(e.nome),
    }));

    analysisJson.entidades = entitiesWithTitleCase;

    // Função para extrair data do texto em português
    const extractDateFromTextPT = (text: string): string | null => {
      const MONTHS_PT: Record<string, string> = {
        janeiro: "01",
        fevereiro: "02",
        marco: "03",
        março: "03",
        abril: "04",
        maio: "05",
        junho: "06",
        julho: "07",
        agosto: "08",
        setembro: "09",
        outubro: "10",
        novembro: "11",
        dezembro: "12",
      };

      // Áreas de busca: final (últimos 2000 chars), início (primeiros 2000), texto completo
      const tail = text.slice(-2000);
      const head = text.slice(0, 2000);
      const candidatesAreas = [tail, head, text];

      for (const area of candidatesAreas) {
        let match: RegExpExecArray | null;
        let lastFound: { y: string; m: string; d: string } | null = null;

        // Padrão 1: "DD de mmmm de AAAA"
        const pattern1 =
          /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/gi;
        const regex1 = new RegExp(pattern1);
        while ((match = regex1.exec(area))) {
          const d = match[1].padStart(2, "0");
          const monthName = match[2]
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          const m = MONTHS_PT[monthName];
          const y = match[3];
          if (m) lastFound = { y, m, d };
        }
        if (lastFound) {
          const dateStr = `${lastFound.y}-${lastFound.m}-${lastFound.d}`;
          console.log("📅 Data extraída do texto (padrão extenso):", dateStr);
          return dateStr;
        }

        // Padrão 2: "DD/MM/AAAA" (ou -, .)
        const pattern2 = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g;
        const regex2 = new RegExp(pattern2);
        while ((match = regex2.exec(area))) {
          const d = match[1].padStart(2, "0");
          const m = match[2].padStart(2, "0");
          const y = match[3];
          lastFound = { y, m, d };
        }
        if (lastFound) {
          const dateStr = `${lastFound.y}-${lastFound.m}-${lastFound.d}`;
          console.log("📅 Data extraída do texto (padrão numérico):", dateStr);
          return dateStr;
        }
      }

      return null;
    };

    // Garantir que data_referencia nunca seja null
    if (!analysisJson.data_referencia) {
      // Tentar extrair do texto primeiro
      const dateFromText = extractDateFromTextPT(extractedText);
      if (dateFromText) {
        analysisJson.data_referencia = dateFromText;
      } else if (fileDate) {
        // Fallback: usar data do arquivo (sem timezone shift)
        const fileDateStr =
          typeof fileDate === "string" ? fileDate.slice(0, 10) : new Date(fileDate).toISOString().slice(0, 10);
        analysisJson.data_referencia = fileDateStr;
        console.log("📅 Usando data do arquivo (fallback):", analysisJson.data_referencia);
      } else {
        console.warn("⚠️ Nenhuma data encontrada (nem no texto nem no arquivo)");
      }
    } else {
      console.log("📅 Data retornada pela IA:", analysisJson.data_referencia);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisJson,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
