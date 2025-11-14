// Localização: src/components/navegador/dialogs/DocumentDialogs.tsx

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DocumentDialogsProps {
  // Editar Documento
  editOpen: boolean;
  editDescricao: string;
  editData: string;
  onEditOpenChange: (open: boolean) => void;
  onEditDescricaoChange: (value: string) => void;
  onEditDataChange: (value: string) => void;
  onSaveEdit: () => void;
  
  // Excluir Documento
  deleteOpen: boolean;
  deleteFileName: string;
  deleteConfirmText: string;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteConfirmTextChange: (value: string) => void;
  onConfirmDelete: () => void;
}

export function DocumentDialogs({
  editOpen,
  editDescricao,
  editData,
  onEditOpenChange,
  onEditDescricaoChange,
  onEditDataChange,
  onSaveEdit,
  deleteOpen,
  deleteFileName,
  deleteConfirmText,
  onDeleteOpenChange,
  onDeleteConfirmTextChange,
  onConfirmDelete,
}: DocumentDialogsProps) {
  return (
    <>
      {/* Dialog de Edição */}
      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>
              Altere a descrição e a data de referência do documento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-doc-descricao">Descrição</Label>
              <Textarea
                id="edit-doc-descricao"
                value={editDescricao}
                onChange={(e) => onEditDescricaoChange(e.target.value)}
                placeholder="Descrição do documento"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doc-data">Data de Referência</Label>
              <Input
                id="edit-doc-data"
                type="date"
                value={editData}
                onChange={(e) => onEditDataChange(e.target.value)}
                className="w-fit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onEditOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onSaveEdit} disabled={!editDescricao.trim() || !editData}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O documento e todos os seus
              relacionamentos serão excluídos permanentemente.
              <br />
              <br />
              Para confirmar, digite o nome do arquivo:
              <br />
              <strong className="text-foreground">{deleteFileName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Digite o nome do arquivo"
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
              disabled={deleteConfirmText !== deleteFileName}
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