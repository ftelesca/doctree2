import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  resumo_executivo: string;
  cronologia: Array<{ data: string; evento: string }>;
  entidades_chave: Array<{ nome: string; tipo: string; papel: string }>;
  relacionamentos: Array<{ descricao: string }>;
  insights: Array<{ titulo: string; descricao: string; prioridade: 'alta' | 'media' | 'baixa' }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Validate input with Zod
    const requestSchema = z.object({
      folder_id: z.string().uuid('folder_id must be a valid UUID')
    });

    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { folder_id } = validation.data;

    console.log(`[analisar-pasta] Iniciando análise da pasta ${folder_id} para usuário ${user.id}`);

    // 1. Buscar dados da pasta
    const { data: folder, error: folderError } = await supabaseClient
      .from('folder')
      .select('descricao')
      .eq('id', folder_id)
      .single();

    if (folderError || !folder) {
      throw new Error('Pasta não encontrada');
    }

    // 2. Buscar documentos da pasta (usando apenas doc.descricao)
    const { data: documentos, error: docsError } = await supabaseClient
      .from('doc')
      .select('id, descricao, data_referencia, aprovado')
      .eq('folder_id', folder_id)
      .order('data_referencia', { ascending: true });

    if (docsError) {
      console.error('[analisar-pasta] Erro ao buscar documentos:', docsError);
      throw new Error('Erro ao buscar documentos');
    }

    console.log(`[analisar-pasta] Encontrados ${documentos?.length || 0} documentos`);

    // 3. Buscar entidades vinculadas aos documentos
    const { data: entidades, error: entidadesError } = await supabaseClient
      .from('doc_entity')
      .select(`
        entity:entity_id (
          id,
          nome,
          identificador_1,
          identificador_2,
          entity_type:entity_type_id (
            nome,
            descricao
          )
        ),
        doc:doc_id (
          id
        )
      `)
      .in('doc_id', documentos?.map(d => d.id) || []);

    if (entidadesError) {
      console.error('[analisar-pasta] Erro ao buscar entidades:', entidadesError);
    }

    // Processar entidades únicas com contagem
    const entidadesMap = new Map();
    entidades?.forEach((de: any) => {
      if (de.entity) {
        const key = de.entity.id;
        if (!entidadesMap.has(key)) {
          entidadesMap.set(key, {
            nome: de.entity.nome,
            identificador: de.entity.identificador_1,
            tipo: de.entity.entity_type?.nome || 'Desconhecido',
            tipo_descricao: de.entity.entity_type?.descricao || '',
            documentos: new Set()
          });
        }
        entidadesMap.get(key).documentos.add(de.doc?.id);
      }
    });

    const entidadesResumo = Array.from(entidadesMap.values()).map(e => ({
      nome: e.nome,
      identificador: e.identificador,
      tipo: e.tipo,
      frequencia: e.documentos.size
    })).sort((a, b) => b.frequencia - a.frequencia);

    // 4. Mapear relacionamentos (quais entidades aparecem em quais documentos)
    const relacionamentosMap = new Map();
    entidades?.forEach((de: any) => {
      if (de.entity && de.doc) {
        const entityNome = de.entity.nome;
        const docId = de.doc.id;
        const doc = documentos?.find(d => d.id === docId);
        
        if (!relacionamentosMap.has(entityNome)) {
          relacionamentosMap.set(entityNome, []);
        }
        if (doc) {
          relacionamentosMap.get(entityNome).push(doc.descricao);
        }
      }
    });

    // 5. Construir prompt otimizado
    const periodo = documentos && documentos.length > 0 ? {
      inicio: documentos[0]?.data_referencia,
      fim: documentos[documentos.length - 1]?.data_referencia
    } : null;

    const userPrompt = `
Analise a pasta "${folder.descricao}" com os seguintes dados:

📊 VISÃO GERAL:
- Total de documentos: ${documentos?.length || 0}
${periodo ? `- Período: ${periodo.inicio} a ${periodo.fim}` : ''}

📄 DOCUMENTOS (resumo):
${documentos?.map(d => 
  `• [${d.data_referencia}] ${d.aprovado ? '✓ Aprovado' : '⏳ Pendente'}\n  ${d.descricao}`
).join('\n\n') || 'Nenhum documento encontrado'}

👥 ENTIDADES IDENTIFICADAS (${entidadesResumo.length} total):
${entidadesResumo.map(e => 
  `• ${e.tipo}: ${e.nome}${e.identificador ? ` (${e.identificador})` : ''} - ${e.frequencia} documento(s)`
).join('\n') || 'Nenhuma entidade identificada'}

🔗 RELACIONAMENTOS:
${Array.from(relacionamentosMap.entries()).map(([entidade, docs]) =>
  `• ${entidade}:\n${(docs as string[]).map(d => `  - ${d}`).join('\n')}`
).join('\n\n') || 'Nenhum relacionamento identificado'}

Forneça uma análise estruturada profissional com:
1. RESUMO EXECUTIVO (3-4 parágrafos sobre o contexto e propósito desta pasta)
2. CRONOLOGIA (principais eventos/documentos em ordem temporal)
3. ENTIDADES-CHAVE (quem são os atores principais e seu papel no contexto)
4. RELACIONAMENTOS (como as entidades se conectam através dos documentos)
5. INSIGHTS (padrões importantes, observações relevantes, possíveis ações futuras)

Retorne APENAS JSON válido neste formato:
{
  "resumo_executivo": "string",
  "cronologia": [{"data": "YYYY-MM-DD", "evento": "string"}],
  "entidades_chave": [{"nome": "string", "tipo": "string", "papel": "string"}],
  "relacionamentos": [{"descricao": "string"}],
  "insights": [{"titulo": "string", "descricao": "string", "prioridade": "alta|media|baixa"}]
}`;

    console.log(`[analisar-pasta] Prompt construído com ~${userPrompt.length} caracteres`);

    // 6. Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um analista especializado em documentos jurídicos e imobiliários. Analise os dados estruturados fornecidos e gere insights relevantes. Retorne APENAS JSON válido, sem texto adicional.'
          },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[analisar-pasta] Erro na chamada AI:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos insuficientes. Adicione créditos ao seu workspace Lovable.');
      }
      throw new Error('Erro ao chamar serviço de IA');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('[analisar-pasta] Resposta recebida da IA');

    // 7. Parsear resposta JSON
    let analise: AnalysisResult;
    try {
      // Remover possíveis markdown code blocks
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analise = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[analisar-pasta] Erro ao parsear JSON da IA:', parseError);
      console.error('[analisar-pasta] Conteúdo recebido:', aiContent);
      throw new Error('Erro ao processar resposta da IA');
    }

    console.log('[analisar-pasta] Análise concluída com sucesso');
    console.log('[analisar-pasta] Estrutura da análise:', JSON.stringify({
      tem_resumo: !!analise.resumo_executivo,
      tem_cronologia: Array.isArray(analise.cronologia) ? analise.cronologia.length : 0,
      tem_entidades: Array.isArray(analise.entidades_chave) ? analise.entidades_chave.length : 0,
      tem_relacionamentos: Array.isArray(analise.relacionamentos) ? analise.relacionamentos.length : 0,
      tem_insights: Array.isArray(analise.insights) ? analise.insights.length : 0,
    }));

    return new Response(
      JSON.stringify(analise),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analisar-pasta] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
