// Localização: src/components/navegador/filters/FilterBar.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

interface Pasta {
  id: string;
  descricao: string;
  isOwner: boolean;
  ownerName?: string | null;
}

interface EntityType {
  id: string;
  nome: string;
}

interface Entity {
  id: string;
  nome: string;
  identificador_1: string;
}

interface FilterBarProps {
  pastas: Pasta[];
  entityTypes: EntityType[];
  entities: Entity[];
  selectedPasta: string;
  selectedEntidade: string;
  selectedRegistro: string;
  onPastaChange: (value: string) => void;
  onEntidadeChange: (value: string) => void;
  onRegistroChange: (value: string) => void;
  onNovaPasta: () => void;
  onEditarPasta: () => void;
  canEditPasta: boolean;
}

export function FilterBar({
  pastas,
  entityTypes,
  entities,
  selectedPasta,
  selectedEntidade,
  selectedRegistro,
  onPastaChange,
  onEntidadeChange,
  onRegistroChange,
  onNovaPasta,
  onEditarPasta,
  canEditPasta,
}: FilterBarProps) {
  return (
    <Card className="relative">
      <Badge variant="secondary" className="absolute -top-2 left-4 text-xs">
        Filtros
      </Badge>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro de Pasta */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pasta</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={selectedPasta} onValueChange={onPastaChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as pastas" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="TODOS">Todas as pastas</SelectItem>
                    {pastas.map((pasta) => (
                      <SelectItem key={pasta.id} value={pasta.id}>
                        {pasta.isOwner
                          ? pasta.descricao
                          : `${pasta.descricao} (${pasta.ownerName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onNovaPasta}
                title="Nova pasta"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onEditarPasta}
                disabled={!canEditPasta}
                title="Editar pasta"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filtro de Tipo de Entidade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Entidade</Label>
            <Select value={selectedEntidade} onValueChange={onEntidadeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="TODOS">Todos</SelectItem>
                {entityTypes.map((ent) => (
                  <SelectItem key={ent.id} value={ent.id}>
                    {ent.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Registro Específico */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Registro Específico</Label>
            <Select
              value={selectedRegistro}
              onValueChange={onRegistroChange}
              disabled={selectedEntidade === "TODOS"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um registro" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="TODOS">Todos</SelectItem>
                {entities.map((reg) => (
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
  );
}