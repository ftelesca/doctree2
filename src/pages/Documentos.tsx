import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Calendar, ChevronDown, ArrowUpDown, Trash2 } from "lucide-react";
import { getIconComponent } from "@/utils/iconHelper";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useLastFolder } from "@/contexts/LastFolderContext";
import { EntityEditor } from "@/components/documentos/EntityEditor";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

interface Documento {
  id: string;
  descricao: string;
  data_referencia: string;
  created_at: string;
  pastas?: {
    descricao: string;
  };
  doc_file?: {
    id: string;
    nome_arquivo: string;
    storage_path: string;
  }[];
  doc_entity?: Array<{
    entity_id: string;
    entity?: {
      id: string;
      nome: string;
      identificador_1: string;
      identificador_2: string | null;
      entity_type: {
        nome: string;
        icone: string | null;
        nome_ident_1: string | null;
        nome_ident_2: string | null;
      };
    };
  }>;
}

export default function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [pastas, setPastas] = useState<any[]>([]);
  const [entidades, setEntidades] = useState<any[]>([]);
  const [entidadesRegistros, setEntidadesRegistros] = useState<any[]>([]);
  const [selectedPasta, setSelectedPasta] = useState<string>("TODOS");
  const [selectedEntidade, setSelectedEntidade] = useState<string>("TODOS");
  const [selectedRegistro, setSelectedRegistro] = useState<string>("TODOS");
  const [loading, setLoading] = useState(true);
  const [orderAscending, setOrderAscending] = useState(false);
  const [novaPastaDialogOpen, setNovaPastaDialogOpen] = useState(false);
  const [editPastaDialogOpen, setEditPastaDialogOpen] = useState(false);
  const [novaPastaDescricao, setNovaPastaDescricao] = useState("");
  const [editPastaDescricao, setEditPastaDescricao] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleteDocFileName, setDeleteDocFileName] = useState<string>("");
  const [confirmFileName, setConfirmFileName] = useState<string>("");
  const [deleteEntityId, setDeleteEntityId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { lastFolder, setLastFolder } = useLastFolder();

  useEffect(() => {
    document.title = "Documentos - DocTree";
    loadData();
  }, []);

  // Carregar last_folder do contexto e definir como default
  useEffect(() => {
    if (lastFolder && pastas.length > 0) {
      const pastaExiste = pastas.some(p => p.id === lastFolder);
      if (pastaExiste) {
        setSelectedPasta(lastFolder);
      }
    }
  }, [lastFolder, pastas.length]);

  useEffect(() => {
    if (!isDeleting) {
      loadDocumentos();
    }
  }, [selectedPasta, selectedEntidade, selectedRegistro, orderAscending, isDeleting]);

  useEffect(() => {
    if (selectedEntidade !== "TODOS") {
      setSelectedRegistro("TODOS");
      loadEntidadesRegistros();
    } else {
      setEntidadesRegistros([]);
      setSelectedRegistro("TODOS");
    }
  }, [selectedEntidade]);

  const loadData = async () => {
    try {
      const [pastasRes, entidadesRes] = await Promise.all([
        supabase.from("folder").select("id, descricao").order("descricao", { ascending: true }),
        supabase.from("entity_type").select("id, nome").order("nome"),
      ]);

      if (pastasRes.data) setPastas(pastasRes.data);
      if (entidadesRes.data) setEntidades(entidadesRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar filtros",
        description: "Não foi possível carregar os filtros. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const loadEntidadesRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from("entity")
        .select("id, nome")
        .eq("entity_type_id", selectedEntidade)
        .order("nome");

      if (error) throw error;
      setEntidadesRegistros(data || []);
    } catch (error) {
      console.error("Erro ao carregar registros:", error);
    }
  };

  const handlePastaChange = (value: string | null) => {
    const novaPasta = value || "TODOS";
    setSelectedPasta(novaPasta);
    
    // Atualizar contexto se for uma pasta válida
    if (novaPasta !== "TODOS") {
      setLastFolder(novaPasta);
    }
  };

  const handleNovaPasta = async () => {
    if (!novaPastaDescricao.trim() || !user) return;

    // Validação: verificar se já existe pasta com mesma descrição
    const descricaoExistente = pastas.some(
      p => p.descricao.toLowerCase().trim() === novaPastaDescricao.toLowerCase().trim()
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
      loadData();
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
    if (!editPastaDescricao.trim() || !selectedPasta || selectedPasta === "TODOS") return;

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
      loadData();
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

  const loadDocumentos = async () => {
    setLoading(true);
    try {
      // Buscar documentos
      let query = supabase
        .from("doc")
        .select(
          `
          id,
          descricao,
          data_referencia,
          created_at,
          folder_id,
          folder(descricao),
          doc_file(id, nome_arquivo, storage_path),
          doc_entity(
            entity_id,
            entity(
              id,
              nome,
              identificador_1,
              identificador_2,
              entity_type(id, nome, icone, nome_ident_1, nome_ident_2)
            )
          )
        `,
        )
        .order("folder_id", { ascending: true, nullsFirst: false })
        .order("data_referencia", { ascending: orderAscending });

      // Filtrar por pasta se selecionado
      if (selectedPasta && selectedPasta !== "TODOS") {
        query = query.eq("folder_id", selectedPasta);
      }

      const { data: documentosData, error: documentosError } = await query;

      if (documentosError) throw documentosError;

      let filteredData = documentosData || [];

      // Aplicar filtros
      if (selectedRegistro !== "TODOS") {
        filteredData = filteredData.filter((documento) =>
          documento.doc_entity?.some((ee: any) => ee.entity_id === selectedRegistro),
        );
      } else if (selectedEntidade !== "TODOS") {
        filteredData = filteredData.filter((documento) =>
          documento.doc_entity?.some((ee: any) => ee.entity?.entity_type?.id === selectedEntidade),
        );
      }

      setDocumentos(filteredData);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      toast({
        title: "Erro ao carregar documentos",
        description: "Não foi possível carregar os documentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from("documentos").download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download concluído",
        description: `Arquivo ${fileName} baixado com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
      toast({
        title: "Erro ao baixar documento",
        description: "Não foi possível fazer o download do arquivo.",
        variant: "destructive",
      });
    }
  };

  const getEntidadesList = (documento: Documento) => {
    const entidades: Array<{
      id: string;
      tipo: string;
      nome: string;
      icon: any;
      identificador_1: string;
      identificador_2: string | null;
      nome_ident_1: string | null;
      nome_ident_2: string | null;
      entity_type: {
        nome: string;
        nome_ident_1: string | null;
        nome_ident_2: string | null;
      };
    }> = [];

    documento.doc_entity?.forEach((ee) => {
      if (ee.entity) {
        const tipoEntidade = ee.entity.entity_type.nome;
        const icon = getIconComponent(ee.entity.entity_type.icone);
        entidades.push({
          id: ee.entity.id,
          tipo: tipoEntidade,
          nome: ee.entity.nome,
          icon,
          identificador_1: ee.entity.identificador_1,
          identificador_2: ee.entity.identificador_2,
          nome_ident_1: ee.entity.entity_type.nome_ident_1,
          nome_ident_2: ee.entity.entity_type.nome_ident_2,
          entity_type: {
            nome: ee.entity.entity_type.nome,
            nome_ident_1: ee.entity.entity_type.nome_ident_1,
            nome_ident_2: ee.entity.entity_type.nome_ident_2,
          },
        });
      }
    });

    return entidades;
  };

  const handleEntityUpdate = async (
    entityId: string,
    data: { nome: string; identificador_1: string; identificador_2?: string },
  ) => {
    try {
      const { error } = await supabase
        .from("entity")
        .update({
          nome: data.nome,
          identificador_1: data.identificador_1,
          identificador_2: data.identificador_2 || null,
        })
        .eq("id", entityId);

      if (error) throw error;

      toast({
        title: "Entidade atualizada",
        description: "A entidade foi atualizada com sucesso.",
      });

      loadDocumentos();
    } catch (error) {
      console.error("Erro ao atualizar entidade:", error);
      toast({
        title: "Erro ao atualizar entidade",
        description: "Não foi possível atualizar a entidade.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocId || confirmFileName !== deleteDocFileName) return;

    setIsDeleting(true);
    try {
      // 1. Buscar a pasta e entidades do documento antes de excluir
      const { data: docData } = await supabase
        .from("doc")
        .select("folder_id, doc_entity(entity_id)")
        .eq("id", deleteDocId)
        .single();

      const folderId = docData?.folder_id;
      const entityIds = docData?.doc_entity?.map((de: any) => de.entity_id) || [];

      // 2. Excluir o documento (CASCADE remove doc_entity automaticamente)
      const { error } = await supabase.from("doc").delete().eq("id", deleteDocId);

      if (error) throw error;

      // 3. Para cada entidade que estava associada, verificar se ficou órfã
      for (const entityId of entityIds) {
        const { count } = await supabase
          .from("doc_entity")
          .select("*", { count: "exact", head: true })
          .eq("entity_id", entityId);

        // Se não há mais associações, excluir a entidade
        if (count === 0) {
          await supabase.from("entity").delete().eq("id", entityId);
        }
      }

      // 4. Se o documento tinha uma pasta, verificar se era o único
      let pastaFoiExcluida = false;
      if (folderId) {
        const { count } = await supabase
          .from("doc")
          .select("*", { count: "exact", head: true })
          .eq("folder_id", folderId);

        // Se não há mais documentos na pasta, excluir a pasta
        if (count === 0) {
          await supabase.from("folder").delete().eq("id", folderId);
          pastaFoiExcluida = true;

          // Se a pasta selecionada foi excluída, resetar para TODOS
          if (selectedPasta === folderId) {
            setSelectedPasta("TODOS");
          }

          // Recarregar lista de pastas
          await loadData();
        }
      }

      toast({
        title: "Documento excluído",
        description: pastaFoiExcluida
          ? "O documento e a pasta vazia foram excluídos com sucesso."
          : "O documento foi excluído com sucesso.",
      });

      // Recarregar documentos sempre para garantir atualização imediata
      await loadDocumentos();
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast({
        title: "Erro ao excluir documento",
        description: "Não foi possível excluir o documento.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDocId(null);
      setDeleteDocFileName("");
      setConfirmFileName("");
    }
  };

  const handleDeleteEntity = async () => {
    if (!deleteEntityId) return;

    try {
      // 1. Buscar o doc_entity específico para este documento e entidade
      // Precisamos encontrar qual documento está sendo visualizado
      const currentDoc = documentos.find((doc) => doc.doc_entity?.some((de) => de.entity?.id === deleteEntityId));

      if (!currentDoc) {
        throw new Error("Documento não encontrado");
      }

      // 2. Excluir apenas a associação doc_entity
      const { error: deleteAssocError } = await supabase
        .from("doc_entity")
        .delete()
        .eq("doc_id", currentDoc.id)
        .eq("entity_id", deleteEntityId);

      if (deleteAssocError) throw deleteAssocError;

      // 3. Verificar se a entidade ainda tem outras associações
      const { count } = await supabase
        .from("doc_entity")
        .select("*", { count: "exact", head: true })
        .eq("entity_id", deleteEntityId);

      // 4. Se não há mais associações, excluir a entidade órfã
      if (count === 0) {
        const { error: deleteEntityError } = await supabase.from("entity").delete().eq("id", deleteEntityId);

        if (deleteEntityError) throw deleteEntityError;
      }

      toast({
        title: "Entidade removida",
        description:
          count === 0
            ? "A entidade foi excluída do documento e do sistema (sem outros documentos associados)."
            : "A entidade foi removida deste documento.",
      });

      loadDocumentos();
    } catch (error) {
      console.error("Erro ao excluir entidade:", error);
      toast({
        title: "Erro ao excluir entidade",
        description: "Não foi possível excluir a entidade.",
        variant: "destructive",
      });
    } finally {
      setDeleteEntityId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editor</h1>
          <p className="text-muted-foreground">Importe, edite e visualize documentos analisados por IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOrderAscending(!orderAscending)} className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            {orderAscending ? "Mais antigas" : "Mais recentes"}
          </Button>
          <Button onClick={() => navigate("/upload")}>
            <Plus className="mr-2 h-4 w-4" />
            Importar Documento
          </Button>
        </div>
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
                  <Select value={selectedPasta || "TODOS"} onValueChange={handlePastaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="TODOS">Todos</SelectItem>
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
                  disabled={!selectedPasta || selectedPasta === "TODOS"}
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

      {/* Lista de Documentos */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : documentos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum documento encontrado com os filtros selecionados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documentos.map((documento) => (
            <Card key={documento.id} className="relative">
              {documento.pastas && (
                <Badge variant="outline" className="absolute -top-2 left-4 bg-background px-2 py-0.5 text-xs">
                  {documento.pastas.descricao}
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xs">{documento.descricao}</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{(() => { const [y, m, d] = documento.data_referencia.slice(0, 10).split("-"); return `${d}/${m}/${y}`; })()}</span>
                      </div>
                      {documento.doc_file && documento.doc_file.length > 0 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleDownload(documento.doc_file![0].storage_path, documento.doc_file![0].nome_arquivo)
                          }
                          title="Baixar documento"
                          className="h-7 w-7"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="destructive-outline"
                        size="icon"
                        onClick={() => {
                          setDeleteDocId(documento.id);
                          setDeleteDocFileName(documento.doc_file?.[0]?.nome_arquivo || documento.descricao);
                          setConfirmFileName("");
                        }}
                        title="Excluir documento"
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium hover:underline cursor-pointer">
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                      Entidades ({getEntidadesList(documento).length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      {getEntidadesList(documento).length > 0 ? (
                        <div className="space-y-2">
                          {getEntidadesList(documento).map((entidade, idx) => {
                            const Icon = entidade.icon;
                            return (
                              <div key={idx} className="p-2 rounded-md border bg-card">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <Badge variant="outline" className="flex-shrink-0">
                                    {entidade.tipo}
                                  </Badge>
                                  <EntityEditor
                                    entidade={entidade}
                                    onSave={(data) => handleEntityUpdate(entidade.id, data)}
                                  />
                                  <Button
                                    variant="destructive-outline"
                                    size="icon"
                                    onClick={() => setDeleteEntityId(entidade.id)}
                                    title="Excluir entidade"
                                    className="h-7 w-7 flex-shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem entidades associadas</p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs de Confirmação */}
      <AlertDialog
        open={deleteDocId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDocId(null);
            setDeleteDocFileName("");
            setConfirmFileName("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Para confirmar a exclusão, digite o nome do arquivo abaixo:</p>
              <p className="font-semibold text-foreground">{deleteDocFileName}</p>
              <Input
                value={confirmFileName}
                onChange={(e) => setConfirmFileName(e.target.value)}
                placeholder="Digite o nome do arquivo"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={confirmFileName !== deleteDocFileName}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteEntityId !== null} onOpenChange={(open) => !open && setDeleteEntityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntity}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Nova Pasta */}
      <Dialog open={novaPastaDialogOpen} onOpenChange={setNovaPastaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>Crie uma nova pasta para organizar seus documentos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nova-pasta-descricao">Descrição da Pasta</Label>
              <Input
                id="nova-pasta-descricao"
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

      {/* Dialog Editar Pasta */}
      <Dialog open={editPastaDialogOpen} onOpenChange={setEditPastaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pasta</DialogTitle>
            <DialogDescription>Altere a descrição da pasta selecionada</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pasta-descricao">Descrição da Pasta</Label>
              <Input
                id="edit-pasta-descricao"
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
    </div>
  );
}
