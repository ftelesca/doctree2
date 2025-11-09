## Copilot / Agentes — Instruções rápidas (projeto: DocTree)

Objetivo: fornecer contexto prático para agentes de codificação acelerarem tarefas neste repositório.

- Ambiente de desenvolvimento: GitHub Codespaces

- Linguagem / stack: frontend React + TypeScript (Vite). Autenticação e armazenamento em Supabase. Funções serverless escritas em Deno (pasta `supabase/functions`) que chamam OpenAI.

- Comandos úteis:
  - Instalar dependências: `npm ci`
  - Rodar em dev: `npm run dev`
  - Build de produção: `npm run build`
  - Lint: `npm run lint`

- Pontos de entrada importantes:
  - Frontend React: `src/` — componentes principais em `src/components/`, páginas em `src/pages/`.
  - Autenticação & perfil: `src/contexts/AuthContext.tsx` (usa `supabase.auth.onAuthStateChange`).
  - Supabase client e tipos: `src/integrations/supabase/client.ts` e `src/integrations/supabase/types.ts` (tipos gerados — NÃO editar manualmente se forem gerados automaticamente).
  - Serverless (Deno) functions: `supabase/functions/*` — exemplos: `file-ingest`, `processar-documento`, `analisar-pasta`.

- Arquitetura / fluxo de dados (alto nível):
  1. Usuário envia arquivo no frontend → registro em `doc_queue` (tabela no Supabase).
  2. Frontend invoca funções (ex.: `file-ingest`) ou backend asíncrono que marca o item como `processando` e dispara processamento em background.
  3. `file-ingest` chama a função `processar-documento` (via `supabase.functions.invoke`) que usa OpenAI para extrair entidades e retorna JSON com `dados_extraidos`.
  4. Resultado é persistido em `doc_queue` (campo `dados_extraidos`) e, quando aplicável, em outras tabelas (`doc`, `doc_file`, `entity`, etc.).

- Integrações e variáveis de ambiente críticas:
  - Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (usado nas functions Deno para operações administrativas).
  - OpenAI: `OPENAI_API_KEY` (usado por `processar-documento`).
  - Atenção: `src/integrations/supabase/client.ts` contém a URL do projeto e a publishable key (não modifique sem entender implicações).

- Padrões e convenções do projeto:
  - Tipos do banco são gerados em `src/integrations/supabase/types.ts`; se mudar o schema no Supabase, regenere os tipos.
  - Serverless functions retornam sempre JSON com formato `{ success: boolean, ... }` e usam CORS headers padronizados.
  - AI prompts e regras estritas ficam em `supabase/functions/processar-documento/index.ts`: são conservadores ("NUNCA invente") — qualquer alteração deve manter essa restrição.
  - Perfil do usuário: campo `avatar_url` em `profiles` (antes `foto_url`) — ver `src/contexts/AuthContext.tsx`.

- Exemplos concretos para agentes:
  - Atualizar perfil com avatar do provider (Google): ver bloco em `src/contexts/AuthContext.tsx` que lê `session.user.user_metadata?.avatar_url` e atualiza `profiles.avatar_url` via Supabase.
  - Invocar função serverless do frontend: `supabase.functions.invoke("processar-documento", { body: payload })` (ex.: `supabase/functions/file-ingest/index.ts`).

- Workflows de desenvolvimento importantes:
  - Antes de alterar tipos do DB, verificar se `src/integrations/supabase/types.ts` é gerado por uma ferramenta e atualizar/regenerar. Não editar manualmente sem sincronizar com a fonte.
  - Para mudanças que afetam env vars (OPENAI, SERVICE ROLE KEY), documentar quais secrets precisam ser configurados no ambiente (Codespaces / Supabase / deploy).

- Erros / armadilhas recorrentes detectáveis no repositório:
  - Funções Deno esperam variáveis de ambiente — falhas sem mensagens claras podem vir de `OPENAI_API_KEY` faltando.
  - Muitos arquivos apresentam regras de lint/TypeScript (usa `@types/react` e `typescript`); rodar `npm ci` antes de compilar.
  - Mensagens de AI e prompts são sensíveis: não modifique o sistema prompt sem revisar testes de extração.

