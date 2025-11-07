import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  ChevronDown,
  Building2,
  User,
  Home,
  FileText,
  Users,
  Briefcase,
  MapPin,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Entidade {
  id: string;
  nome: string;
  descricao: string;
  prompt: string;
  nome_ident_1: string | null;
  nome_ident_2: string | null;
  icone: string | null;
  created_at: string;
  updated_at: string;
}

interface EntidadeRegistro {
  id: string;
  entity_type_id: string;
  identificador_1: string;
  identificador_2: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export default function Entidades() {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const [entidades, setEntidades] = useState<Entidade[]>([]);
  const [registros, setRegistros] = useState<Record<string, EntidadeRegistro[]>>({});
  const [filtroRegistros, setFiltroRegistros] = useState<Record<string, string>>({});
  const [editingRegistro, setEditingRegistro] = useState<string | null>(null);
  const [editingRegistrosData, setEditingRegistrosData] = useState<
    Record<string, { nome: string; identificador_1: string; identificador_2: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEntidadeId, setDeleteEntidadeId] = useState<string | null>(null);
  const [editingEntidade, setEditingEntidade] = useState<Entidade | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    prompt: "",
    nome_ident_1: "",
    nome_ident_2: "",
    icone: "",
  });

  useEffect(() => {
    document.title = "Entidades - DocTree";
    loadEntidades();
  }, []);

  const loadEntidades = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("entity_type").select("*").order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar entidades:", error);
      toast.error("Erro ao carregar entidades");
    } else {
      setEntidades(data || []);
      // Carregar registros para cada entidade
      if (data) {
        await loadRegistrosForEntidades(data.map((e) => e.id));
      }
    }
    setLoading(false);
  };

  const loadRegistrosForEntidades = async (entidadeIds: string[]) => {
    const { data, error } = await supabase
      .from("entity")
      .select("*")
      .in("entity_type_id", entidadeIds)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar registros:", error);
    } else if (data) {
      const registrosPorEntidade: Record<string, EntidadeRegistro[]> = {};
      data.forEach((registro) => {
        if (!registrosPorEntidade[registro.entity_type_id]) {
          registrosPorEntidade[registro.entity_type_id] = [];
        }
        registrosPorEntidade[registro.entity_type_id].push(registro);
      });
      setRegistros(registrosPorEntidade);
    }
  };

  const entityTypeSchema = z.object({
    nome: z.string().trim().min(1, "Nome é obrigatório").max(200, "Nome deve ter no máximo 200 caracteres"),
    descricao: z
      .string()
      .trim()
      .min(1, "Descrição é obrigatória")
      .max(1000, "Descrição deve ter no máximo 1000 caracteres"),
    prompt: z.string().trim().min(1, "Prompt é obrigatório").max(5000, "Prompt deve ter no máximo 5000 caracteres"),
    nome_ident_1: z.string().trim().max(100, "Nome do identificador 1 deve ter no máximo 100 caracteres").optional(),
    nome_ident_2: z.string().trim().max(100, "Nome do identificador 2 deve ter no máximo 100 caracteres").optional(),
    icone: z.string().trim().max(50, "Ícone deve ter no máximo 50 caracteres").optional(),
  });

  const handleSave = async () => {
    // Validate form data
    const validation = entityTypeSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    if (editingEntidade) {
      const { error } = await supabase
        .from("entity_type")
        .update({
          nome: formData.nome,
          descricao: formData.descricao,
          prompt: formData.prompt,
          nome_ident_1: formData.nome_ident_1.trim() || null,
          nome_ident_2: formData.nome_ident_2.trim() || null,
          icone: formData.icone.trim() || null,
        })
        .eq("id", editingEntidade.id);

      if (error) {
        console.error("Erro ao atualizar entidade:", error);
        if (error.code === "PGRST301" || error.message.includes("policy")) {
          toast.error("Apenas administradores podem atualizar tipos de entidade");
        } else {
          toast.error("Erro ao atualizar entidade");
        }
      } else {
        toast.success("Entidade atualizada com sucesso");
        loadEntidades();
        closeDialog();
      }
    } else {
      const { error } = await supabase.from("entity_type").insert({
        nome: formData.nome,
        descricao: formData.descricao,
        prompt: formData.prompt,
        nome_ident_1: formData.nome_ident_1.trim() || null,
        nome_ident_2: formData.nome_ident_2.trim() || null,
        icone: formData.icone.trim() || null,
      });

      if (error) {
        console.error("Erro ao criar entidade:", error);
        if (error.code === "PGRST301" || error.message.includes("policy")) {
          toast.error("Apenas administradores podem criar tipos de entidade");
        } else {
          toast.error("Erro ao criar entidade");
        }
      } else {
        toast.success("Entidade criada com sucesso");
        loadEntidades();
        closeDialog();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteEntidadeId) return;

    const { error } = await supabase.from("entity_type").delete().eq("id", deleteEntidadeId);

    if (error) {
      console.error("Erro ao excluir entidade:", error);
      toast.error("Erro ao excluir entidade");
    } else {
      toast.success("Entidade excluída com sucesso");
      loadEntidades();
    }

    setDeleteDialogOpen(false);
    setDeleteEntidadeId(null);
  };

  const openDialog = (entidade?: Entidade) => {
    if (entidade) {
      setEditingEntidade(entidade);
      setFormData({
        nome: entidade.nome,
        descricao: entidade.descricao,
        prompt: entidade.prompt,
        nome_ident_1: entidade.nome_ident_1 || "",
        nome_ident_2: entidade.nome_ident_2 || "",
        icone: entidade.icone || "",
      });
    } else {
      setEditingEntidade(null);
      setFormData({ nome: "", descricao: "", prompt: "", nome_ident_1: "", nome_ident_2: "", icone: "" });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEntidade(null);
    setFormData({ nome: "", descricao: "", prompt: "", nome_ident_1: "", nome_ident_2: "", icone: "" });
  };

  const startEditingRegistro = (registro: EntidadeRegistro) => {
    setEditingRegistro(registro.id);
    setEditingRegistrosData({
      ...editingRegistrosData,
      [registro.id]: {
        nome: registro.nome,
        identificador_1: registro.identificador_1,
        identificador_2: registro.identificador_2 || "",
      },
    });
  };

  const cancelEditingRegistro = () => {
    const id = editingRegistro;
    setEditingRegistro(null);
    if (id) {
      const { [id]: _, ...rest } = editingRegistrosData;
      setEditingRegistrosData(rest);
    }
  };

  const saveRegistro = async (registroId: string, entidadeId: string) => {
    const data = editingRegistrosData[registroId];
    if (!data || !data.nome.trim() || !data.identificador_1.trim()) {
      toast.error("Nome e identificador 1 são obrigatórios");
      return;
    }

    const { error } = await supabase
      .from("entity")
      .update({
        nome: data.nome,
        identificador_1: data.identificador_1,
        identificador_2: data.identificador_2.trim() || null,
      })
      .eq("id", registroId);

    if (error) {
      console.error("Erro ao atualizar registro:", error);
      toast.error("Erro ao atualizar registro");
    } else {
      toast.success("Registro atualizado com sucesso");
      await loadRegistrosForEntidades(entidades.map((e) => e.id));
      cancelEditingRegistro();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entidades</h1>
          <p className="text-muted-foreground mt-2">
            Configure as entidades que serão identificadas pela IA nos documentos
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Entidade
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : entidades.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Nenhuma entidade encontrada</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {entidades.map((entidade) => {
            const registrosEntidade = registros[entidade.id] || [];
            const filtro = filtroRegistros[entidade.id] || "";
            const registrosFiltrados = registrosEntidade.filter(
              (r) =>
                r.nome.toLowerCase().includes(filtro.toLowerCase()) ||
                r.identificador_1.toLowerCase().includes(filtro.toLowerCase()),
            );

            return (
              <div key={entidade.id} className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{entidade.nome}</CardTitle>
                        <CardDescription className="mt-2">{entidade.descricao}</CardDescription>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => openDialog(entidade)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive-outline"
                            size="icon"
                            onClick={() => {
                              setDeleteEntidadeId(entidade.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">{entidade.prompt}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Collapsible defaultOpen={false}>
                      <div className="flex items-center justify-between">
                        <CollapsibleTrigger className="flex items-center gap-2 hover:underline cursor-pointer group">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">Registros associados</CardTitle>
                            <Badge variant="secondary">{registrosEntidade.length}</Badge>
                          </div>
                        </CollapsibleTrigger>
                        {registrosEntidade.length > 0 && (
                          <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Filtrar registros..."
                              value={filtro}
                              onChange={(e) =>
                                setFiltroRegistros({
                                  ...filtroRegistros,
                                  [entidade.id]: e.target.value,
                                })
                              }
                              className="pl-8"
                            />
                          </div>
                        )}
                      </div>
                      <CollapsibleContent className="mt-4">
                        <CardContent className="pt-0">
                          {registrosEntidade.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado</p>
                          ) : registrosFiltrados.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhum registro corresponde ao filtro
                            </p>
                          ) : (
                            <div className="grid gap-2">
                              {registrosFiltrados.map((registro) => (
                                <div
                                  key={registro.id}
                                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                                >
                                  {editingRegistro === registro.id ? (
                                    <>
                                      <div className="flex-1 space-y-2">
                                        <Input
                                          value={editingRegistrosData[registro.id]?.nome || ""}
                                          onChange={(e) =>
                                            setEditingRegistrosData({
                                              ...editingRegistrosData,
                                              [registro.id]: {
                                                ...editingRegistrosData[registro.id],
                                                nome: e.target.value,
                                              },
                                            })
                                          }
                                          placeholder="Nome"
                                          className="text-sm"
                                        />
                                        <Input
                                          value={editingRegistrosData[registro.id]?.identificador_1 || ""}
                                          onChange={(e) =>
                                            setEditingRegistrosData({
                                              ...editingRegistrosData,
                                              [registro.id]: {
                                                ...editingRegistrosData[registro.id],
                                                identificador_1: e.target.value,
                                              },
                                            })
                                          }
                                          placeholder={entidade.nome_ident_1 || "Identificador 1"}
                                          className="text-xs"
                                        />
                                        <Input
                                          value={editingRegistrosData[registro.id]?.identificador_2 || ""}
                                          onChange={(e) =>
                                            setEditingRegistrosData({
                                              ...editingRegistrosData,
                                              [registro.id]: {
                                                ...editingRegistrosData[registro.id],
                                                identificador_2: e.target.value,
                                              },
                                            })
                                          }
                                          placeholder={entidade.nome_ident_2 || "Identificador 2 (opcional)"}
                                          className="text-xs"
                                        />
                                      </div>
                                      <div className="flex gap-2 ml-2">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8"
                                          onClick={() => saveRegistro(registro.id, entidade.id)}
                                        >
                                          <Check className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8"
                                          onClick={cancelEditingRegistro}
                                        >
                                          <X className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div>
                                        <p className="font-medium text-sm">{registro.nome}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {entidade.nome_ident_1 || "ID"}: {registro.identificador_1}
                                          {registro.identificador_2 && (
                                            <>
                                              {" "}
                                              • {entidade.nome_ident_2 || "ID 2"}: {registro.identificador_2}
                                            </>
                                          )}
                                        </p>
                                      </div>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => startEditingRegistro(registro)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardHeader>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntidade ? "Editar Entidade" : "Nova Entidade"}</DialogTitle>
            <DialogDescription>Configure o nome, descrição e prompt de identificação da entidade</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Organização, Pessoa, Imóvel"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Breve descrição da entidade"
              />
            </div>
            <div>
              <Label htmlFor="prompt">Prompt de Identificação</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="Instruções para a IA identificar esta entidade nos documentos"
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="nome_ident_1">Nome do 1º Identificador</Label>
              <Input
                id="nome_ident_1"
                value={formData.nome_ident_1}
                onChange={(e) => setFormData({ ...formData, nome_ident_1: e.target.value })}
                placeholder="Ex: CPF, CNPJ, Matrícula"
              />
            </div>
            <div>
              <Label htmlFor="nome_ident_2">Nome do 2º Identificador</Label>
              <Input
                id="nome_ident_2"
                value={formData.nome_ident_2}
                onChange={(e) => setFormData({ ...formData, nome_ident_2: e.target.value })}
                placeholder="Ex: RG, Inscrição Estadual (opcional)"
              />
            </div>
            <div>
              <Label htmlFor="icone">Ícone</Label>
              <div className="flex gap-2">
                <Select value={formData.icone} onValueChange={(value) => setFormData({ ...formData, icone: value })}>
                  <SelectTrigger id="icone">
                    <SelectValue placeholder="Selecione um ícone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Building2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>Organização</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="User">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Pessoa</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Home">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        <span>Imóvel</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="FileText">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Documento</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Users">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Grupo</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Briefcase">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span>Empresa</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MapPin">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>Localização</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="FolderOpen">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        <span>Pasta</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.icone &&
                  (() => {
                    const iconMap: Record<string, any> = {
                      Building2,
                      User,
                      Home,
                      FileText,
                      Users,
                      Briefcase,
                      MapPin,
                      FolderOpen,
                    };
                    const IconPreview = iconMap[formData.icone];
                    return IconPreview ? <IconPreview className="h-10 w-10 text-muted-foreground" /> : null;
                  })()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
