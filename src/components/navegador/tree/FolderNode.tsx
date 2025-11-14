// Localização: src/components/navegador/tree/FolderNode.tsx

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Sparkles,
  Share2,
} from "lucide-react";

interface FolderNodeProps {
  pasta: {
    id: string;
    descricao: string;
    isOwner: boolean;
    ownerName?: string | null;
  };
  documentCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAnalysis: () => void;
  onShare?: () => void;
  children?: ReactNode;
}

export function FolderNode({
  pasta,
  documentCount,
  isExpanded,
  onToggle,
  onAnalysis,
  onShare,
  children,
}: FolderNodeProps) {
  return (
    <div>
      <div
        className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer select-none"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-primary flex-shrink-0" />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">
            {pasta.isOwner
              ? pasta.descricao
              : `${pasta.descricao} (${pasta.ownerName})`}
          </span>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {documentCount}
          </Badge>

          {/* Análise AI - SEMPRE VISÍVEL */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onAnalysis();
            }}
            title="Analisar pasta com IA"
          >
            <Sparkles className="h-3 w-3" />
          </Button>

          {/* Compartilhar - APENAS PARA OWNER */}
          {pasta.isOwner && onShare && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              title="Compartilhar pasta"
            >
              <Share2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && children && (
        <div className="border-l-2 border-border ml-2">{children}</div>
      )}
    </div>
  );
}