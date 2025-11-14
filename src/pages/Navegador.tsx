import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLastFolder } from "@/contexts/LastFolderContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Users,
  ArrowUpDown,
  Download,
  X,
  Sparkles,
  Share2,
} from "lucide-react";
import { getIconComponent } from "@/utils/iconHelper";
import { Badge } from "@/components/ui/badge";
import { AnalysisDialog } from "@/components/navegador/AnalysisDialog";
import { ShareFolderDialog } from "@/components/navegador/ShareFolderDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface Pasta {
  id: string;
  descricao: string;
  created_at: string;
  updated_at: string;
  usuario_criador_id: string;
  isOwner: boolean;
  ownerName?: string | null;
}

interface Documento {
  id: string;
  descricao: string;
  data_referencia: string;
  doc_entity: Array<{
    entity: {
      id: string;
      nome: string;
      identificador_1: string;
      identificador_2: string | null;
      entity_type: {
        nome: string;
        nome_ident_1: string;
        nome_ident_2: string | null;
        icone: string | null;
      };
    };
  }>;
  doc_file: {
    storage_path: string;
    nome_arquivo: string;
  }[];
}

export default function Navegador() {
  const { user } = useAuth();
  const { lastFolder, setLastFolder } = useLastFolder();
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [documentosPorPasta, setDocumentosPorPasta] = useState<Record<string, Documento[]>>({});
  const [pastaExpandida, setPastaExpandida] = useState<Record<string, boolean>>({});
  const [ordenacaoDesc, setOrdenacaoDesc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [entidadeRaiz, setEntidadeRaiz] = useState<{
    id: string;
    nome: string;
    tipo: string;
    icone: string | null;
  } | null>(null);
  const [documentosExpanded, setDocumentosExpanded] = useState<Record<string, boolean>>({});
  const [selectedDocument, setSelectedDocument] = useState<{
    storage_path: string;
    nome_arquivo: string;
    descricao: string;
    data_referencia: string;
  } | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Estados para filtros
  const [selectedPastaFiltro, setSelectedPastaFiltro] = useState<string>("TODOS");
  const [entidades, setEntidades] = useState<any[]>([]);

  // Analysis dialog states
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [selectedPastaForAnalysis, setSelectedPastaForAnalysis] = useState<{
    id: string;
    descricao: string;
  } | null>(null);
  const [selectedEntidade, setSelectedEntidade] = useState<string>("TODOS");
  const [entidadesRegistros, setEntidadesRegistros] = useState<any[]>([]);
  const [selectedRegistro, setSelectedRegistro] = useState<string>("TODOS");
  const [novaPastaDialogOpen, setNovaPastaDialogOpen] = useState(false);
  const [editPastaDialogOpen, setEditPastaDialogOpen] = useState(false);
  const [novaPastaDescricao, setNovaPastaDescricao] = useState("");
  const [editPastaDescricao, setEditPastaDescricao] = useState("");

  // Estados para edição e exclusão de documentos
  const [editDocDialogOpen, setEditDocDialogOpen] = useState(false);
  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = useState(false);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<{
    id: string;
    descricao: string;
    data_referencia: string;
  } | null>(null);
  const [selectedDocForDelete, setSelectedDocForDelete] = useState<{
    id: string;
    nome_arquivo: string;
  } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [editDocDescricao, setEditDocDescricao] = useState("");
  const [editDocData, setEditDocData] = useState("");

  // Estados para edição e exclusão de entidades
  const [editEntityDialogOpen, setEditEntityDialogOpen] = useState(false);
  const [deleteEntityDialogOpen, setDeleteEntityDialogOpen] = useState(false);
  const [selectedEntityForEdit, setSelectedEntityForEdit] = useState<{
    id: string;
    nome: string;
    identificador_1: string;
    identificador_2: string | null;
    entity_type: {
      nome: string;
      nome_ident_1: string;
      nome_ident_2: string | null;
    };
  } | null>(null);
  const [selectedEntityForDelete, setSelectedEntityForDelete] = useState<{
    id: string;
    nome: string;
    docId: string;
  } | null>(null);
  const [deleteEntityConfirmText, setDeleteEntityConfirmText] = useState("");
  const [editEntityNome, setEditEntityNome] = useState("");
  const [editEntityIdent1, setEditEntityIdent1] = useState("");
  const [editEntityIdent2, setEditEntityIdent2] = useState("");

  // Estados para compartilhamento de pastas
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPastaForShare, setSelectedPastaForShare] = useState<Pasta | null>(null);

  useEffect(() => {
    document.title = "Navegador - DocTree";
    const init = async () => {
      await loadPastas();
      await loadEntidades();
    };
    init();
  }, []);

  // Carregar last_folder do contexto e definir como default
  useEffect(() => {
    if (lastFolder && pastas.length > 0) {
      const pastaExiste = pastas.some((p) => p.id === lastFolder);
      if (pastaExiste) {
        setSelectedPastaFiltro(lastFolder);
      }
    }
  }, [lastFolder, pastas.length]);

  useEffect(() => {
    if (pastas.length > 0) {
      loadDocumentosPorPasta(pastas.map((p) => p.id));
    }
  }, [ordenacaoDesc, pastas.length]);

  useEffect(() => {
    if (selectedEntidade !== "TODOS") {
      loadRegistrosPorEntidade(selectedEntidade);
    } else {
      setEntidadesRegistros([]);
      setSelectedRegistro("TODOS");
    }
  }, [selectedEntidade]);

  const loadPastas = async () => {
    setLoading(true);

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Buscar pastas próprias
      const { data: ownFolders, error: ownError } = await supabase
        .from("folder")
        .select("id, descricao, created_at, updated_at, usuario_criador_id")
        .eq("usuario_criador_id", user.id)
        .order("descricao", { ascending: true });

      if (ownError) throw ownError;

      // Buscar pastas compartilhadas CONFIRMADAS com nome do owner
      const { data: sharedFolders, error: sharedError } = await supabase
        .from("folder_share")
        .select(`
          folder_id,
          folder:folder_id (
            id,
            descricao,
            created_at,
            updated_at,
            usuario_criador_id
          ),
          owner:profiles!usuario_criador_id (
            full_name
          )
        `)
        .eq("user_guest_id", user.id)
        .eq("confirmed", true);

      if (sharedError) throw sharedError;

      // Combinar pastas próprias e compartilhadas
      const ownWithFlag: Pasta[] = (ownFolders || []).map((f) => ({
        ...f,
        isOwner: true,
        ownerName: null,
      }));

      const sharedWithFlag: Pasta[] = (sharedFolders || [])
        .filter((sf: any) => sf.folder)
        .map((sf: any) => ({
          ...sf.folder,
          isOwner: false,
          ownerName: sf.owner?.full_name || "Usuário",
        }));

      const allFolders = [...ownWithFlag, ...sharedWithFlag].sort((a, b) =>
        a.descricao.localeCompare(b.descricao)
      );

      setPastas(allFolders);

      if (allFolders.length > 0) {
        await loadDocumentosPorPasta(allFolders.map((p) => p.id));
      }
    } catch (error) {
      console.error("Erro ao carregar pastas:", error);
      toast.error("Erro ao carregar pastas");
    }

    setLoading(false);
  };

  const loadDocumentosPorPasta = async (pastaIds: string[]) => {
    const { data, error } = await supabase
      .from("doc")
      .select(
        `
        id,
        descricao,
        data_referencia,
        folder_id,
        doc_entity(
          entity(
            id,
            nome,
            identificador_1,
            identificador_2,
            entity_type(
              nome,
              nome_ident_1,
              nome_ident_2,
              icone
            )
          )
        ),
        doc_file(
          storage_path,
          nome_arquivo
        )
      `,
      )
      .in("folder_id", pastaIds);

    if (error) {
      console.error("Erro ao carregar documentos:", error);
    } else if (data) {
      const documentosPorPastaMap: Record<string, Documento[]> = {};
      data.forEach((doc: any) => {
        if (!documentosPorPastaMap[doc.folder_id]) {
          documentosPorPastaMap[doc.folder_id] = [];
        }
        documentosPorPastaMap[doc.folder_id].push(doc);
      });

      // Ordenar documentos de cada pasta
      Object.keys(documentosPorPastaMap).forEach((pastaId) => {
        documentosPorPastaMap[pastaId].sort((a, b) => {
          const dateA = a.data_referencia.slice(0, 10);
          const dateB = b.data_referencia.slice(0, 10);
          const cmp = dateA.localeCompare(dateB);
          return ordenacaoDesc ? -cmp : cmp;
        });
      });

      setDocumentosPorPasta(documentosPorPastaMap);
    }
  };

  const loadEntidades = async () => {
    const { data, error } = await supabase.from("entity_type").select("id, nome").order("nome");
    if (error) {
      console.error("Erro ao carregar entidades:", error);
    } else {
      setEntidades(data || []);
    }
  };

  const loadRegistrosPorEntidade = async (entidadeId: string) => {
    const { data, error } = await supabase
      .from("entity")
      .select("id, nome, identificador_1")
      .eq("entity_type_id", entidadeId)
      .order("nome");

    if (error) {
      console.error("Erro ao carregar registros:", error);
    } else {
      setEntidadesRegistros(data || []);
    }
  };

  const handlePastaFiltroChange = (value: string | null) => {
    const novaPasta = value || "TODOS";
    setSelectedPastaFiltro(novaPasta);

    // Atualizar contexto se for uma pasta válida
    if (novaPasta !== "TODOS") {
      setLastFolder(novaPasta);
    }
  };

  const handleNovaPasta = async () => {
    if (!novaPastaDescricao.trim() || !user) return;

    // Validação: verificar se já existe pasta com mesma descrição
    const descricaoExistente = pastas.some(
      (p) => p.descricao.toLowerCase().trim() === novaPastaDescricao.toLowerCase().trim(),
    );

    if (descricaoExistente) {
      toast.error("Já existe uma pasta com essa descrição");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("folder")
        .insert({ descricao: novaPastaDescricao.trim(), usuario_criador_id: user.id })
        .select()
        .single();

      if (error) throw error;

      toast.success("Pasta criada com sucesso");
      setSelectedPastaFiltro(data.id);
      setNovaPastaDescricao("");
      setNovaPastaDialogOpen(false);
      await loadPastas();
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      toast.error("Erro ao criar pasta");
    }
  };

  const handleEditarPasta = async () => {
    if (!editPastaDescricao.trim() || !selectedPastaFiltro || selectedPastaFiltro === "TODOS") return;

    try {
      const { error } = await supabase
        .from("folder")
        .update({ descricao: editPastaDescricao.trim() })
        .eq("id", selectedPastaFiltro);

      if (error) throw error;

      toast.success("Pasta atualizada com sucesso");
      setEditPastaDescricao("");
      setEditPastaDialogOpen(false);
      await loadPastas();
    } catch (error) {
      console.error("Erro ao atualizar pasta:", error);
      toast.error("Erro ao atualizar pasta");
    }
  };

  const handleEditarClick = () => {
    const pasta = pastas.find((p) => p.id === selectedPastaFiltro);
    if (pasta) {
      if (!pasta.isOwner) {
        toast.error("Você não pode editar uma pasta compartilhada");
        return;
      }
      setEditPastaDescricao(pasta.descricao);
      setEditPastaDialogOpen(true);
    }
  };

  const aplicarFiltros = () => {
    if (!pastas.length) return {};

    let documentosFiltrados = { ...documentosPorPasta };

    // Filtrar por pasta
    if (selectedPastaFiltro && selectedPastaFiltro !== "TODOS") {
      documentosFiltrados = { [selectedPastaFiltro]: documentosFiltrados[selectedPastaFiltro] || [] };
    }

    // Filtrar por registro específico
    if (selectedRegistro !== "TODOS") {
      Object.keys(documentosFiltrados).forEach((pastaId) => {
        documentosFiltrados[pastaId] = documentosFiltrados[pastaId].filter((doc) =>
          doc.doc_entity.some((de) => de.entity.id === selectedRegistro),
        );
      });
    }
    // Filtrar por tipo de entidade
    else if (selectedEntidade !== "TODOS") {
      Object.keys(documentosFiltrados).forEach((pastaId) => {
        documentosFiltrados[pastaId] = documentosFiltrados[pastaId].filter((doc) =>
          doc.doc_entity.some(
            (de) => de.entity.entity_type.nome === entidades.find((e) => e.id === selectedEntidade)?.nome,
          ),
        );
      });
    }

    return documentosFiltrados;
  };

  const handleDownload = async (storagePath: string, nomeArquivo: string) => {
    try {
      const { data, error } = await supabase.storage.from("documentos").download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Download iniciado");
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download do documento");
    }
  };

  const handleEditDocClick = (doc: Documento) => {
    setSelectedDocForEdit({
      id: doc.id,
      descricao: doc.descricao,
      data_referencia: doc.data_referencia.slice(0, 10),
    });
    setEditDocDescricao(doc.descricao);
    setEditDocData(doc.data_referencia.slice(0, 10));
    setEditDocDialogOpen(true);
  };

  const handleSaveDocEdit = async () => {
    if (!selectedDocForEdit || !editDocDescricao.trim() || !editDocData) return;

    try {
      const { error } = await supabase
        .from("doc")
        .update({
          descricao: editDocDescricao.trim(),
          data_referencia: editDocData,
        })
        .eq("id", selectedDocForEdit.id);

      if (error) throw error;

      toast.success("Documento atualizado com sucesso");
      setEditDocDialogOpen(false);
      setSelectedDocForEdit(null);
      setEditDocDescricao("");
      setEditDocData("");
      await loadPastas();
    } catch (error) {
      console.error("Erro ao atualizar documento:", error);
      toast.error("Erro ao atualizar documento");
    }
  };

  const handleDeleteDocClick = (doc: Documento) => {
    setSelectedDocForDelete({
      id: doc.id,
      nome_arquivo: doc.doc_file?.[0]?.nome_arquivo || "documento",
    });
    setDeleteConfirmText("");
    setDeleteDocDialogOpen(true);
  };

  const cleanupOrphanEntity = async (entityId: string): Promise<boolean> => {
    try {
      const { data: remainingRelations, error: checkError } = await supabase
        .from("doc_entity")
        .select("id")
        .eq("entity_id", entityId)
        .limit(1);

      if (checkError) throw checkError;

      if (!remainingRelations || remainingRelations.length === 0) {
        const { error: entityError } = await supabase.from("entity").delete().eq("id", entityId);

        if (entityError) throw entityError;
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Erro ao limpar entidade ${entityId}:`, error);
      return false;
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!selectedDocForDelete) return;

    if (deleteConfirmText !== selectedDocForDelete.nome_arquivo) {
      toast.error("O nome do arquivo não coincide");
      return;
    }

    try {
      const { data: relatedEntities, error: fetchError } = await supabase
        .from("doc_entity")
        .select("entity_id")
        .eq("doc_id", selectedDocForDelete.id);

      if (fetchError) throw fetchError;

      const entityIds = relatedEntities?.map((re) => re.entity_id) || [];

      const { error: entitiesError } = await supabase.from("doc_entity").delete().eq("doc_id", selectedDocForDelete.id);

      if (entitiesError) throw entitiesError;

      let deletedEntitiesCount = 0;
      for (const entityId of entityIds) {
        const wasDeleted = await cleanupOrphanEntity(entityId);
        if (wasDeleted) {
          deletedEntitiesCount++;
          if (entidadeRaiz?.id === entityId) {
            setEntidadeRaiz(null);
          }
        }
      }

      const { data: files, error: filesError } = await supabase
        .from("doc_file")
        .select("storage_path")
        .eq("doc_id", selectedDocForDelete.id);

      if (filesError) throw filesError;

      if (files && files.length > 0) {
        const filePaths = files.map((f) => f.storage_path);
        const { error: storageError } = await supabase.storage.from("documentos").remove(filePaths);

        if (storageError) throw storageError;
      }

      const { error: docFilesError } = await supabase.from("doc_file").delete().eq("doc_id", selectedDocForDelete.id);

      if (docFilesError) throw docFilesError;

      const { error: docError } = await supabase.from("doc").delete().eq("id", selectedDocForDelete.id);

      if (docError) throw docError;

      if (deletedEntitiesCount > 0) {
        toast.success(
          `Documento excluído com sucesso. ${deletedEntitiesCount} entidade(s) órfã(s) também foram removidas.`,
        );
      } else {
        toast.success("Documento excluído com sucesso");
      }

      setDeleteDocDialogOpen(false);
      setSelectedDocForDelete(null);
      setDeleteConfirmText("");

      if (selectedDocument && files?.some((f) => f.storage_path === selectedDocument.storage_path)) {
        setSelectedDocument(null);
      }

      await loadPastas();
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento");
    }
  };

  const handleEditEntityClick = (entity: any) => {
    setSelectedEntityForEdit({
      id: entity.id,
      nome: entity.nome,
      identificador_1: entity.identificador_1,
      identificador_2: entity.identificador_2,
      entity_type: entity.entity_type,
    });
    setEditEntityNome(entity.nome);
    setEditEntityIdent1(entity.identificador_1);
    setEditEntityIdent2(entity.identificador_2 || "");
    setEditEntityDialogOpen(true);
  };

  const handleSaveEntityEdit = async () => {
    if (!selectedEntityForEdit || !editEntityNome.trim() || !editEntityIdent1.trim()) return;

    try {
      const { error } = await supabase
        .from("entity")
        .update({
          nome: editEntityNome.trim(),
          identificador_1: editEntityIdent1.trim().replace(/[^A-Za-z0-9]/g, ""),
          identificador_2: editEntityIdent2.trim() ? editEntityIdent2.trim().replace(/[^A-Za-z0-9]/g, "") : null,
        })
        .eq("id", selectedEntityForEdit.id);

      if (error) throw error;

      toast.success("Entidade atualizada com sucesso");
      setEditEntityDialogOpen(false);
      setSelectedEntityForEdit(null);
      setEditEntityNome("");
      setEditEntityIdent1("");
      setEditEntityIdent2("");
      await loadPastas();
    } catch (error) {
      console.error("Erro ao atualizar entidade:", error);
      toast.error("Erro ao atualizar entidade");
    }
  };

  const handleDeleteEntityClick = (entity: any, docId: string) => {
    setSelectedEntityForDelete({
      id: entity.id,
      nome: entity.nome,
      docId: docId,
    });
    setDeleteEntityConfirmText("");
    setDeleteEntityDialogOpen(true);
  };

  const handleConfirmDeleteEntity = async () => {
    if (!selectedEntityForDelete) return;

    if (deleteEntityConfirmText !== selectedEntityForDelete.nome) {
      toast.error("O nome da entidade não coincide");
      return;
    }

    try {
      const { error: docEntityError } = await supabase
        .from("doc_entity")
        .delete()
        .eq("entity_id", selectedEntityForDelete.id)
        .eq("doc_id", selectedEntityForDelete.docId);

      if (docEntityError) throw docEntityError;

      const wasDeleted = await cleanupOrphanEntity(selectedEntityForDelete.id);

      if (wasDeleted) {
        toast.success("Entidade removida do documento e excluída (sem outros vínculos)");

        if (entidadeRaiz?.id === selectedEntityForDelete.id) {
          setEntidadeRaiz(null);
        }
      } else {
        toast.success("Entidade removida do documento");
      }

      setDeleteEntityDialogOpen(false);
      setSelectedEntityForDelete(null);
      setDeleteEntityConfirmText("");

      await loadPastas();
    } catch (error) {
      console.error("Erro ao excluir entidade:", error);
      toast.error("Erro ao excluir entidade");
    }
  };

  useEffect(() => {
    if (!selectedDocument) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setPdfError(null);
      return;
    }

    const loadPdf = async () => {
      setPdfLoading(true);
      setPdfError(null);

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      try {
        const { data, error } = await supabase.storage.from("documentos").download(selectedDocument.storage_path);

        if (error) {
          throw new Error("Erro ao baixar o documento");
        }

        const url = URL.createObjectURL(data);
        setPdfUrl(url);
      } catch (err) {
        console.error("Erro ao carregar PDF:", err);
        setPdfError("Não foi possível carregar o documento");
      } finally {
        setPdfLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [selectedDocument?.storage_path]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Navegador</h1>
        <p className="text-muted-foreground mt-2">Navegue por pastas, documentos e entidades</p>
      </div>

      {/* Filtros */}
      <Card className="relative">
        <Badge variant="secondary" className="absolute -top-2 left-4 text-xs">
          Filtros
        </Badge>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pasta</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedPastaFiltro ?? "TODOS"} onValueChange={handlePastaFiltroChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as pastas" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="TODOS">Todas as pastas</SelectItem>
                      {pastas.map((pasta) => (
                        <SelectItem key={pasta.id} value={pasta.id}>
                          {pasta.isOwner 
                            ? pasta.descricao 
                            : `${pasta.descricao} (${pasta.ownerName})`
                          }
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
                  disabled={
                    !selectedPastaFiltro ||
                    selectedPastaFiltro === "TODOS" ||
                    !pastas.find((p) => p.id === selectedPastaFiltro)?.isOwner
                  }
                  title="Editar pasta"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Entidade</label>
              <Select value={selectedEntidade} onValueChange={setSelectedEntidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {entidades.map((ent) => (
                    <SelectItem key={ent.id} value={ent.id}>
                      {ent.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Registro Específico</label>
              <Select
                value={selectedRegistro}
                onValueChange={setSelectedRegistro}
                disabled={selectedEntidade === "TODOS"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um registro" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {entidadesRegistros.map((reg) => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={() => setOrdenacaoDesc(!ordenacaoDesc)} className="gap-2 h-10">
          <ArrowUpDown className="h-4 w-4" />
          {ordenacaoDesc ? "Mais recentes" : "Mais antigas"}
        </Button>

        {entidadeRaiz && (
          <Button
            variant="outline"
            onClick={() => {
              setEntidadeRaiz(null);
              setDocumentosExpanded({});
            }}
            className="h-10"
          >
            <X className="h-4 w-4 mr-2" />
            Voltar para visualização por pastas
          </Button>
        )}

        <Button onClick={() => navigate("/upload")} className="h-10 ml-auto">
          <Plus className="mr-2 h-4 w-4" />
          Importar Documento
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : pastas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Nenhuma pasta encontrada</CardContent>
        </Card>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
          {/* PAINEL ESQUERDO - Navegação */}
          <ResizablePanel defaultSize={50} minSize={25} maxSize={75}>
            <div className="h-full rounded-l-lg overflow-hidden bg-muted/30">
              <div className="h-full overflow-auto p-4 pb-4">
                <div className="grid gap-4">
                  {entidadeRaiz ? (
                    // Visualização com Entidade como Raiz
                    <Card className="border-0 shadow-none rounded-none bg-transparent">
                      <CardContent className="p-0 text-sm">
                        {(() => {
                          const documentosFiltrados = aplicarFiltros();
                          const documentosPorPastaEntidade: Record<string, { pasta: Pasta; documentos: Documento[] }> =
                            {};

                          pastas.forEach((pasta) => {
                            const docs = documentosFiltrados[pasta.id] || [];
                            const docsComEntidade = docs.filter((doc) =>
                              doc.doc_entity.some((de) => de.entity.id === entidadeRaiz.id),
                            );

                            if (docsComEntidade.length > 0) {
                              documentosPorPastaEntidade[pasta.id] = {
                                pasta,
                                documentos: docsComEntidade,
                              };
                            }
                          });

                          const pastasComDocs = Object.values(documentosPorPastaEntidade);

                          if (pastasComDocs.length === 0) {
                            return (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Nenhum documento encontrado para esta entidade
                              </div>
                            );
                          }

                          const entidadeKey = `entidade-${entidadeRaiz.id}`;
                          const isEntidadeExpanded = pastaExpandida[entidadeKey] !== false;
                          const IconComponentEntidade = getIconComponent(entidadeRaiz.icone);
                          const totalDocs = pastasComDocs.reduce((sum, p) => sum + p.documentos.length, 0);

                          return (
                            <>
                              <div
                                className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer select-none"
                                onClick={() => {
                                  const newExpanded = !isEntidadeExpanded;
                                  const updates: Record<string, boolean> = { [entidadeKey]: newExpanded };

                                  if (newExpanded) {
                                    pastasComDocs.forEach((item) => {
                                      const pastaKey = `entidade-${entidadeRaiz.id}-pasta-${item.pasta.id}`;
                                      updates[pastaKey] = true;
                                    });
                                  }

                                  setPastaExpandida({ ...pastaExpandida, ...updates });
                                }}
                              >
                                {isEntidadeExpanded ? (
                                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                )}
                                <IconComponentEntidade className="h-4 w-4 text-primary flex-shrink-0" />
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate">{entidadeRaiz.nome}</span>
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                                    {totalDocs}
                                  </Badge>
                                </div>
                              </div>

                              {isEntidadeExpanded && (
                                <div className="border-l-2 border-border ml-2">
                                  {pastasComDocs.map((item, pastaIndex) => {
                                    const { pasta, documentos } = item;
                                    const pastaKey = `entidade-${entidadeRaiz.id}-pasta-${pasta.id}`;
                                    const isPastaExpanded = pastaExpandida[pastaKey] !== false;
                                    const isLastPasta = pastaIndex === pastasComDocs.length - 1;

                                    return (
                                      <div key={pasta.id} className={!isLastPasta ? "border-b border-border/50" : ""}>
                                        <div
                                          className="flex items-center gap-2 p-2 ml-4 hover:bg-muted/50 cursor-pointer select-none"
                                          onClick={() =>
                                            setPastaExpandida({ ...pastaExpandida, [pastaKey]: !isPastaExpanded })
                                          }
                                        >
                                          {isPastaExpanded ? (
                                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                          )}
                                          {isPastaExpanded ? (
                                            <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
                                          ) : (
                                            <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                                          )}
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-sm font-medium truncate">
                                              {pasta.isOwner 
                                                ? pasta.descricao 
                                                : `${pasta.descricao} (${pasta.ownerName})`
                                              }
                                            </span>
                                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                                              {documentos.length}
                                            </Badge>
                                          </div>
                                        </div>

                                        {isPastaExpanded && (
                                          <div className="border-l-2 border-border ml-6 bg-muted/20">
                                            {documentos.map((doc, docIndex) => {
                                              const docKey = `entidade-${entidadeRaiz.id}-pasta-${pasta.id}-doc-${doc.id}`;
                                              const isDocExpanded = pastaExpandida[docKey] || false;
                                              const outrasEntidades = doc.doc_entity
                                                .filter((de) => de.entity.id !== entidadeRaiz.id)
                                                .sort((a, b) => {
                                                  const tipoCompare = a.entity.entity_type.nome.localeCompare(
                                                    b.entity.entity_type.nome,
                                                  );
                                                  if (tipoCompare !== 0) return tipoCompare;
                                                  return a.entity.nome.localeCompare(b.entity.nome);
                                                });
                                              const isLastDoc = docIndex === documentos.length - 1;

                                              return (
                                                <div
                                                  key={doc.id}
                                                  className={!isLastDoc ? "border-b border-border/50" : ""}
                                                >
                                                  <div
                                                    className={`flex items-start gap-2 p-2 hover:bg-muted/50 ml-4 ${
                                                      selectedDocument?.storage_path === doc.doc_file?.[0]?.storage_path
                                                        ? "bg-primary/10 border-l-2 border-primary"
                                                        : ""
                                                    }`}
                                                  >
                                                    <div
                                                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
                                                      onClick={() => {
                                                        const currentlyExpanded = pastaExpandida[docKey] || false;
                                                        setPastaExpandida({
                                                          ...pastaExpandida,
                                                          [docKey]: !currentlyExpanded,
                                                        });
                                                        if (
                                                          !currentlyExpanded &&
                                                          doc.doc_file &&
                                                          doc.doc_file.length > 0
                                                        ) {
                                                          setSelectedDocument({
                                                            storage_path: doc.doc_file[0].storage_path,
                                                            nome_arquivo: doc.doc_file[0].nome_arquivo,
                                                            descricao: doc.descricao,
                                                            data_referencia: doc.data_referencia,
                                                          });
                                                        }
                                                      }}
                                                    >
                                                      {outrasEntidades.length > 0 ? (
                                                        isDocExpanded ? (
                                                          <ChevronDown className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                                        ) : (
                                                          <ChevronRight className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                                        )
                                                      ) : (
                                                        <div className="w-3 h-3 flex-shrink-0" />
                                                      )}
                                                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                                      <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium break-words">
                                                          {doc.descricao}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                          <span>
                                                            {(() => {
                                                              const [y, m, d] = doc.data_referencia
                                                                .slice(0, 10)
                                                                .split("-");
                                                              return `${d}/${m}/${y}`;
                                                            })()}
                                                          </span>
                                                          {doc.doc_entity && doc.doc_entity.length > 0 && (
                                                            <Badge variant="outline" className="text-xs">
                                                              {doc.doc_entity.length}
                                                            </Badge>
                                                          )}
                                                          {pasta.isOwner && (
                                                            <>
                                                              <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 flex-shrink-0"
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  handleEditDocClick(doc);
                                                                }}
                                                                title="Editar documento"
                                                              >
                                                                <Edit className="h-4 w-4" />
                                                              </Button>
                                                              <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 flex-shrink-0 text-destructive hover:text-destructive"
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  handleDeleteDocClick(doc);
                                                                }}
                                                                title="Excluir documento"
                                                              >
                                                                <Trash2 className="h-4 w-4" />
                                                              </Button>
                                                            </>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {isDocExpanded && outrasEntidades.length > 0 && (
                                                    <div className="border-l-2 border-border ml-6 bg-muted/20">
                                                      {outrasEntidades.map((ee, entIndex) => {
                                                        const isLastEnt = entIndex === outrasEntidades.length - 1;
                                                        const reg = ee.entity;
                                                        const ent = reg.entity_type;
                                                        const IconComponent = getIconComponent(ent.icone);

                                                        return (
                                                          <div
                                                            key={entIndex}
                                                            className={`p-2 ml-4 ${!isLastEnt ? "border-b border-border/30" : ""} hover:bg-muted/50 transition-colors`}
                                                          >
                                                            <div
                                                              className="cursor-pointer"
                                                              onClick={() => {
                                                                setEntidadeRaiz({
                                                                  id: reg.id,
                                                                  nome: reg.nome,
                                                                  tipo: ent.nome,
                                                                  icone: ent.icone,
                                                                });
                                                                setPastaExpandida({});
                                                              }}
                                                              title="Clique para reorganizar a árvore com esta entidade"
                                                            >
                                                              <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                  <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                  <Badge
                                                                    variant="outline"
                                                                    className="text-xs flex-shrink-0"
                                                                  >
                                                                    {ent.nome}
                                                                  </Badge>
                                                                  <span className="text-xs truncate" title={reg.nome}>
                                                                    {reg.nome}
                                                                  </span>
                                                                </div>

                                                                <div className="flex items-center gap-2 justify-between">
                                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <div className="h-4 w-4 flex-shrink-0"></div>
                                                                    <div className="invisible">
                                                                      <Badge
                                                                        variant="outline"
                                                                        className="text-xs flex-shrink-0"
                                                                      >
                                                                        {ent.nome}
                                                                      </Badge>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground truncate">
                                                                      {ent.nome_ident_1}: {reg.identificador_1}
                                                                      {reg.identificador_2 && ent.nome_ident_2 && (
                                                                        <>
                                                                          {" "}
                                                                          • {ent.nome_ident_2}: {reg.identificador_2}
                                                                        </>
                                                                      )}
                                                                    </div>
                                                                  </div>
                                                                  {pasta.isOwner && (
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                      <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5"
                                                                        onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          handleEditEntityClick(reg);
                                                                        }}
                                                                        title="Editar entidade"
                                                                      >
                                                                        <Edit className="h-4 w-4" />
                                                                      </Button>
                                                                      <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 text-destructive hover:text-destructive"
                                                                        onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          handleDeleteEntityClick(reg, doc.id);
                                                                        }}
                                                                        title="Remover entidade do documento"
                                                                      >
                                                                        <Trash2 className="h-4 w-4" />
                                                                      </Button>
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  ) : (
                    // Visualização Normal por Pastas
                    <Card className="border-0 shadow-none rounded-none bg-transparent">
                      <CardContent className="p-0 text-sm">
                        {(() => {
                          const documentosFiltrados = aplicarFiltros();
                          const pastasComDocs = pastas.filter((pasta) => documentosFiltrados[pasta.id]?.length > 0);

                          if (pastasComDocs.length === 0) {
                            return (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Nenhum documento encontrado com os filtros selecionados
                              </div>
                            );
                          }

                          return pastasComDocs.map((pasta, pastaIndex) => {
                            const todosDocumentos = documentosFiltrados[pasta.id] || [];
                            const documentos = todosDocumentos;
                            const isPastaExpanded = pastaExpandida[pasta.id] !== false;

                            return (
                              <div key={pasta.id} className={pastaIndex !== 0 ? "border-t border-border/50" : ""}>
                                <div
                                  className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer select-none"
                                  onClick={() => {
                                    const newExpanded = !isPastaExpanded;
                                    const updates: Record<string, boolean> = { [pasta.id]: newExpanded };

                                    if (newExpanded) {
                                      documentos.forEach((doc) => {
                                        const docKey = `${pasta.id}-${doc.id}`;
                                        updates[docKey] = true;
                                      });
                                    }

                                    setPastaExpandida({ ...pastaExpandida, ...updates });
                                  }}
                                >
                                  {isPastaExpanded ? (
                                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                  )}
                                  {isPastaExpanded ? (
                                    <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
                                  ) : (
                                    <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm font-medium truncate">
                                      {pasta.isOwner 
                                        ? pasta.descricao 
                                        : `${pasta.descricao} (${pasta.ownerName})`
                                      }
                                    </span>
                                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                                      {documentos.length}
                                    </Badge>

                                    {/* Análise AI - SEMPRE VISÍVEL */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPastaForAnalysis({
                                          id: pasta.id,
                                          descricao: pasta.descricao,
                                        });
                                        setAnalysisDialogOpen(true);
                                      }}
                                      title="Analisar pasta com IA"
                                    >
                                      <Sparkles className="h-3 w-3" />
                                    </Button>

                                    {/* Compartilhar - APENAS PARA OWNER */}
                                    {pasta.isOwner && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPastaForShare(pasta);
                                          setShareDialogOpen(true);
                                        }}
                                        title="Compartilhar pasta"
                                      >
                                        <Share2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {isPastaExpanded && (
                                  <div className="border-l-2 border-border ml-2">
                                    {documentos.length === 0 ? (
                                      <div className="ml-6 p-2 text-xs text-muted-foreground">Nenhum documento</div>
                                    ) : (
                                      documentos.map((doc, docIndex) => {
                                        const docKey = `${pasta.id}-${doc.id}`;
                                        const isDocExpanded = pastaExpandida[docKey] || false;
                                        const entidades = (doc.doc_entity || []).sort((a, b) => {
                                          const tipoCompare = a.entity.entity_type.nome.localeCompare(
                                            b.entity.entity_type.nome,
                                          );
                                          if (tipoCompare !== 0) return tipoCompare;
                                          return a.entity.nome.localeCompare(b.entity.nome);
                                        });
                                        const isLastDoc = docIndex === documentos.length - 1;

                                        return (
                                          <div key={doc.id} className={!isLastDoc ? "border-b border-border/50" : ""}>
                                            <div
                                              className={`flex items-start gap-2 p-2 hover:bg-muted/50 ml-4 ${
                                                selectedDocument?.storage_path === doc.doc_file?.[0]?.storage_path
                                                  ? "bg-primary/10 border-l-2 border-primary"
                                                  : ""
                                              }`}
                                            >
                                              <div
                                                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
                                                onClick={() => {
                                                  const currentlyExpanded = pastaExpandida[docKey] || false;
                                                  setPastaExpandida({
                                                    ...pastaExpandida,
                                                    [docKey]: !currentlyExpanded,
                                                  });
                                                  if (!currentlyExpanded && doc.doc_file && doc.doc_file.length > 0) {
                                                    setSelectedDocument({
                                                      storage_path: doc.doc_file[0].storage_path,
                                                      nome_arquivo: doc.doc_file[0].nome_arquivo,
                                                      descricao: doc.descricao,
                                                      data_referencia: doc.data_referencia,
                                                    });
                                                  }
                                                }}
                                              >
                                                {entidades.length > 0 ? (
                                                  isDocExpanded ? (
                                                    <ChevronDown className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                                  )
                                                ) : (
                                                  <div className="w-3 h-3 flex-shrink-0" />
                                                )}
                                                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-xs font-medium break-words">{doc.descricao}</p>
                                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>
                                                      {(() => {
                                                        const [y, m, d] = doc.data_referencia.slice(0, 10).split("-");
                                                        return `${d}/${m}/${y}`;
                                                      })()}
                                                    </span>
                                                    {entidades.length > 0 && (
                                                      <Badge variant="outline" className="text-xs">
                                                        {entidades.length}
                                                      </Badge>
                                                    )}
                                                    {pasta.isOwner && (
                                                      <>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-5 w-5 flex-shrink-0"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditDocClick(doc);
                                                          }}
                                                          title="Editar documento"
                                                        >
                                                          <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-5 w-5 flex-shrink-0 text-destructive hover:text-destructive"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteDocClick(doc);
                                                          }}
                                                          title="Excluir documento"
                                                        >
                                                          <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            {isDocExpanded && entidades.length > 0 && (
                                              <div className="border-l-2 border-border ml-6 bg-muted/20">
                                                {entidades.map((ee, entIndex) => {
                                                  const isLastEnt = entIndex === entidades.length - 1;
                                                  const reg = ee.entity;
                                                  const ent = reg.entity_type;
                                                  const IconComponent = getIconComponent(ent.icone);

                                                  return (
                                                    <div
                                                      key={entIndex}
                                                      className={`p-2 ml-4 ${!isLastEnt ? "border-b border-border/30" : ""} hover:bg-muted/50 transition-colors`}
                                                    >
                                                      <div
                                                        className="cursor-pointer"
                                                        onClick={() => {
                                                          setEntidadeRaiz({
                                                            id: reg.id,
                                                            nome: reg.nome,
                                                            tipo: ent.nome,
                                                            icone: ent.icone,
                                                          });
                                                          setDocumentosExpanded({});
                                                        }}
                                                        title="Clique para reorganizar a árvore com esta entidade"
                                                      >
                                                        <div className="flex flex-col gap-1">
                                                          <div className="flex items-center gap-2">
                                                            <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                            <Badge variant="outline" className="text-xs flex-shrink-0">
                                                              {ent.nome}
                                                            </Badge>
                                                            <span className="text-xs truncate" title={reg.nome}>
                                                              {reg.nome}
                                                            </span>
                                                          </div>

                                                          <div className="flex items-center gap-2 justify-between">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                              <div className="h-4 w-4 flex-shrink-0"></div>
                                                              <div className="invisible">
                                                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                                                  {ent.nome}
                                                                </Badge>
                                                              </div>
                                                              <div className="text-xs text-muted-foreground truncate">
                                                                {ent.nome_ident_1}: {reg.identificador_1}
                                                                {reg.identificador_2 && ent.nome_ident_2 && (
                                                                  <>
                                                                    {" "}
                                                                    • {ent.nome_ident_2}: {reg.identificador_2}
                                                                  </>
                                                                )}
                                                              </div>
                                                            </div>
                                                            {pasta.isOwner && (
                                                              <div className="flex items-center gap-1 flex-shrink-0">
                                                                <Button
                                                                  variant="ghost"
                                                                  size="icon"
                                                                  className="h-5 w-5"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditEntityClick(reg);
                                                                  }}
                                                                  title="Editar entidade"
                                                                >
                                                                  <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                  variant="ghost"
                                                                  size="icon"
                                                                  className="h-5 w-5 text-destructive hover:text-destructive"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteEntityClick(reg, doc.id);
                                                                  }}
                                                                  title="Remover entidade do documento"
                                                                >
                                                                  <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* PAINEL DIREITO - PDF Viewer */}
          <ResizablePanel defaultSize={50} minSize={25}>
            {selectedDocument ? (
              <div className="h-full flex flex-col">
                {/* Header Fixo */}
                <div className="border-b p-4 bg-background">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate" title={selectedDocument.nome_arquivo}>
                        {selectedDocument.nome_arquivo}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            const [y, m, d] = selectedDocument.data_referencia.slice(0, 10).split("-");
                            return `${d}/${m}/${y}`;
                          })()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          PDF
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selectedDocument.descricao}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownload(selectedDocument.storage_path, selectedDocument.nome_arquivo)}
                        title="Baixar documento"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedDocument(null);
                          if (pdfUrl) {
                            URL.revokeObjectURL(pdfUrl);
                            setPdfUrl(null);
                          }
                        }}
                        title="Fechar visualização"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Área de Visualização do PDF */}
                <div className="flex-1 relative bg-muted/30 mb-4">
                  {pdfLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando documento...</p>
                      </div>
                    </div>
                  ) : pdfError ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-destructive">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">{pdfError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            if (selectedDocument) {
                              setSelectedDocument({ ...selectedDocument });
                            }
                          }}
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-full border-0" title={selectedDocument.nome_arquivo} />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 pb-4">
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-sm font-medium">Selecione um documento para visualizar</p>
                <p className="text-xs mt-2 text-center">Clique em qualquer documento na árvore à esquerda</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {/* Dialog Nova Pasta - Filtro */}
      <Dialog open={novaPastaDialogOpen} onOpenChange={setNovaPastaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>Crie uma nova pasta para organizar seus documentos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nova-pasta-descricao-navegador">Descrição da Pasta</Label>
              <Input
                id="nova-pasta-descricao-navegador"
                value={novaPastaDescricao}
                onChange={(e) => setNovaPastaDescricao(e.target.value)}
                placeholder="Ex: Contratos 2024"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novaPastaDescricao.trim()) {
                    handleNovaPasta();
                  }
                }}
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

      {/* Dialog Editar Pasta - Filtro */}
      <Dialog open={editPastaDialogOpen} onOpenChange={setEditPastaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pasta</DialogTitle>
            <DialogDescription>Altere a descrição da pasta selecionada</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pasta-descricao-navegador">Descrição da Pasta</Label>
              <Input
                id="edit-pasta-descricao-navegador"
                value={editPastaDescricao}
                onChange={(e) => setEditPastaDescricao(e.target.value)}
                placeholder="Ex: Contratos 2024"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editPastaDescricao.trim()) {
                    handleEditarPasta();
                  }
                }}
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

      {/* Dialog de Edição de Documento */}
      <Dialog open={editDocDialogOpen} onOpenChange={setEditDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>Altere a descrição e a data de referência do documento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-doc-descricao">Descrição</Label>
              <Textarea
                id="edit-doc-descricao"
                value={editDocDescricao}
                onChange={(e) => setEditDocDescricao(e.target.value)}
                placeholder="Descrição do documento"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doc-data">Data de Referência</Label>
              <Input
                id="edit-doc-data"
                type="date"
                value={editDocData}
                onChange={(e) => setEditDocData(e.target.value)}
                className="w-fit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDocDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDocEdit} disabled={!editDocDescricao.trim() || !editDocData}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão de Documento */}
      <AlertDialog open={deleteDocDialogOpen} onOpenChange={setDeleteDocDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O documento e todos as os seus relacionamentos serão excluídos
              permanentemente.
              <br />
              <br />
              Para confirmar, digite o nome do arquivo:
              <br />
              <strong className="text-foreground">{selectedDocForDelete?.nome_arquivo}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Digite o nome do arquivo"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDoc}
              disabled={deleteConfirmText !== selectedDocForDelete?.nome_arquivo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Edição de Entidade */}
      <Dialog open={editEntityDialogOpen} onOpenChange={setEditEntityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entidade</DialogTitle>
            <DialogDescription>Altere os dados da entidade</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-entity-nome">Nome</Label>
              <Input
                id="edit-entity-nome"
                value={editEntityNome}
                onChange={(e) => setEditEntityNome(e.target.value)}
                placeholder="Nome da entidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity-ident1">
                {selectedEntityForEdit?.entity_type.nome_ident_1 || "Identificador 1"}
              </Label>
              <Input
                id="edit-entity-ident1"
                value={editEntityIdent1}
                onChange={(e) => setEditEntityIdent1(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
                placeholder="Identificador 1"
              />
            </div>
            {selectedEntityForEdit?.entity_type.nome_ident_2 && (
              <div className="space-y-2">
                <Label htmlFor="edit-entity-ident2">{selectedEntityForEdit.entity_type.nome_ident_2}</Label>
                <Input
                  id="edit-entity-ident2"
                  value={editEntityIdent2}
                  onChange={(e) => setEditEntityIdent2(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
                  placeholder="Identificador 2 (opcional)"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntityDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEntityEdit} disabled={!editEntityNome.trim() || !editEntityIdent1.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão de Entidade */}
      <AlertDialog open={deleteEntityDialogOpen} onOpenChange={setDeleteEntityDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção de Entidade do Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a entidade deste documento. Se a entidade não estiver vinculada a outros documentos,
              ela será excluída permanentemente.
              <br />
              <br />
              Para confirmar, digite o nome da entidade:
              <br />
              <strong className="text-foreground">{selectedEntityForDelete?.nome}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Digite o nome da entidade"
              value={deleteEntityConfirmText}
              onChange={(e) => setDeleteEntityConfirmText(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteEntityConfirmText("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteEntity}
              disabled={deleteEntityConfirmText !== selectedEntityForDelete?.nome}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Análise com IA */}
      <AnalysisDialog
        open={analysisDialogOpen}
        onOpenChange={setAnalysisDialogOpen}
        folderId={selectedPastaForAnalysis?.id || null}
        folderName={selectedPastaForAnalysis?.descricao || ""}
      />

      {/* Dialog de Compartilhamento - NOVO COMPONENTE */}
      <ShareFolderDialog
        folder={selectedPastaForShare}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
}