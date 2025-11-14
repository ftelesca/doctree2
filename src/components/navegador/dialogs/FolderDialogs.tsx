// Localização: src/components/navegador/dialogs/FolderDialogs.tsx

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FolderDialogsProps {
  // Nova Pasta
  novaPastaOpen: boolean;
  novaPastaDescricao: string;
  onNovaPastaOpenChange: (open: boolean) => void;
  onNovaPastaDescricaoChange: (value: string) => void;
  onCreatePasta: () => void;
  
  // Editar Pasta
  editPastaOpen: boolean;
  editPastaDescricao: string;
  onEditPastaOpenChange: (open: boolean) => void;
  onEditPastaDescricaoChange: (value: string) => void;
  onUpdatePasta: () => void;
}

export function FolderDialogs({
  novaPastaOpen,
  novaPastaDescricao,
  onNovaPastaOpenChange,
  onNovaPastaDescricaoChange,
  onCreatePasta,
  editPastaOpen,
  editPastaDescricao,
  onEditPastaOpenChange,
  onEditPastaDescricaoChange,
  onUpdatePasta,
}: FolderDialogsProps) {
  return (
    <>
      {/* Dialog Nova Pasta */}
      <Dialog open={novaPastaOpen} onOpenChange={onNovaPastaOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>
              Crie uma nova pasta para organizar seus documentos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nova-pasta-descricao">Descrição da Pasta</Label>
              <Input
                id="nova-pasta-descricao"
                value={novaPastaDescricao}
                onChange={(e) => onNovaPastaDescricaoChange(e.target.value)}
                placeholder="Ex: Contratos 2024"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novaPastaDescricao.trim()) {
                    onCreatePasta();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onNovaPastaOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onCreatePasta} disabled={!novaPastaDescricao.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Pasta */}
      <Dialog open={editPastaOpen} onOpenChange={onEditPastaOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pasta</DialogTitle>
            <DialogDescription>
              Altere a descrição da pasta selecionada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pasta-descricao">Descrição da Pasta</Label>
              <Input
                id="edit-pasta-descricao"
                value={editPastaDescricao}
                onChange={(e) => onEditPastaDescricaoChange(e.target.value)}
                placeholder="Ex: Contratos 2024"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editPastaDescricao.trim()) {
                    onUpdatePasta();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onEditPastaOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onUpdatePasta} disabled={!editPastaDescricao.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}