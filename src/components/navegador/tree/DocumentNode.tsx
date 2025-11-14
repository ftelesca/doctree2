// Localização: src/components/navegador/tree/DocumentNode.tsx

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Edit,
  Trash2,
} from "lucide-react";

interface DocumentNodeProps {
  documento: {
    id: string;
    descricao: string;
    data_referencia: string;
    doc_entity?: any[];
  };
  pasta: {
    isOwner: boolean;
  };
  entityCount: number;
  hasEntities: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: ReactNode;
}

export function DocumentNode({
  documento,
  pasta,
  entityCount,
  hasEntities,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  children,
}: DocumentNodeProps) {
  return (
    <div>
      <div
        className={`flex items-start gap-2 p-2 hover:bg-muted/50 ml-4 ${
          isSelected ? "bg-primary/10 border-l-2 border-primary" : ""
        }`}
      >
        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
          onClick={() => {
            onToggle();
            onSelect();
          }}
        >
          {hasEntities ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 flex-shrink-0 mt-0.5" />
            ) : (
              <ChevronRight className="h-3 w-3 flex-shrink-0 mt-0.5" />
            )
          ) : (
            <div className="w-3 h-3 flex-shrink-0" />
          )}
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium break-words">
              {documento.descricao}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {(() => {
                  const [y, m, d] = documento.data_referencia
                    .slice(0, 10)
                    .split("-");
                  return `${d}/${m}/${y}`;
                })()}
              </span>
              {entityCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {entityCount}
                </Badge>
              )}
              {pasta.isOwner && (
                <>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      title="Editar documento"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 flex-shrink-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      title="Excluir documento"
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

      {isExpanded && hasEntities && children && (
        <div className="border-l-2 border-border ml-6 bg-muted/20">
          {children}
        </div>
      )}
    </div>
  );
}