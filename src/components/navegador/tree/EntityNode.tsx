// Localização: src/components/navegador/tree/EntityNode.tsx

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { getIconComponent } from "@/utils/iconHelper";

interface EntityNodeProps {
  entity: {
    id: string;
    nome: string;
    identificador_1: string;
    identificador_2: string | null;
    entity_type: {
      nome: string;
      nome_ident_1: string;
      nome_ident_2: string | null;
      icone: string | null;
    };
  };
  pasta: {
    isOwner: boolean;
  };
  docId: string;
  onSelectAsRoot: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EntityNode({
  entity,
  pasta,
  docId,
  onSelectAsRoot,
  onEdit,
  onDelete,
}: EntityNodeProps) {
  const IconComponent = getIconComponent(entity.entity_type.icone);

  return (
    <div className="p-2 ml-4 hover:bg-muted/50 transition-colors">
      <div
        className="cursor-pointer"
        onClick={onSelectAsRoot}
        title="Clique para reorganizar a árvore com esta entidade"
      >
        <div className="flex flex-col gap-1">
          {/* Linha 1: Ícone + Badge Tipo + Nome */}
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {entity.entity_type.nome}
            </Badge>
            <span className="text-xs truncate" title={entity.nome}>
              {entity.nome}
            </span>
          </div>

          {/* Linha 2: Espaçamento + Identificadores + Botões */}
          <div className="flex items-center gap-2">
            {/* Espaçamento invisível para alinhar com linha 1 */}
            <div className="h-4 w-4 flex-shrink-0"></div>
            <div className="invisible">
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {entity.entity_type.nome}
              </Badge>
            </div>
            
            {/* Identificadores */}
            <div className="text-xs text-muted-foreground">
              {entity.entity_type.nome_ident_1}: {entity.identificador_1}
              {entity.identificador_2 && entity.entity_type.nome_ident_2 && (
                <>
                  {" "}
                  • {entity.entity_type.nome_ident_2}:{" "}
                  {entity.identificador_2}
                </>
              )}
            </div>

            {/* Botões de Editar/Excluir - logo após identificadores */}
            {pasta.isOwner && (onEdit || onDelete) && (
              <>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    title="Editar entidade"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    title="Remover entidade do documento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}