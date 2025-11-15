import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X, FileText } from "lucide-react";

interface PdfViewerProps {
  document: {
    storage_path: string;
    nome_arquivo: string;
    descricao: string;
    data_referencia: string;
  } | null;
  onClose: () => void;
  onDownload: (path: string, name: string) => void;
}

export function PdfViewer({ document, onClose, onDownload }: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setError(null);
      return;
    }

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      try {
        const { data, error } = await supabase.storage
          .from("documentos")
          .download(document.storage_path);

        if (error) {
          throw new Error("Erro ao baixar o documento");
        }

        const url = URL.createObjectURL(data);
        setPdfUrl(url);
      } catch (err) {
        console.error("Erro ao carregar PDF:", err);
        setError("Não foi possível carregar o documento");
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [document?.storage_path]);

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 pb-4">
        <FileText className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-sm font-medium">Selecione um documento para visualizar</p>
        <p className="text-xs mt-2 text-center">
          Clique em qualquer documento na árvore à esquerda
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Fixo */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3
              className="font-medium text-sm truncate"
              title={document.nome_arquivo}
            >
              {document.nome_arquivo}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {(() => {
                  const [y, m, d] = document.data_referencia
                    .slice(0, 10)
                    .split("-");
                  return `${d}/${m}/${y}`;
                })()}
              </span>
              <Badge variant="secondary" className="text-xs">
                PDF
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {document.descricao}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                onDownload(document.storage_path, document.nome_arquivo)
              }
              title="Baixar documento"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Fechar visualização"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Área de Visualização do PDF */}
      <div className="flex-1 relative bg-muted/30 mb-4">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Carregando documento...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-destructive">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  if (document) {
                    // Força reload
                    const temp = document;
                    onClose();
                    setTimeout(() => {
                      // Isso disparará o useEffect novamente
                    }, 100);
                  }
                }}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={document.nome_arquivo}
          />
        ) : null}
      </div>
    </div>
  );
}