import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLastFolder } from "@/contexts/LastFolderContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// Hooks customizados
import { useFolders } from "@/components/navegador/hooks/useFolders";
import { useDocuments } from "@/components/navegador/hooks/useDocuments";
import { useEntities } from "@/components/navegador/hooks/useEntities";
import { useFilters } from "@/components/navegador/hooks/useFilters";

// Componentes UI
import { FilterBar } from "@/components/navegador/filters/FilterBar";
import { ActionButtons } from "@/components/navegador/filters/ActionButtons";
import { FolderTreeView } from "@/components/navegador/tree/FolderTreeView";
import { EntityTreeView } from "@/components/navegador/tree/EntityTreeView";
import { PdfViewer } from "@/components/navegador/pdf/PdfViewer";

// Dialogs
import { FolderDialogs } from "@/components/navegador/dialogs/FolderDialogs";
import { DocumentDialogs } from "@/components/navegador/dialogs/DocumentDialogs";
import { EntityDialogs } from "@/components/navegador/dialogs/EntityDialogs";
import { ShareFolderDialog } from "@/components/navegador/ShareFolderDialog";

import { AnalysisDialog } from "@/components/navegador/AnalysisDialog";

interface EntityRaiz {
  id: string;
  nome: string;
  tipo: string;
  icone: string | null;
}

export default function Navegador() {
  const navigate = useNavigate();
  const { lastFolder, setLastFolder } = useLastFolder();

  // Estados locais
  const [ordenacaoDesc, setOrdenacaoDesc] = useState(true);
  const [entidadeRaiz, setEntidadeRaiz] = useState<EntityRaiz | null>(null);
  const [pastaExpandida, setPastaExpandida] = useState<Record<string, boolean>>({});
  const [selectedDocument, setSelectedDocument] = useState<{
    storage_path: string;
    nome_arquivo: string;
    descricao: string;
    data_referencia: string;
  } | null>(null);

  // Estados de dialogs - Pasta
  const [novaPastaOpen, setNovaPastaOpen] = useState(false);
  const [novaPastaDescricao, setNovaPastaDescricao] = useState("");
  const [editPastaOpen, setEditPastaOpen] = useState(false);
  const [editPastaDescricao, setEditPastaDescricao] = useState("");
  const [editPastaId, setEditPastaId] = useState<string | null>(null);

  // Estados de dialogs - Documento
  const [editDocOpen, setEditDocOpen] = useState(false);
  const [editDocDescricao, setEditDocDescricao] = useState("");
  const [editDocData, setEditDocData] = useState("");
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editDocFolderId, setEditDocFolderId] = useState<string | null>(null);

  const [deleteDocOpen, setDeleteDocOpen] = useState(false);
  const [deleteDocFileName, setDeleteDocFileName] = useState("");
  const [deleteDocConfirmText, setDeleteDocConfirmText] = useState("");
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleteDocFolderId, setDeleteDocFolderId] = useState<string | null>(null);

  // Estados de dialogs - Entidade
  const [editEntityOpen, setEditEntityOpen] = useState(false);
  const [editEntityNome, setEditEntityNome] = useState("");
  const [editEntityIdent1, setEditEntityIdent1] = useState("");
  const [editEntityIdent2, setEditEntityIdent2] = useState("");
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editEntityHasIdent2, setEditEntityHasIdent2] = useState(false);
  const [editEntityNomeIdent1, setEditEntityNomeIdent1] = useState("");
  const [editEntityNomeIdent2, setEditEntityNomeIdent2] = useState<string | null>(null);

  const [deleteEntityOpen, setDeleteEntityOpen] = useState(false);
  const [deleteEntityName, setDeleteEntityName] = useState("");
  const [deleteEntityConfirmText, setDeleteEntityConfirmText] = useState("");
  const [deleteEntityId, setDeleteEntityId] = useState<string | null>(null);
  const [deleteEntityDocId, setDeleteEntityDocId] = useState<string | null>(null);

  // Estados de dialogs - Compartilhamento e Análise
  const [shareFolderOpen, setShareFolderOpen] = useState(false);
  const [shareFolderId, setShareFolderId] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisFolderId, setAnalysisFolderId] = useState<string | null>(null);

  // Hooks customizados
  const {
    folders,
    loading: foldersLoading,
    loadFolders,
    createFolder,
    updateFolder,
  } = useFolders();

  const {
    documentsByFolder,
    loadDocuments,
    updateDocument,
    deleteDocument,
  } = useDocuments(ordenacaoDesc);

  const {
    entityTypes,
    entities,
    loadEntityTypes,
    loadEntitiesByType,
    updateEntity,
    deleteEntityFromDoc,
  } = useEntities();

  const {
    selectedPasta,
    selectedEntidade,
    selectedRegistro,
    setSelectedPasta,
    setSelectedEntidade,
    setSelectedRegistro,
    applyFilters,
  } = useFilters(entityTypes);

  // useEffects para carregar dados
  useEffect(() => {
    document.title = "Navegador - DocTree";
    loadFolders();
    loadEntityTypes();
  }, []);

  // Recarrega pastas quando compartilhamentos são atualizados
  useEffect(() => {
    const handler = () => loadFolders();
    window.addEventListener("shares:updated", handler);
    return () => window.removeEventListener("shares:updated", handler);
  }, [loadFolders]);
  useEffect(() => {
    if (folders.length > 0) {
      loadDocuments(folders.map((f) => f.id));
    }
  }, [folders.length, ordenacaoDesc]);

  useEffect(() => {
    if (selectedEntidade !== "TODOS") {
      loadEntitiesByType(selectedEntidade);
    }
  }, [selectedEntidade]);

  // Inicializar pasta selecionada com lastFolder
  useEffect(() => {
    if (lastFolder && folders.some((f) => f.id === lastFolder)) {
      setSelectedPasta(lastFolder);
    }
  }, [lastFolder, folders]);

  // Handlers - Pasta
  const handleCreateFolder = async () => {
    const newId = await createFolder(novaPastaDescricao);
    if (newId) {
      setSelectedPasta(newId);
      setNovaPastaDescricao("");
      setNovaPastaOpen(false);
    }
  };

  const handleUpdateFolder = async () => {
    if (editPastaId) {
      await updateFolder(editPastaId, editPastaDescricao);
      setEditPastaOpen(false);
      setEditPastaId(null);
      setEditPastaDescricao("");
    }
  };

  // Handlers - Documento
  const handleEditDoc = (doc: any) => {
    setEditDocId(doc.id);
    setEditDocFolderId(doc.folder_id);
    setEditDocDescricao(doc.descricao);
    setEditDocData(doc.data_referencia.slice(0, 10));
    setEditDocOpen(true);
  };

  const handleSaveEditDoc = async () => {
    if (editDocId && editDocFolderId) {
      const success = await updateDocument(editDocId, {
        descricao: editDocDescricao,
        data_referencia: editDocData,
      });

      if (success) {
        // Recarregar documentos
        await loadDocuments(folders.map((f) => f.id));
        setEditDocOpen(false);
        setEditDocId(null);
        setEditDocFolderId(null);
      }
    }
  };

  const handleDeleteDoc = (doc: any) => {
    setDeleteDocId(doc.id);
    setDeleteDocFolderId(doc.folder_id);
    setDeleteDocFileName(doc.doc_file?.[0]?.nome_arquivo || "documento");
    setDeleteDocConfirmText("");
    setDeleteDocOpen(true);
  };

  const handleConfirmDeleteDoc = async () => {
    if (deleteDocId && deleteDocFolderId) {
      const result = await deleteDocument(deleteDocId);

      if (result.success) {
        // Recarregar documentos
        await loadDocuments(folders.map((f) => f.id));

        // Fechar documento se estava selecionado
        if (selectedDocument?.storage_path) {
          const wasDeleted = documentsByFolder[deleteDocFolderId]?.find(
            (d) => d.id === deleteDocId
          );
          if (wasDeleted) {
            setSelectedDocument(null);
          }
        }

        setDeleteDocOpen(false);
        setDeleteDocId(null);
        setDeleteDocFolderId(null);
        setDeleteDocConfirmText("");
      }
    }
  };

  // Handlers - Entidade
  const handleEditEntity = (entity: any) => {
    setEditEntityId(entity.id);
    setEditEntityNome(entity.nome);
    setEditEntityIdent1(entity.identificador_1);
    setEditEntityIdent2(entity.identificador_2 || "");
    setEditEntityHasIdent2(!!entity.entity_type.nome_ident_2);
    setEditEntityNomeIdent1(entity.entity_type.nome_ident_1 || "Identificador 1");
    setEditEntityNomeIdent2(entity.entity_type.nome_ident_2);
    setEditEntityOpen(true);
  };

  const handleSaveEditEntity = async () => {
    if (editEntityId) {
      const success = await updateEntity(editEntityId, {
        nome: editEntityNome,
        identificador_1: editEntityIdent1,
        identificador_2: editEntityHasIdent2 ? editEntityIdent2 : null,
      });

      if (success) {
        // Recarregar documentos
        await loadDocuments(folders.map((f) => f.id));
        setEditEntityOpen(false);
        setEditEntityId(null);
      }
    }
  };

  const handleDeleteEntity = (entity: any, docId: string) => {
    setDeleteEntityId(entity.id);
    setDeleteEntityDocId(docId);
    setDeleteEntityName(entity.nome);
    setDeleteEntityConfirmText("");
    setDeleteEntityOpen(true);
  };

  const handleConfirmDeleteEntity = async () => {
    if (deleteEntityId && deleteEntityDocId) {
      const result = await deleteEntityFromDoc(deleteEntityId, deleteEntityDocId);

      if (result.success) {
        // Recarregar documentos
        await loadDocuments(folders.map((f) => f.id));
        setDeleteEntityOpen(false);
        setDeleteEntityId(null);
        setDeleteEntityDocId(null);
        setDeleteEntityConfirmText("");
      }
    }
  };

  // Handlers - Navegação
  const handleTogglePasta = (pastaId: string, documentos: any[]) => {
    const newExpanded = !pastaExpandida[pastaId];
    const updates: Record<string, boolean> = { [pastaId]: newExpanded };

    if (newExpanded) {
      documentos.forEach((doc) => {
        updates[`${pastaId}-${doc.id}`] = true;
      });
    }

    setPastaExpandida({ ...pastaExpandida, ...updates });
  };

  const handleDownload = async (path: string, name: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("documentos")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Download concluído");
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download do documento");
    }
  };

  // Handlers - Compartilhamento e Análise
  const handleShare = (pasta: any) => {
    setShareFolderId(pasta.id);
    setShareFolderOpen(true);
  };

  const handleAnalysis = (pasta: any) => {
    setAnalysisFolderId(pasta.id);
    setAnalysisOpen(true);
  };

  // Aplicar filtros
  const documentosFiltrados = applyFilters(documentsByFolder);

  // Verificar se pode editar pasta
  const canEditPasta =
    selectedPasta !== "TODOS" &&
    folders.find((f) => f.id === selectedPasta)?.isOwner;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Navegador</h1>
        <p className="text-muted-foreground mt-2">
          Navegue por pastas, documentos e entidades
        </p>
      </div>

      {/* Filtros */}
      <FilterBar
        pastas={folders}
        entityTypes={entityTypes}
        entities={entities}
        selectedPasta={selectedPasta}
        selectedEntidade={selectedEntidade}
        selectedRegistro={selectedRegistro}
        onPastaChange={(value) => {
          setSelectedPasta(value);
          if (value !== "TODOS") setLastFolder(value);
        }}
        onEntidadeChange={(value) => {
          setSelectedEntidade(value);
          setSelectedRegistro("TODOS");
        }}
        onRegistroChange={setSelectedRegistro}
        onNovaPasta={() => setNovaPastaOpen(true)}
        onEditarPasta={() => {
          const pasta = folders.find((f) => f.id === selectedPasta);
          if (pasta) {
            setEditPastaId(pasta.id);
            setEditPastaDescricao(pasta.descricao);
            setEditPastaOpen(true);
          }
        }}
        canEditPasta={canEditPasta}
      />

      {/* Botões de Ação */}
      <ActionButtons
        ordenacaoDesc={ordenacaoDesc}
        entidadeRaiz={entidadeRaiz}
        onOrdenacaoChange={() => setOrdenacaoDesc(!ordenacaoDesc)}
        onVoltarPastas={() => setEntidadeRaiz(null)}
        onImportar={() => navigate("/upload")}
      />

      {/* Painéis */}
      {foldersLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : selectedDocument ? (
        <div className="min-h-[600px] rounded-lg border">
          <PdfViewer
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onDownload={handleDownload}
          />
        </div>
      ) : (
        <div className="min-h-[600px] rounded-lg border overflow-auto p-4">
          {entidadeRaiz ? (
            <EntityTreeView
              entidadeRaiz={entidadeRaiz}
              pastas={folders}
              documentosPorPasta={documentosFiltrados}
              pastaExpandida={pastaExpandida}
              selectedDocument={selectedDocument}
              onToggle={(key) =>
                setPastaExpandida({
                  ...pastaExpandida,
                  [key]: !pastaExpandida[key],
                })
              }
              onSelectDocument={setSelectedDocument}
              onEditDoc={handleEditDoc}
              onDeleteDoc={handleDeleteDoc}
              onEditEntity={handleEditEntity}
              onDeleteEntity={handleDeleteEntity}
              onSelectEntityRoot={setEntidadeRaiz}
            />
          ) : (
            <FolderTreeView
              pastas={folders}
              documentosPorPasta={documentosFiltrados}
              pastaExpandida={pastaExpandida}
              selectedDocument={selectedDocument}
              onTogglePasta={handleTogglePasta}
              onToggleDoc={(key) =>
                setPastaExpandida({
                  ...pastaExpandida,
                  [key]: !pastaExpandida[key],
                })
              }
              onSelectDocument={setSelectedDocument}
              onEditDoc={handleEditDoc}
              onDeleteDoc={handleDeleteDoc}
              onEditEntity={handleEditEntity}
              onDeleteEntity={handleDeleteEntity}
              onSelectEntityRoot={setEntidadeRaiz}
              onAnalysis={handleAnalysis}
              onShare={handleShare}
            />
          )}
        </div>
      )}

      {/* Dialogs - Pastas */}
      <FolderDialogs
        novaPastaOpen={novaPastaOpen}
        novaPastaDescricao={novaPastaDescricao}
        onNovaPastaOpenChange={setNovaPastaOpen}
        onNovaPastaDescricaoChange={setNovaPastaDescricao}
        onCreatePasta={handleCreateFolder}
        editPastaOpen={editPastaOpen}
        editPastaDescricao={editPastaDescricao}
        onEditPastaOpenChange={setEditPastaOpen}
        onEditPastaDescricaoChange={setEditPastaDescricao}
        onUpdatePasta={handleUpdateFolder}
      />

      {/* Dialogs - Documentos */}
      <DocumentDialogs
        editOpen={editDocOpen}
        editDescricao={editDocDescricao}
        editData={editDocData}
        onEditOpenChange={setEditDocOpen}
        onEditDescricaoChange={setEditDocDescricao}
        onEditDataChange={setEditDocData}
        onSaveEdit={handleSaveEditDoc}
        deleteOpen={deleteDocOpen}
        deleteFileName={deleteDocFileName}
        deleteConfirmText={deleteDocConfirmText}
        onDeleteOpenChange={setDeleteDocOpen}
        onDeleteConfirmTextChange={setDeleteDocConfirmText}
        onConfirmDelete={handleConfirmDeleteDoc}
      />

      {/* Dialogs - Entidades */}
      <EntityDialogs
        editOpen={editEntityOpen}
        editNome={editEntityNome}
        editIdent1={editEntityIdent1}
        editIdent2={editEntityIdent2}
        hasIdent2={editEntityHasIdent2}
        nomeIdent1={editEntityNomeIdent1}
        nomeIdent2={editEntityNomeIdent2}
        onEditOpenChange={setEditEntityOpen}
        onEditNomeChange={setEditEntityNome}
        onEditIdent1Change={setEditEntityIdent1}
        onEditIdent2Change={setEditEntityIdent2}
        onSaveEdit={handleSaveEditEntity}
        deleteOpen={deleteEntityOpen}
        deleteEntityName={deleteEntityName}
        deleteConfirmText={deleteEntityConfirmText}
        onDeleteOpenChange={setDeleteEntityOpen}
        onDeleteConfirmTextChange={setDeleteEntityConfirmText}
        onConfirmDelete={handleConfirmDeleteEntity}
      />

      {/* Dialogs - Compartilhamento e Análise */}
      <ShareFolderDialog
        folder={
          shareFolderId
            ? folders.find((f) => f.id === shareFolderId) || null
            : null
        }
        open={shareFolderOpen}
        onOpenChange={(open) => {
          setShareFolderOpen(open);
          if (!open) setShareFolderId(null);
        }}
      />

      

      <AnalysisDialog
        open={analysisOpen}
        onOpenChange={(open) => {
          setAnalysisOpen(open);
          if (!open) setAnalysisFolderId(null);
        }}
        folderId={analysisFolderId}
        folderName={
          analysisFolderId
            ? folders.find((f) => f.id === analysisFolderId)?.descricao || ""
            : ""
        }
      />
    </div>
  );
}
