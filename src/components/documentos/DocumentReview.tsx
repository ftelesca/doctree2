import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Check,
  X,
  FileText,
  Calendar,
  Tag,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Trash2,
  ArrowRight,
  Edit,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getIconComponent } from "@/utils/iconHelper";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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

interface DocumentReviewProps {
  result: {
    descricao: string;
    data_referencia: string;
    entidades: Array<{
      tipo: string;
      identificador_1: string;
      identificador_2?: string;
      nome: string;
      tempId?: string;
      status?: "novo" | "existente" | "conflito";
      entidade_registro_id?: string;
      entidade_nome?: string;
      entidade_icone?: string | null;
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
  };
  fileName: string;
  onEntidadeEdit: (id: string, data: { nome: string; identificador_1: string; identificador_2?: string }, skipUnicityCheck?: boolean, forceNoConflict?: boolean) => void;
  onEntidadeDelete: (id: string) => void;
  onConflictResolutionChange: (id: string, resolution: "manter" | "atualizar") => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving?: boolean;
  selectedPasta?: string | null;
}

interface EntityType {
  id: string;
  nome: string;
  icone: string | null;
}

export function DocumentReview({
  result,
  fileName,
  onEntidadeEdit,
  onEntidadeDelete,
  onConflictResolutionChange,
  onApprove,
  onReject,
  isApproving = false,
  selectedPasta,
}: DocumentReviewProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", identificador_1: "", identificador_2: "" });
  const [entityTypes, setEntityTypes] = useState<Record<string, EntityType>>({});
  // Estado local para conflitos: armazena valores editados da coluna 2 (a importar)
  const [conflictLocalState, setConflictLocalState] = useState<Record<string, {
    nome: string;
    identificador_1: string;
    identificador_2: string;
  }>>({});

  useEffect(() => {
    const loadEntityTypes = async () => {
      const { data, error } = await supabase
        .from("entity_type")
        .select("id, nome, icone");
      
      if (!error && data) {
        const typesMap: Record<string, EntityType> = {};
        data.forEach((type) => {
          typesMap[type.id] = type;
        });
        setEntityTypes(typesMap);
      }
    };
    
    loadEntityTypes();
  }, []);
  const formatDate = (dateStr: string) => {
    try {
      // Parse YYYY-MM-DD without timezone conversion
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (entidade: any) => {
    switch (entidade.status) {
      case "existente":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-green-500/10 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-700"
          >
            <CheckCircle className="w-3 h-3" />
            Existente
          </Badge>
        );
      case "conflito":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-yellow-500/10 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-700"
          >
            <AlertTriangle className="w-3 h-3" />
            Conflito
          </Badge>
        );
      case "novo":
      default:
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-blue-500/10 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-700"
          >
            <AlertCircle className="w-3 h-3" />
            Novo
          </Badge>
        );
    }
  };

  // Construir lista com ID estável (sempre tempId)
  const entidadesWithId = (result.entidades || []).map((entidade) => ({ entidade, id: entidade.tempId as string }));
  const sortedEntidades = [...entidadesWithId].sort((a, b) => {
    const ordem = { organizacao: 1, pessoa: 2, imovel: 3 } as const;
    const aTipo = a.entidade.tipo as keyof typeof ordem;
    const bTipo = b.entidade.tipo as keyof typeof ordem;
    const tipoDiff = (ordem[aTipo] || 999) - (ordem[bTipo] || 999);
    if (tipoDiff !== 0) return tipoDiff;
    return (a.entidade.nome || '').localeCompare(b.entidade.nome || '', 'pt-BR', { sensitivity: 'base' });
  });

  const handleEditStart = (id: string, entidade: any) => {
    setEditingId(id);
    setEditForm({
      nome: entidade.nome,
      identificador_1: (entidade.identificador_1 || '').replace(/[^A-Za-z0-9]/g, ''),
      identificador_2: (entidade.identificador_2 || '').replace(/[^A-Za-z0-9]/g, ''),
    });
  };

  const handleEditSave = (id: string, entidade: any) => {
    // Para imóveis, permitir salvar mesmo sem identificador_1
    if (!editForm.nome.trim() || (entidade.tipo !== 'imovel' && !editForm.identificador_1.trim())) {
      return;
    }
    onEntidadeEdit(id, {
      nome: editForm.nome,
      identificador_1: editForm.identificador_1,
      identificador_2: editForm.identificador_2 || undefined,
    });
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  // Obtém o estado local de um conflito (coluna 2)
  const getConflictLocalData = (id: string, entidade: any) => {
    return conflictLocalState[id] || {
      nome: entidade.nome,
      identificador_1: (entidade.identificador_1 || '').replace(/[^A-Za-z0-9]/g, ''),
      identificador_2: (entidade.identificador_2 || '').replace(/[^A-Za-z0-9]/g, ''),
    };
  };

  // Atualiza campo da coluna 2 (SOMENTE ESTADO LOCAL)
  const handleConflictFieldChange = (id: string, field: 'nome' | 'identificador_1' | 'identificador_2', value: string) => {
    const raw = value || '';
    const sanitized = (field === 'identificador_1' || field === 'identificador_2')
      ? raw.replace(/[^A-Za-z0-9]/g, '')
      : raw;
    
    const entidade = result.entidades.find(e => e.tempId === id);
    if (!entidade) return;
    
    const current = getConflictLocalData(id, entidade);
    setConflictLocalState(prev => ({
      ...prev,
      [id]: { ...current, [field]: sanitized }
    }));
  };

  // Copia valor da coluna 1 para coluna 2 (SOMENTE ESTADO LOCAL)
  const handleCopyFromExisting = (id: string, entidade: any, conflito: any, field: 'nome' | 'identificador_1' | 'identificador_2') => {
    const rawValue = field === 'nome' ? conflito.nome : 
                  field === 'identificador_1' ? conflito.identificador_1 : 
                  field === 'identificador_2' ? (conflito.identificador_2 || '') : '';
    const value = (field === 'identificador_1' || field === 'identificador_2')
      ? (rawValue || '').replace(/[^A-Za-z0-9]/g, '')
      : rawValue;
    
    const current = getConflictLocalData(id, entidade);
    setConflictLocalState(prev => ({
      ...prev,
      [id]: { ...current, [field]: value }
    }));
  };

  // Salvar: re-verifica mas nunca retorna conflito (só existente ou novo)
  const handleSaveConflict = (id: string) => {
    const entidade = result.entidades.find(e => e.tempId === id);
    if (!entidade) {
      return;
    }
    
    const localData = getConflictLocalData(id, entidade);
    
    // Re-verifica unicidade (skipUnicityCheck = false) mas sem permitir conflito (forceNoConflict = true)
    onEntidadeEdit(id, {
      nome: localData.nome,
      identificador_1: localData.identificador_1,
      identificador_2: localData.identificador_2,
    }, false, true);
    
    // Limpa o estado local deste conflito
    setConflictLocalState(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteId !== null) {
      onEntidadeDelete(deleteId);
      setDeleteId(null);
    }
  };
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Análise do Documento
            </CardTitle>
            <CardDescription className="mt-1">{fileName}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Data de Referência
            </div>
            <p className="text-base text-foreground">{formatDate(result.data_referencia)}</p>
          </div>

          <div className="relative">
            <Badge variant="secondary" className="absolute -top-2 left-0 text-xs">
              Filtros
            </Badge>
            <Card className="pt-6">
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                  <Tag className="h-4 w-4" />
                  Descrição do Documento
                </div>
                <p className="text-base text-foreground">{result.descricao}</p>
              </CardContent>
            </Card>
          </div>

          {sortedEntidades && sortedEntidades.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                Entidades Envolvidas
              </div>
                <div className="space-y-3">
                {sortedEntidades.map(({ entidade, id }) => (
                  <div
                    key={id}
                    className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/50 border-transparent"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(() => {
                          const IconComponent = entidade.entidade_icone 
                            ? getIconComponent(entidade.entidade_icone)
                            : FileText;
                          return (
                            <Badge variant="secondary" className="gap-1.5">
                              <IconComponent className="w-3.5 h-3.5" />
                              {entidade.entidade_nome || entidade.tipo}
                            </Badge>
                          );
                        })()}
                        {getStatusBadge(entidade)}
                      </div>

                      <div className="flex items-center gap-1">
                        {entidade.status !== "conflito" && editingId !== id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStart(id, entidade)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>


                    {editingId === id && entidade.status !== "conflito" ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Nome</label>
                          <Input
                            value={editForm.nome}
                            onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                            placeholder="Nome da entidade"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            {entidade.nome_ident_1 || 'Identificador 1'}
                          </label>
                           <Input
                              value={editForm.identificador_1}
                              onChange={(e) => setEditForm({ ...editForm, identificador_1: e.target.value.replace(/[^A-Za-z0-9]/g, '') })}
                              placeholder={entidade.tipo === 'imovel' ? 'Deixe em branco se não houver' : 'Identificador 1'}
                           />
                        </div>
                        {(editForm.identificador_2 || entidade.identificador_2) && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              {entidade.nome_ident_2 || 'Identificador 2'}
                            </label>
                            <Input
                              value={editForm.identificador_2}
                              onChange={(e) => setEditForm({ ...editForm, identificador_2: e.target.value.replace(/[^A-Za-z0-9]/g, '') })}
                              placeholder="Identificador 2"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleEditSave(id, entidade)}
                            disabled={!editForm.nome.trim() || (entidade.tipo !== 'imovel' && !editForm.identificador_1.trim())}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleEditCancel}>
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : entidade.status === "conflito" && entidade.conflitos && entidade.conflitos.length > 0 ? (
                      <div className="mt-2 p-4 rounded-md bg-yellow-500/5 border border-yellow-500/20">
                        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-4 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Conflito detectado - Use as setas para copiar campos ou edite os campos diferentes
                        </p>

                          {entidade.conflitos.map((conflito, cIdx) => {
                          // Determinar quais campos são diferentes
                          const nomeIsDifferent = !conflito.nomeMatch;
                          const id1IsDifferent = !conflito.id1Match;
                          const id2IsDifferent = !conflito.id2Match;

                          return (
                            <div key={conflito.id || cIdx} className="mb-4">
                              <div className="space-y-3">
                                {/* Cabeçalho das colunas */}
                                <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4 mb-1">
                                  <h4 className="text-xs font-semibold text-foreground">Registro Existente</h4>
                                  <div />
                                  <h4 className="text-xs font-semibold text-foreground">Registro a Importar</h4>
                                </div>

                                {/* Linha: Nome - Exibir se pelo menos um lado tiver valor */}
                                {(nomeIsDifferent || conflito.nome || entidade.nome) && (
                                  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">Nome</label>
                                      <Input value={conflito.nome || ''} disabled className="h-9 opacity-100" />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopyFromExisting(id, entidade, conflito, 'nome')}
                                      className="h-8 w-8 p-0 mt-[25px]"
                                      title="Copiar nome do registro existente"
                                    >
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">Nome</label>
                                      <Input
                                        value={getConflictLocalData(id, entidade).nome}
                                        onChange={(e) => handleConflictFieldChange(id, 'nome', e.target.value)}
                                        className="h-9"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Linha: Identificador 1 - Exibir apenas se pelo menos um lado tiver valor */}
                                {(conflito.identificador_1?.trim() || entidade.identificador_1?.trim()) && (
                                  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">{entidade.nome_ident_1 || 'Identificador 1'}</label>
                                      <Input value={(conflito.identificador_1 || '').replace(/[^A-Za-z0-9]/g, '')} disabled className="h-9 opacity-100" />
                                    </div>
                                    {conflito.identificador_1 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyFromExisting(id, entidade, conflito, 'identificador_1')}
                                        className="h-8 w-8 p-0 mt-[25px]"
                                        title="Copiar identificador 1 do registro existente"
                                      >
                                        <ArrowRight className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <div className="h-8 w-8 mt-[25px]" />
                                    )}
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">{entidade.nome_ident_1 || 'Identificador 1'}</label>
                                      <Input
                                        value={getConflictLocalData(id, entidade).identificador_1}
                                        onChange={(e) => handleConflictFieldChange(id, 'identificador_1', e.target.value)}
                                        className="h-9"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Linha: Identificador 2 - Exibir apenas se pelo menos um lado tiver valor */}
                                {(conflito.identificador_2?.trim() || entidade.identificador_2?.trim()) && (
                                  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">{entidade.nome_ident_2 || 'Identificador 2'}</label>
                                      <Input value={(conflito.identificador_2 || '').replace(/[^A-Za-z0-9]/g, '')} disabled className="h-9 opacity-100" />
                                    </div>
                                    {conflito.identificador_2 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyFromExisting(id, entidade, conflito, 'identificador_2')}
                                        className="h-8 w-8 p-0 mt-[25px]"
                                        title="Copiar identificador 2 do registro existente"
                                      >
                                        <ArrowRight className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <div className="h-8 w-8 mt-[25px]" />
                                    )}
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">{entidade.nome_ident_2 || 'Identificador 2'}</label>
                                      <Input
                                        value={getConflictLocalData(id, entidade).identificador_2}
                                        onChange={(e) => handleConflictFieldChange(id, 'identificador_2', e.target.value)}
                                        className="h-9"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Botão de Salvar */}
                                <div className="flex justify-end pt-2">
                                  {(() => {
                                    const localData = getConflictLocalData(id, entidade);
                                    const isDisabled = !localData.nome.trim();
                                    return (
                                      <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleSaveConflict(id)}
                                        className="gap-2"
                                        disabled={isDisabled}
                                      >
                                        <Check className="h-4 w-4" />
                                        Salvar
                                      </Button>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{entidade.nome}</p>
                        <div className="space-y-0.5">
                          {entidade.nome_ident_1 ? (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">{entidade.nome_ident_1}:</span>{" "}
                              {(entidade.identificador_1 || '').replace(/[^A-Za-z0-9]/g, '')}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">{(entidade.identificador_1 || '').replace(/[^A-Za-z0-9]/g, '')}</p>
                          )}
                          {entidade.identificador_2 && entidade.nome_ident_2 && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">{entidade.nome_ident_2}:</span>{" "}
                              {(entidade.identificador_2 || '').replace(/[^A-Za-z0-9]/g, '')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={onApprove} 
            className="flex-1" 
            size="lg" 
            disabled={isApproving || !selectedPasta || result.entidades.some(e => e.status === 'conflito')}
          >
            {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {isApproving ? "Salvando..." : "Aprovar e Salvar"}
          </Button>
          <Button onClick={onReject} variant="outline" size="lg" className="flex-1" disabled={isApproving}>
            <X className="mr-2 h-4 w-4" />
            Rejeitar
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entidade da análise? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
