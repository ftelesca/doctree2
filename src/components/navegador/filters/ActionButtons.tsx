// Localização: src/components/navegador/filters/ActionButtons.tsx

import { Button } from "@/components/ui/button";
import { ArrowUpDown, X, Plus } from "lucide-react";

interface EntityRaiz {
  id: string;
  nome: string;
  tipo: string;
  icone: string | null;
}

interface ActionButtonsProps {
  ordenacaoDesc: boolean;
  entidadeRaiz: EntityRaiz | null;
  onOrdenacaoChange: () => void;
  onVoltarPastas: () => void;
  onImportar: () => void;
}

export function ActionButtons({
  ordenacaoDesc,
  entidadeRaiz,
  onOrdenacaoChange,
  onVoltarPastas,
  onImportar,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        variant="outline"
        onClick={onOrdenacaoChange}
        className="gap-2 h-10"
      >
        <ArrowUpDown className="h-4 w-4" />
        {ordenacaoDesc ? "Mais recentes" : "Mais antigas"}
      </Button>

      {entidadeRaiz && (
        <Button variant="outline" onClick={onVoltarPastas} className="h-10">
          <X className="h-4 w-4 mr-2" />
          Voltar para visualização por pastas
        </Button>
      )}

      <Button onClick={onImportar} className="h-10 ml-auto">
        <Plus className="mr-2 h-4 w-4" />
        Importar Documento
      </Button>
    </div>
  );
}