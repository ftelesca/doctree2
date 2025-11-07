import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AnalysisResult {
  resumo_executivo: string;
  cronologia: Array<{
    data: string;
    evento: string;
    relevancia?: string;
  }>;
  entidades_chave: Array<{
    nome: string;
    tipo: string;
    relevancia: string;
    documentos?: number;
  }>;
  relacionamentos: Array<{
    entidade_1?: string;
    entidade_2?: string;
    tipo_relacao?: string;
    contexto?: string;
    descricao?: string;
  }>;
  insights: Array<string | {
    titulo: string;
    descricao: string;
    prioridade: 'alta' | 'media' | 'baixa';
  }>;
}

// Função para normalizar dados da análise vindos em diferentes formatos
function normalizeAnalysis(raw: any): AnalysisResult {
  return {
    resumo_executivo: raw?.resumo_executivo || raw?.resumo || "",
    
    cronologia: (raw?.cronologia || []).map((item: any) => ({
      data: item?.data || item?.date || "",
      evento: item?.evento || item?.descricao || item?.titulo || "",
      relevancia: item?.relevancia || item?.nivel || undefined,
    })),
    
    entidades_chave: (raw?.entidades_chave || []).map((item: any) => {
      let documentos: number | undefined = undefined;
      
      if (typeof item?.documentos === 'number') {
        documentos = item.documentos;
      } else if (Array.isArray(item?.documentos)) {
        documentos = item.documentos.length;
      } else if (typeof item?.frequencia === 'number') {
        documentos = item.frequencia;
      }
      
      return {
        nome: item?.nome || "",
        tipo: item?.tipo || "",
        relevancia: item?.relevancia || item?.papel || item?.descricao || "",
        documentos,
      };
    }),
    
    relacionamentos: (raw?.relacionamentos || []).map((item: any) => ({
      entidade_1: item?.entidade_1 || undefined,
      entidade_2: item?.entidade_2 || undefined,
      tipo_relacao: item?.tipo_relacao || item?.tipo || undefined,
      contexto: item?.contexto || undefined,
      descricao: item?.descricao || undefined,
    })),
    
    insights: (raw?.insights || []).map((item: any) => {
      if (typeof item === 'string') {
        return item;
      }
      return {
        titulo: item?.titulo || "",
        descricao: item?.descricao || "",
        prioridade: item?.prioridade || 'media',
      };
    }),
  };
}

type DialogState = "idle" | "loading" | "success" | "error";

const PROGRESS_MESSAGES = [
  "Conectando à IA...",
  "Analisando documentos da pasta...",
  "Identificando entidades e relacionamentos...",
  "Gerando insights e cronologia...",
  "Finalizando análise...",
];

interface AnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName: string;
}

export function AnalysisDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
}: AnalysisDialogProps) {
  const [state, setState] = useState<DialogState>("idle");
  const [progressMessage, setProgressMessage] = useState("");
  const [progressIndex, setProgressIndex] = useState(0);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open && folderId) {
      startAnalysis();
    } else {
      // Reset state when dialog closes
      setState("idle");
      setProgressIndex(0);
      setAnalysisData(null);
      setErrorMessage("");
    }
  }, [open, folderId]);

  useEffect(() => {
    if (state === "loading") {
      const interval = setInterval(() => {
        setProgressIndex((prev) => {
          const next = prev + 1;
          if (next < PROGRESS_MESSAGES.length) {
            setProgressMessage(PROGRESS_MESSAGES[next]);
            return next;
          }
          return prev;
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [state]);

  const startAnalysis = async () => {
    if (!folderId) return;

    setState("loading");
    setProgressIndex(0);
    setProgressMessage(PROGRESS_MESSAGES[0]);

    try {
      const { data, error } = await supabase.functions.invoke("analisar-pasta", {
        body: { folder_id: folderId },
      });

      console.log("Resposta da análise:", data);

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.status === 429) {
          setErrorMessage("Muitas requisições. Tente novamente em alguns instantes.");
        } else if (data.status === 402) {
          setErrorMessage("Créditos de IA esgotados. Adicione créditos nas configurações.");
        } else {
          setErrorMessage(data.error || "Erro ao processar análise.");
        }
        setState("error");
        return;
      }

      // A edge function retorna { analise: AnalysisResult }
      const rawAnalysis = data?.analise || data;
      console.log("Dados brutos da análise:", rawAnalysis);
      
      // Normalizar os dados para garantir estrutura consistente
      const normalizedData = normalizeAnalysis(rawAnalysis);
      console.log("Dados normalizados:", normalizedData);
      
      setAnalysisData(normalizedData);
      setState("success");
    } catch (error: any) {
      console.error("Error analyzing folder:", error);
      
      if (error.message?.includes("fetch")) {
        setErrorMessage("Erro de conexão. Verifique sua internet.");
      } else {
        setErrorMessage("Erro ao processar análise. Tente novamente.");
      }
      setState("error");
      
      toast({
        title: "Erro na análise",
        description: errorMessage || "Não foi possível completar a análise.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Análise de Pasta: {folderName}</DialogTitle>
        </DialogHeader>

        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">{progressMessage}</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <p className="text-destructive font-medium">{errorMessage}</p>
          </div>
        )}

        {state === "success" && analysisData && (
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="cronologia">Cronologia</TabsTrigger>
              <TabsTrigger value="entidades">Entidades</TabsTrigger>
              <TabsTrigger value="relacionamentos">Relações</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Resumo Executivo</h3>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {analysisData.resumo_executivo}
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="cronologia" className="space-y-4">
              <div className="space-y-3">
                {(analysisData.cronologia || []).map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-4">
                      <Badge variant="outline" className="flex-shrink-0">
                        {item.data || "—"}
                      </Badge>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{item.evento || "—"}</p>
                        {item.relevancia && (
                          <p className="text-sm text-muted-foreground">{item.relevancia}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="entidades" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {(analysisData.entidades_chave || []).map((entidade, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{entidade.nome}</h4>
                        <Badge variant="secondary">{entidade.tipo}</Badge>
                      </div>
                      <Separator />
                      <p className="text-sm text-muted-foreground">{entidade.relevancia}</p>
                      {entidade.documentos !== undefined && entidade.documentos !== null && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Documentos:</span>
                          <Badge variant="outline" className="text-xs">
                            {entidade.documentos}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="relacionamentos" className="space-y-4">
              <div className="space-y-3">
                {(analysisData.relacionamentos || []).map((rel, index) => (
                  <Card key={index} className="p-4">
                    {rel.descricao ? (
                      <p className="text-foreground leading-relaxed">{rel.descricao}</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default">{rel.entidade_1 || "—"}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="secondary">{rel.tipo_relacao || "—"}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="default">{rel.entidade_2 || "—"}</Badge>
                        </div>
                        {rel.contexto && (
                          <p className="text-sm text-muted-foreground">{rel.contexto}</p>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="space-y-3">
                {(analysisData.insights || []).map((insight, index) => (
                  <Card key={index} className="p-4">
                    {typeof insight === 'string' ? (
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="flex-shrink-0 mt-1">
                          {index + 1}
                        </Badge>
                        <p className="text-foreground leading-relaxed">{insight}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Badge 
                            variant={
                              insight.prioridade === 'alta' ? 'destructive' :
                              insight.prioridade === 'media' ? 'default' : 'secondary'
                            }
                            className="flex-shrink-0 mt-1"
                          >
                            {insight.prioridade}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-semibold">{insight.titulo}</p>
                            <p className="text-sm text-muted-foreground mt-1">{insight.descricao}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
