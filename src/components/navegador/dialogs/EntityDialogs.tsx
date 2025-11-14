// Localização: src/components/navegador/dialogs/EntityDialogs.tsx

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EntityDialogsProps {
  // Editar Entidade
  editOpen: boolean;
  editNome: string;
  editIdent1: string;
  editIdent2: string;
  hasIdent2: boolean;
  nomeIdent1: string;
  nomeIdent2: string | null;
  onEditOpenChange: (open: boolean) => void;
  onEditNomeChange: (value: string) => void;
  onEditIdent1Change: (value: string) => void;
  onEditIdent2Change: (value: string) => void;
  onSaveEdit: () => void;

  // Excluir Entidade
  deleteOpen: boolean;
  deleteEntityName: string;
  deleteConfirmText: string;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteConfirmTextChange: (value: string) => void;
  onConfirmDelete: () => void;
}

export function EntityDialogs({
  editOpen,
  editNome,
  editIdent1,
  editIdent2,
  hasIdent2,
  nomeIdent1,
  nomeIdent2,
  onEditOpenChange,
  onEditNomeChange,
  onEditIdent1Change,
  onEditIdent2Change,
  onSaveEdit,
  deleteOpen,
  deleteEntityName,
  deleteConfirmText,
  onDeleteOpenChange,
  onDeleteConfirmTextChange,
  onConfirmDelete,
}: EntityDialogsProps) {
  return (
    <>
      {/* Dialog de Edição de Entidade */}
      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entidade</DialogTitle>
            <DialogDescription>
              Altere as informações da entidade selecionada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-entity-nome">Nome</Label>
              <Input
                id="edit-entity-nome"
                value={editNome}
                onChange={(e) => onEditNomeChange(e.target.value)}
                placeholder="Nome da entidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity-ident1">
                {nomeIdent1 || "Identificador 1"}
              </Label>
              <Input
                id="edit-entity-ident1"
                value={editIdent1}
                onChange={(e) => onEditIdent1Change(e.target.value)}
                placeholder={nomeIdent1 || "Identificador 1"}
              />
            </div>
            {hasIdent2 && (
              <div className="space-y-2">
                <Label htmlFor="edit-entity-ident2">
                  {nomeIdent2 || "Identificador 2"}
                </Label>
                <Input
                  id="edit-entity-ident2"
                  value={editIdent2}
                  onChange={(e) => onEditIdent2Change(e.target.value)}
                  placeholder={nomeIdent2 || "Identificador 2"}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onEditOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={onSaveEdit}
              disabled={!editNome.trim() || !editIdent1.trim() || (hasIdent2 && !editIdent2.trim())}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Exclusão de Entidade */}
      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Entidade</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a entidade deste documento. Se não houver outros
              vínculos, a entidade será excluída permanentemente.
              <br />
              <br />
              Para confirmar, digite o nome da entidade:
              <br />
              <strong className="text-foreground">{deleteEntityName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Digite o nome da entidade"
              value={deleteConfirmText}
              onChange={(e) => onDeleteConfirmTextChange(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onDeleteConfirmTextChange("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={deleteConfirmText !== deleteEntityName}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
