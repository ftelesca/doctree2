import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Edit } from "lucide-react";

interface EntityEditorProps {
  entidade: {
    id: string;
    nome: string;
    identificador_1: string;
    identificador_2: string | null;
    entity_type: {
      nome: string;
      nome_ident_1: string | null;
      nome_ident_2: string | null;
    };
  };
  onSave: (data: { nome: string; identificador_1: string; identificador_2?: string }) => Promise<void>;
}

export function EntityEditor({ entidade, onSave }: EntityEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: entidade.nome,
    identificador_1: (entidade.identificador_1 || "").replace(/[^A-Za-z0-9]/g, ""),
    identificador_2: (entidade.identificador_2 || "").replace(/[^A-Za-z0-9]/g, ""),
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleEditStart = () => {
    setIsEditing(true);
    setEditForm({
      nome: entidade.nome,
      identificador_1: (entidade.identificador_1 || "").replace(/[^A-Za-z0-9]/g, ""),
      identificador_2: (entidade.identificador_2 || "").replace(/[^A-Za-z0-9]/g, ""),
    });
  };

  const handleEditSave = async () => {
    if (!editForm.nome.trim() || !editForm.identificador_1.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        nome: editForm.nome,
        identificador_1: editForm.identificador_1,
        identificador_2: editForm.identificador_2 || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate" title={entidade.nome}>
              {entidade.nome}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {entidade.entity_type.nome_ident_1 || "ID"}:{" "}
            {(entidade.identificador_1 || "").replace(/[^A-Za-z0-9]/g, "")}
            {entidade.identificador_2 && entidade.entity_type.nome_ident_2 && (
              <>
                {" "}
                • {entidade.entity_type.nome_ident_2}:{" "}
                {(entidade.identificador_2 || "").replace(/[^A-Za-z0-9]/g, "")}
              </>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleEditStart}
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
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
          {entidade.entity_type.nome_ident_1 || "Identificador 1"}
        </label>
        <Input
          value={editForm.identificador_1}
          onChange={(e) =>
            setEditForm({ ...editForm, identificador_1: e.target.value.replace(/[^A-Za-z0-9]/g, "") })
          }
          placeholder="Identificador 1"
        />
      </div>
      {(editForm.identificador_2 || entidade.identificador_2) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {entidade.entity_type.nome_ident_2 || "Identificador 2"}
          </label>
          <Input
            value={editForm.identificador_2}
            onChange={(e) =>
              setEditForm({ ...editForm, identificador_2: e.target.value.replace(/[^A-Za-z0-9]/g, "") })
            }
            placeholder="Identificador 2"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleEditSave}
          disabled={!editForm.nome.trim() || !editForm.identificador_1.trim() || isSaving}
        >
          <Check className="h-4 w-4 mr-1" />
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleEditCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
