import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLastFolder } from "@/contexts/LastFolderContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText, Loader2, Plus, Pencil } from "lucide-react";
import { DocumentReview } from "@/components/documentos/DocumentReview";
import { FilaImportacao } from "@/components/documentos/FilaImportacao";
import { processPdfDocument, processImageDocument } from "@/utils/pdfProcessor";
import { compareTwoStrings } from "string-similarity";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AnalysisResult {
  descricao: string;
  data_referencia: string;
  entidades: Array<{
    tipo: string;
    identificador_1: string;
    identificador_2?: string;
    nome: string;
    status?: "novo" | "existente" | "conflito";
    entidade_registro_id?: string;
    entidade_nome?: string;
    nome_ident_1?: string | null;
    nome_ident_2?: string | null;
    conflitos?: Array<{
      id: string;
      identificador_1: string;
      identificador_2?: string;
      nome: string;
      motivo: "identificador" | "nome" | "ambos";
      nomeMatch?: boolean;
      id1Match?: boolean;
      id2Match?: boolean;
    }>;
    resolucaoConflito?: "manter" | "atualizar";
    foiEditada?: boolean;
  }>;
}

// ============= FUNÇÕES UTILITÁRIAS DE NORMALIZAÇÃO =============
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeAddress = (text: string) => {
  let s = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\b\d{5}-?\d{3}\b/g, "");
  s = s.replace(/\s*,\s*/g, ", ");
  s = s.replace(/[^\w\s,.-]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
};

const compactComplement = (comp: string) => {
  return comp.replace(/[\s\-\.]/g, "").toLowerCase();
};

const parseImovelAddress = (address: string) => {
  const normalized = normalizeAddress(address);

  const partes = normalized.split(",");
  let enderecoBase = (partes[0] || "").trim();
  if (partes[1] && /^\d{1,6}\b/.test(partes[1].trim())) {
    enderecoBase = `${enderecoBase} ${partes[1].trim()}`;
  }

  // Extrair bairro (segunda parte, ignorando cidade/estado/CEP)
  let bairro = "";
  if (partes.length > 1) {
    const segundaParte = (partes[1] || "").trim();
    // Se não for número puro e não contém "Rio de Janeiro" ou "RJ"
    if (
      segundaParte &&
      !/^\d{1,6}$/.test(segundaParte) &&
      !/^\d{5}-?\d{3}$/.test(segundaParte) &&
      !/rio de janeiro|rj$/i.test(segundaParte)
    ) {
      bairro = normalizeText(segundaParte);
    }
  }

  const numeroMatch = enderecoBase.match(/\b(\d{1,6})\b/);
  const numero = numeroMatch ? numeroMatch[1] : "";

  const complementoMatch = enderecoBase.match(
    /(?:\b(?:ap|apt|apto|apartamento|bloco|bl|sala|conj|cj|unidade|casa|kit)\b\.?)\s*([a-z0-9]+(?:[-\s][a-z0-9]+)?)/i,
  );
  const complemento = complementoMatch ? complementoMatch[1].trim() : "";

  let logradouro = enderecoBase;
  if (numeroMatch) {
    const idx = enderecoBase.indexOf(numeroMatch[1]);
    if (idx > 0) logradouro = enderecoBase.substring(0, idx).trim();
  } else {
    logradouro = enderecoBase
      .split(/\b(?:ap|apt|apto|apartamento|bloco|bl|sala|conj|cj|unidade|casa|kit)\b/i)[0]
      .trim();
  }
  const logradouroNorm = normalizeText(logradouro);

  return { logradouro: logradouroNorm, numero, complemento, bairro };
};

const matchOrNull = (val1: string | null | undefined, val2: string | null | undefined): boolean | null => {
  const a = (val1 ?? "").trim();
  const b = (val2 ?? "").trim();

  // Se AMBOS são vazios = NEUTRO (não conta para conflito)
  if (!a && !b) return null;

  // Se apenas UM é vazio = NO MATCH
  if (!a || !b) return false;

  // Ambos têm valor: compara normalizados
  const norm = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return norm(a) === norm(b);
};

const matchImovelIdentifier = (val1: string | null | undefined, val2: string | null | undefined): boolean => {
  const isNull1 = !val1 || val1.trim() === "";
  const isNull2 = !val2 || val2.trim() === "";

  // Se ambos são nulos, retornar false (diferentes)
  if (isNull1 && isNull2) return false;

  // Se apenas um é nulo, retornar false (diferentes)
  if (isNull1 || isNull2) return false;

  // Se ambos estão preenchidos, devem ser exatamente iguais
  const clean1 = val1.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  const clean2 = val2.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return clean1 === clean2;
};

// ============= FUNÇÃO CENTRALIZADA DE DECISÃO DE STATUS =============
interface MatchResult {
  matchNome: boolean;
  matchId1: boolean | null;
  matchId2: boolean | null;
}

const determineEntityStatus = (
  entidade: any,
  registro: any,
  entidadeData: any,
): { status: "existente" | "conflito" | null; matchData: MatchResult } => {
  let matchNome = false;
  let matchId1: boolean | null = false;
  let matchId2: boolean | null = false;

  // A) Calcular matches de acordo com o tipo
  if (entidade.tipo === "imovel") {
    // Lógica específica de imóveis
    const enderecoNovo = parseImovelAddress(entidade.nome);
    const enderecoExistente = parseImovelAddress(registro.nome);
    const logradouroSim = compareTwoStrings(enderecoNovo.logradouro, enderecoExistente.logradouro);
    const logradouroMatch = logradouroSim >= 0.88;
    const numeroMatch =
      enderecoNovo.numero !== "" && enderecoExistente.numero !== "" && enderecoNovo.numero === enderecoExistente.numero;
    const compNovo = compactComplement(enderecoNovo.complemento);
    const compExist = compactComplement(enderecoExistente.complemento);
    const hasCompNovo = compNovo.length > 0;
    const hasCompExist = compExist.length > 0;
    const compSim = hasCompNovo && hasCompExist ? compareTwoStrings(compNovo, compExist) : 0;
    const complementoMatch = hasCompNovo && hasCompExist ? compSim >= 0.9 : !hasCompNovo && !hasCompExist;

    matchNome = logradouroMatch && numeroMatch && complementoMatch;

    // Para imóveis: matrícula (id1) é do prédio, então unicidade = matrícula + complemento
    const hasMatriculaNovo = entidade.identificador_1?.trim();
    const hasMatriculaExist = registro.identificador_1?.trim();
    if (hasMatriculaNovo && hasMatriculaExist) {
      const matriculaMatch = matchImovelIdentifier(registro.identificador_1, entidade.identificador_1);
      matchId1 = matriculaMatch && complementoMatch;
    } else {
      matchId1 = false;
    }
    matchId2 = matchImovelIdentifier(registro.identificador_2, entidade.identificador_2);
  } else {
    // Lógica para pessoas/organizações
    const SIMILARITY_THRESHOLD = 0.85;
    const nomeNormalizado = normalizeText(entidade.nome);
    const similaridadeNome = compareTwoStrings(normalizeText(registro.nome), nomeNormalizado);
    matchNome = similaridadeNome >= SIMILARITY_THRESHOLD;
    matchId1 = matchOrNull(registro.identificador_1, entidade.identificador_1);
    matchId2 = matchOrNull(registro.identificador_2, entidade.identificador_2);
  }

  // B) REGRAS DE DECISÃO CENTRALIZADAS

  // EXISTENTE: nome bate E todos os IDs PREENCHIDOS batem (null = neutro, aceito)
  if (matchNome && (matchId1 === true || matchId1 === null) && (matchId2 === true || matchId2 === null)) {
    return {
      status: "existente",
      matchData: { matchNome, matchId1, matchId2 },
    };
  }

  // CONFLITO:
  // - Caso 1: Nome bate MAS algum ID PREENCHIDO não bate (null = neutro, ignorado)
  // - Caso 2: Nome NÃO bate MAS algum ID PREENCHIDO bate (null = neutro, ignorado)
  const temConflito =
    (matchNome && (matchId1 === false || matchId2 === false)) ||
    (!matchNome && (matchId1 === true || matchId2 === true));

  if (temConflito) {
    return {
      status: "conflito",
      matchData: { matchNome, matchId1, matchId2 },
    };
  }

  // Se chegou aqui: não é existente nem conflito (é novo)
  return {
    status: null,
    matchData: { matchNome, matchId1, matchId2 },
  };
};
// ============= FIM DAS FUNÇÕES UTILITÁRIAS =============

// Função para sanitizar texto extraído (remove null bytes e caracteres de controle)
const sanitizeText = (text: string): string => {
  if (!text) return "";

  return (
    text
      // Remove null bytes
      .replace(/\u0000/g, "")
      // Remove outros caracteres de controle problemáticos
      // Mantém apenas: tabs (\t), line feeds (\n), carriage returns (\r)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Remove espaços múltiplos
      .replace(/\s+/g, " ")
      .trim()
  );
};

const Upload = () => {
  const { user } = useAuth();
  const { lastFolder, setLastFolder } = useLastFolder();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentFile, setCurrentFile] = useState<{ name: string; path: string } | null>(null);
  const [pastas, setPastas] = useState<Array<{ id: string; descricao: string }>>([]);
  const [selectedPasta, setSelectedPasta] = useState<string | null>(null);
  const [pastaLoaded, setPastaLoaded] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingDuplicateData, setPendingDuplicateData] = useState<{
    hash: string;
    existingDoc: any;
    fileData: Blob;
  } | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [shouldContinueProcessing, setShouldContinueProcessing] = useState(false);
  const [reprocessInfo, setReprocessInfo] = useState<{
    doc_id: string;
    doc_file_id: string;
    original_storage_path: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [novaPastaDialogOpen, setNovaPastaDialogOpen] = useState(false);
  const [editPastaDialogOpen, setEditPastaDialogOpen] = useState(false);
  const [novaPastaDescricao, setNovaPastaDescricao] = useState("");
  const [editPastaDescricao, setEditPastaDescricao] = useState("");
  const [reviewingQueueItem, setReviewingQueueItem] = useState<any>(null);

  // File validation schema
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const fileSchema = z.object({
    type: z.string().refine((type) => ALLOWED_TYPES.includes(type), {
      message: "Tipo de arquivo não suportado. Use PDF, JPEG ou PNG.",
    }),
    size: z.number().max(MAX_FILE_SIZE, {
      message: "Arquivo muito grande. Tamanho máximo: 10MB.",
    }),
  });

  useEffect(() => {
    document.title = "Importação de Documentos | DocTree";
    const desc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    desc.setAttribute("name", "description");
    desc.setAttribute("content", "Importe e analise documentos automaticamente com IA no DocTree.");
    if (!desc.parentNode) document.head.appendChild(desc);

    loadPastas();
    setPastaLoaded(true);
  }, []);

  // Carregar last_folder do contexto e definir como default
  useEffect(() => {
    if (lastFolder && pastas.length > 0 && !selectedPasta) {
      const pastaExiste = pastas.some((p) => p.id === lastFolder);
      if (pastaExiste) {
        setSelectedPasta(lastFolder);
      }
    }
  }, [lastFolder, pastas.length, selectedPasta]);

  // Bloqueio de navegação durante upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = "⏳ Processamento em andamento. Tem certeza que deseja sair?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploading]);

  const loadPastas = async () => {
    const { data, error } = await supabase
      .from("folder")
      .select("id, descricao")
      .order("descricao", { ascending: true });

    if (error) {
      console.error("Error loading pastas:", error);
      return;
    }

    setPastas(data || []);
  };

  const handlePastaChange = (pastaId: string) => {
    setSelectedPasta(pastaId);
    setLastFolder(pastaId);
  };

  const handleNovaPasta = async () => {
    if (!novaPastaDescricao.trim() || !user) return;

    // Validação: verificar se já existe pasta com mesma descrição
    const descricaoExistente = pastas.some(
      (p) => p.descricao.toLowerCase().trim() === novaPastaDescricao.toLowerCase().trim(),
    );

    if (descricaoExistente) {
      toast({
        title: "Erro",
        description: "Já existe uma pasta com essa descrição.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("folder")
        .insert({ descricao: novaPastaDescricao.trim(), usuario_criador_id: user.id })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Pasta criada",
        description: "A nova pasta foi criada com sucesso.",
      });

      setSelectedPasta(data.id);
      setNovaPastaDescricao("");
      setNovaPastaDialogOpen(false);
      loadPastas();
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a pasta.",
        variant: "destructive",
      });
    }
  };

  const handleEditarPasta = async () => {
    if (!editPastaDescricao.trim() || !selectedPasta) return;

    try {
      const { error } = await supabase
        .from("folder")
        .update({ descricao: editPastaDescricao.trim() })
        .eq("id", selectedPasta);

      if (error) throw error;

      toast({
        title: "Pasta atualizada",
        description: "A pasta foi atualizada com sucesso.",
      });

      setEditPastaDescricao("");
      setEditPastaDialogOpen(false);
      loadPastas();
    } catch (error) {
      console.error("Erro ao atualizar pasta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a pasta.",
        variant: "destructive",
      });
    }
  };

  const handleEditarClick = () => {
    const pasta = pastas.find((p) => p.id === selectedPasta);
    if (pasta) {
      setEditPastaDescricao(pasta.descricao);
      setEditPastaDialogOpen(true);
    }
  };
  // Função para calcular hash SHA-256 de um arquivo
  const calculateFileHash = async (fileBlob: Blob): Promise<string> => {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // Helper function to ensure phase visibility
  const setPhaseWithDelay = async (phase: string, minDelay: number = 300) => {
    flushSync(() => {
      setCurrentPhase(phase);
    });
    await new Promise((resolve) => setTimeout(resolve, minDelay));
  };

  // ============= FUNÇÃO CENTRALIZADA DE PROCESSAMENTO =============
  interface DocumentProcessingContext {
    mode: "new" | "duplicate";
    file: File;
    hash: string;
    folderId: string;
    existingDocFile?: { id: string; storage_path: string };
  }

  const processDocumentFile = async (context: DocumentProcessingContext): Promise<void> => {
    const { mode, file, hash, folderId, existingDocFile } = context;

    // 1. Extração de texto (IGUAL para new e duplicate)
    await setPhaseWithDelay(`Extraindo texto de ${file.name}...`);
    let extractedText = "";
    try {
      if (file.type === "application/pdf") {
        const processed = await processPdfDocument(file, (msg) => setCurrentPhase(msg));
        extractedText = sanitizeText(processed.combinedText);
      } else if (file.type.startsWith("image/")) {
        const processed = await processImageDocument(file);
        extractedText = sanitizeText(processed.combinedText);
      }
    } catch (extractError) {
      throw new Error(`Não foi possível extrair texto de ${file.name}`);
    }

    // 2. Validação de texto mínimo (IGUAL para new e duplicate)
    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error(`${file.name}: Documento não contém texto suficiente para análise`);
    }

    // 3. Data do arquivo (CORRIGIDA uma única vez, usando timezone local)
    const fileDate = new Date(file.lastModified).toLocaleDateString("en-CA"); // YYYY-MM-DD local

    // 4. Upload ao storage (APENAS se mode === 'new')
    let storagePath: string;
    if (mode === "new") {
      await setPhaseWithDelay(`Enviando ${file.name}...`);
      const fileExt = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, file);

      if (uploadError) {
        throw new Error(`${file.name}: ${uploadError.message}`);
      }

      storagePath = filePath;
      setCurrentFile({ name: file.name, path: filePath });
    } else {
      // Modo duplicate: reutilizar storage_path existente
      storagePath = existingDocFile!.storage_path;
    }

    // 5. Adicionar à fila
    await addToQueue(
      file.name,
      storagePath,
      hash,
      extractedText,
      mode === "duplicate", // isDuplicate
      mode === "duplicate" ? existingDocFile!.id : null, // docFileIdOriginal
      fileDate,
      folderId,
    );
  };

  const addToQueue = async (
    fileName: string,
    storagePath: string,
    hash: string,
    extractedText: string,
    isDuplicate: boolean = false,
    docFileIdOriginal: string | null = null,
    fileDate: string,
    pastaId: string,
  ) => {
    if (!user) return;

    const { error } = await supabase.from("doc_queue").insert({
      usuario_criador_id: user.id,
      pasta_id: pastaId,
      nome_arquivo: fileName,
      storage_path: storagePath,
      hash,
      extracted_text: extractedText,
      status: isDuplicate ? "duplicata_aguardando" : "aguardando",
      is_duplicate: isDuplicate,
      doc_file_id_original: docFileIdOriginal,
      file_date: fileDate,
    });

    if (error) throw error;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !user) return;

    if (!selectedPasta) {
      toast({
        title: "Erro",
        description: "Selecione uma pasta primeiro",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Verificar limite atual de 10 documentos na fila
    const { count: existingCount } = await supabase
      .from("doc_queue")
      .select("*", { count: "exact", head: true })
      .eq("usuario_criador_id", user.id)
      .in("status", ["aguardando", "processando"]);

    let remaining = Math.max(0, 5 - (existingCount || 0));
    if (remaining <= 0) {
      toast({
        title: "Limite excedido",
        description: "Você pode ter no máximo 5 documentos na fila",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setAnalysisResult(null);
    setCurrentFile(null);
    setFileHash(null);
    setShouldContinueProcessing(false);

    let added = 0;

    try {
      for (const file of files) {
        if (remaining <= 0) {
          toast({
            title: "Limite excedido",
            description: "Alguns arquivos não foram adicionados por exceder o limite da fila",
            variant: "destructive",
          });
          break;
        }

        // Validar arquivo individualmente
        const validation = fileSchema.safeParse({ type: file.type, size: file.size });
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast({
            title: "Erro de validação",
            description: `${file.name}: ${firstError.message}`,
            variant: "destructive",
          });
          continue;
        }

        // PASSO 1: Calcular hash ANTES de qualquer upload
        await setPhaseWithDelay(`Calculando hash de ${file.name}...`);
        const calculatedHash = await calculateFileHash(file);
        setFileHash(calculatedHash);

        // PASSO 2: Verificar duplicidade ANTES do upload
        await setPhaseWithDelay("Verificando duplicatas...");
        const { data: existingDocFile, error: checkError } = await supabase
          .from("doc_file")
          .select("id, nome_arquivo, doc_id, storage_path")
          .eq("hash", calculatedHash)
          .maybeSingle();

        if (checkError) {
          toast({
            title: "Erro",
            description: `${file.name}: ${checkError.message}`,
            variant: "destructive",
          });
          continue;
        }

        if (existingDocFile) {
          // DUPLICATA DETECTADA: processar como duplicata
          console.log(`[DUPLICATA] ${file.name} já existe, adicionando à fila como duplicata`);

          // Buscar o documento original para pegar a pasta correta
          const { data: originalDoc, error: docError } = await supabase
            .from("doc_file")
            .select("doc_id, doc(folder_id)")
            .eq("id", existingDocFile.id)
            .maybeSingle();

          if (docError) {
            toast({
              title: "Erro",
              description: `${file.name}: Erro ao buscar documento original`,
              variant: "destructive",
            });
            continue;
          }

          const originalFolderId = (originalDoc?.doc as any)?.folder_id || selectedPasta;

          try {
            await processDocumentFile({
              mode: "duplicate",
              file,
              hash: calculatedHash,
              folderId: originalFolderId,
              existingDocFile: {
                id: existingDocFile.id,
                storage_path: existingDocFile.storage_path,
              },
            });

            added += 1;
            remaining -= 1;
          } catch (error) {
            toast({
              title: "Erro",
              description: error instanceof Error ? error.message : "Erro ao processar duplicata",
              variant: "destructive",
            });
          }
          continue; // Próximo arquivo
        }

        // ARQUIVO NOVO: processar normalmente
        try {
          await processDocumentFile({
            mode: "new",
            file,
            hash: calculatedHash,
            folderId: selectedPasta,
          });

          added += 1;
          remaining -= 1;
        } catch (error) {
          toast({
            title: "Erro",
            description: error instanceof Error ? error.message : "Erro ao processar arquivo",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao processar documentos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setCurrentPhase("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const enrichEntitiesForReview = async (rawResult: any) => {
    const entityTypeMap: Record<string, string> = {
      pessoa: "Pessoa",
      organizacao: "Organização",
      imovel: "Imóvel",
    };

    // Enriquecer cada entidade com status de unicidade
    const enrichedEntidades = await Promise.all(
      rawResult.entidades.map(async (ent: any, idx: number) => {
        const tipoNome = entityTypeMap[ent.tipo] || ent.tipo;
        const enriched = await recheckEntityUniqueness(ent, tipoNome, false);

        // Garantir tempId estável
        if (!enriched.tempId) {
          enriched.tempId = `${idx}-${Date.now()}`;
        }

        return enriched;
      }),
    );

    return {
      ...rawResult,
      entidades: enrichedEntidades,
    };
  };

  const recheckEntityUniqueness = async (
    entidade: any,
    entidadeNome: string,
    forceNoConflict = false,
  ): Promise<any> => {
    const isImovel = entidade.tipo === "imovel";

    const idForStorage = isImovel ? entidade.identificador_1 || "" : entidade.identificador_1 || entidade.nome;

    const idForSimilarity = isImovel
      ? entidade.identificador_1 || entidade.identificador_2 || ""
      : entidade.identificador_1 || entidade.nome;

    try {
      const { data: entidadeData } = await supabase
        .from("entity_type")
        .select("id, nome_ident_1, nome_ident_2")
        .eq("nome", entidadeNome)
        .maybeSingle();

      if (!entidadeData) {
        return {
          ...entidade,
          identificador_1: idForStorage,
          status: "novo" as const,
          entidade_nome: entidadeNome,
          nome_ident_1: null,
          nome_ident_2: null,
        };
      }

      const { data: todosRegistros } = await supabase
        .from("entity")
        .select("id, identificador_1, identificador_2, nome")
        .eq("entity_type_id", entidadeData.id);

      if (!todosRegistros || todosRegistros.length === 0) {
        return {
          ...entidade,
          identificador_1: idForStorage,
          status: "novo" as const,
          entidade_nome: entidadeNome,
          nome_ident_1: entidadeData.nome_ident_1,
          nome_ident_2: entidadeData.nome_ident_2,
        };
      }

      const nomeNormalizado = normalizeText(entidade.nome);
      const SIMILARITY_THRESHOLD = 0.85;

      let melhorCandidato: {
        registro: any;
        nomeMatch: boolean;
        id1Match: boolean;
        id2Match: boolean;
      } | null = null;

      for (const registro of todosRegistros) {
        // Usa a função centralizada para determinar status
        const resultado = determineEntityStatus(entidade, registro, entidadeData);

        if (resultado.status === "existente") {
          // Quando é existente, usar os dados do registro que já está gravado
          return {
            ...entidade,
            nome: registro.nome, // Usar nome do registro existente
            identificador_1: registro.identificador_1, // Usar ID1 do registro existente
            identificador_2: registro.identificador_2, // Usar ID2 do registro existente
            status: "existente" as const,
            entidade_registro_id: registro.id,
            entidade_nome: entidadeNome,
            nome_ident_1: entidadeData.nome_ident_1,
            nome_ident_2: entidadeData.nome_ident_2,
          };
        }

        if (resultado.status === "conflito" && !melhorCandidato) {
          melhorCandidato = {
            registro,
            nomeMatch: resultado.matchData.matchNome,
            id1Match: resultado.matchData.matchId1,
            id2Match: resultado.matchData.matchId2,
          };
        }
      }

      // Se forceNoConflict = true (resolução manual), não retorna conflito, só novo
      if (melhorCandidato && !forceNoConflict) {
        return {
          ...entidade,
          identificador_1: idForStorage,
          status: "conflito" as const,
          entidade_nome: entidadeNome,
          nome_ident_1: entidadeData.nome_ident_1,
          nome_ident_2: entidadeData.nome_ident_2,
          conflitos: [
            {
              id: melhorCandidato.registro.id,
              identificador_1: melhorCandidato.registro.identificador_1,
              identificador_2: melhorCandidato.registro.identificador_2,
              nome: melhorCandidato.registro.nome,
              motivo: "conflito" as any,
              nomeMatch: melhorCandidato.nomeMatch,
              id1Match: melhorCandidato.id1Match,
              id2Match: melhorCandidato.id2Match,
            },
          ],
          resolucaoConflito: "manter" as const,
        };
      }

      return {
        ...entidade,
        identificador_1: idForStorage,
        status: "novo" as const,
        entidade_nome: entidadeNome,
        nome_ident_1: entidadeData.nome_ident_1,
        nome_ident_2: entidadeData.nome_ident_2,
      };
    } catch (error) {
      console.error("Error checking entity uniqueness:", error);
      return {
        ...entidade,
        identificador_1: idForStorage,
        status: "novo" as const,
        entidade_nome: entidadeNome,
        nome_ident_1: null,
        nome_ident_2: null,
      };
    }
  };

  const handleEntidadeEdit = async (
    id: string,
    data: { nome: string; identificador_1: string; identificador_2?: string },
    skipUnicityCheck = false,
    forceNoConflict = false,
  ) => {
    // Se forceNoConflict = true, força status 'existente' e remove conflitos
    if (forceNoConflict) {
      setAnalysisResult((prev) => {
        if (!prev) return prev;
        const updated = [...prev.entidades];
        const idx = updated.findIndex((e: any) => e.tempId === id);
        if (idx === -1) return prev;

        const entidade = updated[idx];
        const conflitos = entidade.conflitos || [];
        const primeiroConflito = conflitos[0];

        updated[idx] = {
          ...entidade,
          ...data,
          status: "existente" as const,
          conflitos: undefined,
          entidade_registro_id: primeiroConflito?.id || entidade.entidade_registro_id,
          foiEditada: true,
        };
        return { ...prev, entidades: updated };
      });
      return;
    }

    setAnalysisResult((prev) => {
      if (!prev) return prev;
      const updated = [...prev.entidades];
      const idx = updated.findIndex((e: any) => e.tempId === id);
      if (idx === -1) return prev;
      updated[idx] = { ...updated[idx], ...data, foiEditada: true };
      return { ...prev, entidades: updated };
    });

    // Recalcular unicidade da entidade editada apenas se não for para pular
    if (!skipUnicityCheck && analysisResult) {
      const idx = analysisResult.entidades.findIndex((e: any) => e.tempId === id);
      if (idx === -1) return;
      const entidade = { ...analysisResult.entidades[idx], ...data };
      const tipoMap: Record<string, string> = {
        pessoa: "Pessoa",
        organizacao: "Organização",
        imovel: "Imóvel",
      };
      const entidadeNome = tipoMap[entidade.tipo] || entidade.tipo;
      const updatedEntity = await recheckEntityUniqueness(entidade, entidadeNome, false);
      setAnalysisResult((prev) => {
        if (!prev) return prev;
        const updated = [...prev.entidades];
        const idx2 = updated.findIndex((e: any) => e.tempId === id);
        if (idx2 === -1) return prev;
        // Preservar os dados editados pelo usuário, atualizando apenas status e dados do registro existente
        const currentTempId = (updated[idx2] as any).tempId;
        updated[idx2] = {
          ...updated[idx2],
          ...data,
          status: updatedEntity.status,
          entidade_registro_id: updatedEntity.entidade_registro_id,
          entidade_nome: updatedEntity.entidade_nome,
          nome_ident_1: updatedEntity.nome_ident_1,
          nome_ident_2: updatedEntity.nome_ident_2,
          conflitos: updatedEntity.conflitos,
          foiEditada: true,
        };
        (updated[idx2] as any).tempId = currentTempId;
        return { ...prev, entidades: updated };
      });
    }
  };

  const handleEntidadeDelete = (id: string) => {
    setAnalysisResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entidades: prev.entidades.filter((e: any) => e.tempId !== id),
      };
    });
  };

  const handleConflictResolutionChange = (id: string, resolution: "manter" | "atualizar") => {
    setAnalysisResult((prev) => {
      if (!prev) return prev;
      const updated = [...prev.entidades];
      const idx = updated.findIndex((e: any) => e.tempId === id);
      if (idx === -1) return prev;
      updated[idx] = { ...updated[idx], resolucaoConflito: resolution };
      return { ...prev, entidades: updated };
    });
  };

  // ============= FUNÇÕES EXTRAÍDAS PARA SALVAR DOCUMENTOS =============

  const saveOrUpdateDocument = async (isReprocess: boolean, docId?: string): Promise<any> => {
    if (isReprocess) {
      // CRÍTICO: Se está reprocessando, DEVE ter docId
      if (!docId) {
        throw new Error("ERRO CRÍTICO: Tentativa de reprocessamento sem doc_id existente");
      }

      // REPROCESSAMENTO: NÃO atualizar folder_id (preservar pasta original)
      const docDataUpdate = {
        descricao: analysisResult!.descricao,
        data_referencia: analysisResult!.data_referencia,
        aprovado: true,
        // folder_id NÃO incluído - mantém o valor original
      };

      const { data, error } = await supabase.from("doc").update(docDataUpdate).eq("id", docId).select().single();

      if (error) throw error;
      return data;
    } else {
      // CRIAR novo documento COM folder_id
      const docData = {
        descricao: analysisResult!.descricao,
        data_referencia: analysisResult!.data_referencia,
        folder_id: selectedPasta!,
        aprovado: true,
        usuario_criador_id: user!.id,
      };

      const { data, error } = await supabase.from("doc").insert(docData).select().single();

      if (error) throw error;
      return data;
    }
  };

  const saveOrUpdateDocFile = async (
    docId: string,
    fileData: Blob,
    isReprocess: boolean,
    docFileId?: string,
  ): Promise<void> => {
    const fileMetadata = {
      nome_arquivo: currentFile!.name,
      storage_path: currentFile!.path,
      hash: fileHash!,
      tamanho_bytes: fileData.size,
      tipo_mime: fileData.type || "application/pdf",
      metadados: {
        descricao: analysisResult!.descricao,
        data_analise: new Date().toISOString(),
      },
    };

    if (isReprocess && docFileId) {
      // REPROCESSAMENTO/DUPLICATA: atualizar o doc_file existente para apontar para o novo doc
      const { error } = await supabase
        .from("doc_file")
        .update({
          ...fileMetadata,
          doc_id: docId,
        })
        .eq("id", docFileId);

      if (error) throw error;
    } else {
      // NOVO DOCUMENTO (sem duplicata detectada): criar novo registro doc_file
      const { error: insertError } = await supabase.from("doc_file").insert({
        ...fileMetadata,
        doc_id: docId,
      });

      if (insertError) {
        // FALLBACK: se falhar por hash duplicado, buscar o doc_file existente e atualizar
        if (insertError.code === "23505") {
          // Unique constraint violation
          const { data: existingDocFile } = await supabase
            .from("doc_file")
            .select("id")
            .eq("hash", fileHash!)
            .maybeSingle();

          if (existingDocFile) {
            // Atualizar o doc_file existente com o novo doc_id
            const { error: updateError } = await supabase
              .from("doc_file")
              .update({
                ...fileMetadata,
                doc_id: docId,
              })
              .eq("id", existingDocFile.id);

            if (updateError) throw updateError;
          } else {
            // Não encontrou o doc_file, propagar o erro original
            throw insertError;
          }
        } else {
          // Outro tipo de erro, propagar
          throw insertError;
        }
      }
    }

    // NUNCA deletar arquivo do storage (pode ser compartilhado por hash)
  };

  const saveEntityReferences = async (docId: string, isReprocess: boolean): Promise<void> => {
    // Se for reprocessamento, deletar referências antigas ANTES
    if (isReprocess) {
      const { error: deleteError } = await supabase.from("doc_entity").delete().eq("doc_id", docId);

      if (deleteError) throw deleteError;
    }

    // Criar NOVAS referências
    for (let idx = 0; idx < analysisResult!.entidades.length; idx++) {
      const entidade = analysisResult!.entidades[idx];
      let entidadeRegistroId = entidade.entidade_registro_id;

      // Processar baseado no status e ação
      if (
        entidade.status === "novo" ||
        entidade.status === "conflito" ||
        (entidade.status === "existente" && entidade.foiEditada)
      ) {
        // Buscar entidade pelo nome
        const { data: entidadeData } = await supabase
          .from("entity_type")
          .select("id")
          .eq("nome", entidade.entidade_nome)
          .maybeSingle();

        if (entidadeData) {
          // Se é existente editada, atualizar
          if (entidade.status === "existente" && entidade.foiEditada && entidade.entidade_registro_id) {
            const updateData: any = {
              nome: entidade.nome,
              identificador_1: entidade.identificador_1,
            };

            if (entidade.identificador_2 !== undefined) {
              updateData.identificador_2 = entidade.identificador_2;
            }

            const { error: updateError } = await supabase
              .from("entity")
              .update(updateData)
              .eq("id", entidade.entidade_registro_id);

            if (updateError) {
              console.error("Error updating entity registro:", updateError);
              toast({
                title: "Aviso",
                description: `Erro ao atualizar entidade ${entidade.nome}: ${updateError.message}`,
                variant: "destructive",
              });
              continue;
            }
            entidadeRegistroId = entidade.entidade_registro_id;
          }
          // Se tem conflito, verificar resolução escolhida pelo usuário
          else if (entidade.status === "conflito" && entidade.conflitos && entidade.conflitos.length > 0) {
            const conflito = entidade.conflitos[0];

            if (entidade.resolucaoConflito === "atualizar") {
              // Atualizar o primeiro registro conflitante
              const updateData: any = {
                nome: entidade.nome,
                identificador_1: entidade.identificador_1,
              };

              if (entidade.identificador_2 !== undefined) {
                updateData.identificador_2 = entidade.identificador_2;
              }

              const { data: updateResult, error: updateError } = await supabase
                .from("entity")
                .update(updateData)
                .eq("id", conflito.id)
                .select();

              if (updateError) {
                console.error("Error updating entity registro:", updateError);
                toast({
                  title: "Aviso",
                  description: `Erro ao alterar entidade ${entidade.nome}: ${updateError.message}`,
                  variant: "destructive",
                });
                continue;
              }
              entidadeRegistroId = conflito.id;
            } else {
              // Manter o registro existente
              entidadeRegistroId = conflito.id;
            }
          } else if (entidade.status === "novo") {
            // Incluir novo registro
            // Para imóveis sem matrícula, gerar chave técnica baseada no endereço
            let identificador1Final = entidade.identificador_1;
            if (entidade.tipo === "imovel" && (!identificador1Final || identificador1Final.trim() === "")) {
              // Gerar chave de endereço normalizada
              const enderecoNormalizado = entidade.nome
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^\w\s]/g, "")
                .replace(/\s+/g, "-");
              identificador1Final = `ADDR-${enderecoNormalizado.substring(0, 50)}`;
            }

            const insertData: any = {
              entity_type_id: entidadeData.id,
              identificador_1: identificador1Final,
              nome: entidade.nome,
              usuario_criador_id: user!.id,
            };

            if (entidade.identificador_2) {
              insertData.identificador_2 = entidade.identificador_2;
            }

            const { data: novoRegistro, error: registroError } = await supabase
              .from("entity")
              .insert(insertData)
              .select()
              .single();

            if (registroError) {
              console.error("Error creating entity registro:", registroError);
              toast({
                title: "Aviso",
                description: `Erro ao criar entidade ${entidade.nome}: ${registroError.message}`,
                variant: "destructive",
              });
              continue;
            }
            entidadeRegistroId = novoRegistro.id;
          }
        } else {
          console.warn("Entidade type not found:", entidade.entidade_nome);
        }
      }

      // Link entity to doc
      if (entidadeRegistroId) {
        const { error: linkError } = await supabase.from("doc_entity").insert({
          doc_id: docId,
          entity_id: entidadeRegistroId,
        });

        if (linkError) {
          console.error("Error linking entity to event:", linkError);
          toast({
            title: "Aviso",
            description: `Erro ao vincular entidade ${entidade.nome}: ${linkError.message}`,
            variant: "destructive",
          });
        }
      }
    }
  };

  // ============= FIM DAS FUNÇÕES EXTRAÍDAS =============

  const handleApprove = async () => {
    if (!analysisResult || !currentFile || !user || !selectedPasta || !fileHash) return;
    if (approving) return;

    setApproving(true);
    try {
      console.log("🔄 Iniciando salvamento do documento:", currentFile.name);

      // Download file para pegar metadados
      console.log("📥 Baixando arquivo do storage...");
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documentos")
        .download(currentFile.path);
      if (downloadError) {
        console.error("❌ Erro ao baixar arquivo:", downloadError);
        throw new Error(`Falha ao baixar arquivo: ${downloadError.message}`);
      }
      console.log("✅ Arquivo baixado com sucesso");

      const isReprocess = !!reprocessInfo;
      console.log("📋 ReprocessInfo:", reprocessInfo);
      console.log("📋 Modo:", isReprocess ? "REPROCESSAMENTO" : "NOVO", "| doc_id:", reprocessInfo?.doc_id);
      console.log("📝 Modo de salvamento:", isReprocess ? "REPROCESSAMENTO" : "NOVO DOCUMENTO");

      // BARREIRA: Se reprocessando, verificar que pasta não mudou na UI
      if (isReprocess && reprocessInfo?.doc_id) {
        const { data: originalDoc } = await supabase
          .from("doc")
          .select("folder_id")
          .eq("id", reprocessInfo.doc_id)
          .maybeSingle();

        if (originalDoc && originalDoc.folder_id !== selectedPasta) {
          console.warn(
            `⚠️ AVISO: UI mostra pasta ${selectedPasta} mas documento original está em ${originalDoc.folder_id}. ` +
              `Mantendo pasta original.`,
          );
          // Corrigir UI para refletir a pasta real
          setSelectedPasta(originalDoc.folder_id);
        }
      }

      // 1. Salvar/atualizar documento
      console.log("💾 Salvando/atualizando documento na tabela 'doc'...");
      const doc = await saveOrUpdateDocument(isReprocess, reprocessInfo?.doc_id);
      console.log("✅ Documento salvo/atualizado, ID:", doc.id);

      // 2. Salvar/atualizar doc_file
      console.log("📄 Salvando/atualizando doc_file...");
      await saveOrUpdateDocFile(doc.id, fileData, isReprocess, reprocessInfo?.doc_file_id);
      console.log("✅ Doc_file salvo/atualizado");

      // 3. Salvar referências (com delete automático se reprocess)
      console.log("🔗 Salvando referências de entidades...");
      await saveEntityReferences(doc.id, isReprocess);
      console.log("✅ Referências de entidades salvas");

      toast({
        title: "Sucesso",
        description: isReprocess ? "Documento reprocessado e atualizado com sucesso!" : "Documento salvo com sucesso!",
      });

      // Limpar fila e estados
      if (reviewingQueueItem) {
        await supabase.from("doc_queue").delete().eq("id", reviewingQueueItem.id);
      }

      setAnalysisResult(null);
      setCurrentFile(null);
      setReprocessInfo(null);
      setPendingDuplicateData(null);
      setReviewingQueueItem(null);

      await loadPastas();
    } catch (error) {
      console.error("Error saving document:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao salvar documento",
        description: `Detalhes: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!currentFile) return;

    // Delete uploaded file
    await supabase.storage.from("documentos").remove([currentFile.path]);

    // Remover da fila se veio da fila
    if (reviewingQueueItem) {
      await supabase.from("doc_queue").delete().eq("id", reviewingQueueItem.id);
    }

    setAnalysisResult(null);
    setCurrentFile(null);
    setReviewingQueueItem(null);

    // Recarregar pastas (mantendo seleção atual)
    await loadPastas();
  };

  // Função para continuar processamento após confirmação de duplicata
  // NOTA: Esta função está obsoleta pois o fluxo de duplicatas foi integrado
  // diretamente no handleFileUpload. Mantida para compatibilidade com UI legada.
  const handleConfirmReprocess = async () => {
    if (!currentFile || !pendingDuplicateData) return;

    try {
      // Buscar o documento original para pegar a pasta correta
      const { data: originalDoc, error: docError } = await supabase
        .from("doc")
        .select("folder_id")
        .eq("id", pendingDuplicateData.existingDoc.doc_id)
        .maybeSingle();

      if (docError) {
        toast({
          title: "Erro",
          description: "Não foi possível buscar documento original",
          variant: "destructive",
        });
        return;
      }

      const originalFolderId = originalDoc?.folder_id || selectedPasta;

      // Data local corrigida
      const fileDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local

      // Adicionar à fila para reprocessamento COM a pasta original
      await addToQueue(
        currentFile.name,
        currentFile.path,
        pendingDuplicateData.hash,
        "", // extractedText vazio - será extraído pelo worker
        false,
        null,
        fileDate,
        originalFolderId, // Preservar pasta original
      );

      // Armazenar informações de reprocessamento
      setReprocessInfo({
        doc_id: pendingDuplicateData.existingDoc.doc_id,
        doc_file_id: pendingDuplicateData.existingDoc.id,
        original_storage_path: "",
      });

      setDuplicateDialogOpen(false);
      setPendingDuplicateData(null);
      setCurrentFile(null);
    } catch (error) {
      console.error("Erro ao adicionar à fila:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar à fila",
        variant: "destructive",
      });
    }
  };

  const handleCancelReprocess = async () => {
    setDuplicateDialogOpen(false);

    // Delete uploaded file
    if (currentFile) {
      await supabase.storage.from("documentos").remove([currentFile.path]);
    }

    setAnalysisResult(null);
    setCurrentFile(null);
    setSelectedPasta(null);
    setPendingDuplicateData(null);

    toast({
      title: "Cancelado",
      description: "Reprocessamento cancelado. Arquivo removido.",
    });
  };

  const handleLoadFromQueue = async (queueItem: any) => {
    // Enriquecer entidades com verificação de unicidade
    const enriched = await enrichEntitiesForReview(queueItem.dados_extraidos);
    setAnalysisResult(enriched);

    setReviewingQueueItem(queueItem);
    setSelectedPasta(queueItem.pasta_id);
    setCurrentFile({ name: queueItem.nome_arquivo, path: queueItem.storage_path });
    setFileHash(queueItem.hash);

    // Se é duplicata, configurar reprocessingInfo
    if (queueItem.is_duplicate) {
      let docFileIdOriginal = queueItem.doc_file_id_original;

      // FALLBACK: se doc_file_id_original não existe, buscar pelo hash
      if (!docFileIdOriginal) {
        const { data: docFileByHash } = await supabase
          .from("doc_file")
          .select("id, doc_id")
          .eq("hash", queueItem.hash)
          .maybeSingle();

        if (docFileByHash) {
          docFileIdOriginal = docFileByHash.id;
        }
      }

      if (docFileIdOriginal) {
        const { data: originalDocFile, error: docFileError } = await supabase
          .from("doc_file")
          .select("doc_id, id")
          .eq("id", docFileIdOriginal)
          .maybeSingle();

        if (docFileError) {
          console.error("❌ Erro ao buscar doc_file original:", docFileError);
          throw docFileError;
        }

        if (!originalDocFile || !originalDocFile.doc_id) {
          throw new Error("Documento original não encontrado ou sem doc_id associado");
        }

        setReprocessInfo({
          doc_id: originalDocFile.doc_id,
          doc_file_id: originalDocFile.id,
          original_storage_path: "", // Não usado - arquivo é o mesmo
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Documento já processado</AlertDialogTitle>
            <AlertDialogDescription>
              Este arquivo já foi processado anteriormente como "{pendingDuplicateData?.existingDoc?.nome_arquivo}".
              Deseja reprocessar o documento com as novas informações extraídas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReprocess}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReprocess}>Reprocessar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mensagem de aviso durante processamento */}
      {uploading && (
        <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-lg z-50 max-w-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Enviando documentos</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Por favor, não saia desta página</p>
            </div>
          </div>
        </div>
      )}

      <main className="space-y-6">
        {!analysisResult && (
          <>
            {pastaLoaded && (
              <Card className="p-4">
                <Label className="text-2xl font-semibold leading-none tracking-tight">Pasta de Destino</Label>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1">
                    <Select value={selectedPasta || undefined} onValueChange={handlePastaChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma pasta..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {pastas.map((pasta) => (
                          <SelectItem key={pasta.id} value={pasta.id}>
                            {pasta.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNovaPastaDialogOpen(true)}
                    title="Nova pasta"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleEditarClick}
                    disabled={!selectedPasta}
                    title="Editar pasta"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Importação de Documentos</CardTitle>
                <CardDescription>Envie contratos, comprovantes, atas ou outros documentos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploading || analyzing ? (
                        <>
                          <Loader2 className="w-10 h-10 mb-3 text-muted-foreground animate-spin" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            {currentPhase || (uploading ? "Enviando..." : "Analisando com IA...")}
                          </p>
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Clique para enviar</span> ou arraste aqui
                          </p>
                          <p className="text-xs text-muted-foreground">PDF, PNG, JPG (máx. 10MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      disabled={uploading || analyzing}
                      multiple
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Fila de Análise */}
            <FilaImportacao onApprove={handleLoadFromQueue} />
          </>
        )}

        {analysisResult && (
          <>
            {pastaLoaded && (
              <Card className="p-4">
                <Label className="text-2xl font-semibold leading-none tracking-tight">Pasta de Destino</Label>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1">
                    <Select value={selectedPasta || undefined} onValueChange={handlePastaChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma pasta..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {pastas.map((pasta) => (
                          <SelectItem key={pasta.id} value={pasta.id}>
                            {pasta.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNovaPastaDialogOpen(true)}
                    title="Nova pasta"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleEditarClick}
                    disabled={!selectedPasta}
                    title="Editar pasta"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            <DocumentReview
              result={analysisResult}
              fileName={currentFile?.name || ""}
              onEntidadeEdit={handleEntidadeEdit}
              onEntidadeDelete={handleEntidadeDelete}
              onConflictResolutionChange={handleConflictResolutionChange}
              onApprove={handleApprove}
              onReject={handleReject}
              isApproving={approving}
              selectedPasta={selectedPasta}
            />
          </>
        )}
      </main>

      {/* Dialog Nova Pasta */}
      <Dialog open={novaPastaDialogOpen} onOpenChange={setNovaPastaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nova-pasta-descricao-upload">Descrição</Label>
              <Input
                id="nova-pasta-descricao-upload"
                value={novaPastaDescricao}
                onChange={(e) => setNovaPastaDescricao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNovaPasta();
                  }
                }}
                placeholder="Digite a descrição da pasta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaPastaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleNovaPasta} disabled={!novaPastaDescricao.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Pasta */}
      <Dialog open={editPastaDialogOpen} onOpenChange={setEditPastaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pasta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-pasta-descricao-upload">Descrição</Label>
              <Input
                id="edit-pasta-descricao-upload"
                value={editPastaDescricao}
                onChange={(e) => setEditPastaDescricao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEditarPasta();
                  }
                }}
                placeholder="Digite a nova descrição"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPastaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditarPasta} disabled={!editPastaDescricao.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upload;
