import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QueueItem {
  id: string;
  nome_arquivo: string;
  status: "aguardando" | "processando" | "finalizado" | "erro" | "duplicata_aguardando";
  mensagem_atual: string | null;
  dados_extraidos: any;
  created_at: string;
  pasta_id: string | null;
  is_duplicate: boolean;
  doc_file_id_original: string | null;
  tentativas_processamento?: number;
}

export const FilaImportacao = ({ onApprove }: { onApprove: (item: QueueItem) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    if (!user) return;

    // Carregar itens iniciais
    loadQueue();

    // Configurar Realtime
    const channel = supabase
      .channel("doc_queue_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doc_queue",
          filter: `usuario_criador_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Queue change:", payload);
          
          // Usar dados do payload diretamente para atualizações instantâneas
          if (payload.eventType === "INSERT" && payload.new) {
            setQueueItems((prev) => [payload.new as QueueItem, ...prev].slice(0, 10));
            
            // Processar automaticamente se for "aguardando"
            if (payload.new.status === "aguardando") {
              processItem(payload.new.id as string);
            }
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setQueueItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as QueueItem) : item
              )
            );
          } else if (payload.eventType === "DELETE" && payload.old) {
            setQueueItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          } else {
            // Fallback: recarregar tudo se algo der errado
            loadQueue();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadQueue = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("doc_queue")
      .select("*")
      .eq("usuario_criador_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Erro ao carregar fila:", error);
      return;
    }

    setQueueItems((data || []) as QueueItem[]);

    // Processar automaticamente apenas itens "aguardando" (não duplicatas)
    for (const item of data || []) {
      if (item.status === "aguardando") {
        processItem(item.id);
      }
    }
  };

  const processItem = async (queueId: string) => {
    try {
      console.log("Iniciando processamento do item:", queueId);

      const { data, error } = await supabase.functions.invoke("file-ingest", {
        body: { queueId },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || "Erro no processamento");
      }

      console.log("Processamento concluído:", queueId);
    } catch (error) {
      console.error("Erro ao processar item:", error);
      toast({
        title: "Erro no processamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (queueId: string) => {
    try {
      // 1. Buscar o storage_path do item antes de deletar
      const { data: queueItem, error: fetchError } = await supabase
        .from("doc_queue")
        .select("storage_path, is_duplicate")
        .eq("id", queueId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      // 2. Deletar arquivo do storage se existir (só se NÃO for duplicata)
      if (queueItem?.storage_path && !queueItem.is_duplicate) {
        const { error: storageError } = await supabase.storage.from("documentos").remove([queueItem.storage_path]);

        if (storageError) {
          console.error("Erro ao deletar arquivo do storage:", storageError);
          // Não bloquear a remoção da fila mesmo se falhar no storage
        }
      }

      // 3. Deletar da fila
      const { error: deleteError } = await supabase.from("doc_queue").delete().eq("id", queueId);

      if (deleteError) {
        throw deleteError;
      }

      // 4. Atualização otimista: remover do estado local imediatamente
      setQueueItems((prev) => prev.filter((item) => item.id !== queueId));

      toast({
        title: "Removido",
        description: "Documento removido da fila",
      });
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProcessDuplicate = async (queueId: string) => {
    toast({
      title: "Processando",
      description: "Iniciando processamento do documento...",
    });
    await processItem(queueId);
  };

  if (queueItems.length === 0) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Fila de Análise</CardTitle>
        <CardDescription>
          {queueItems.length} {queueItems.length === 1 ? "documento" : "documentos"} na fila (máximo 5)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {queueItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {item.is_duplicate && (
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded shrink-0">Duplicata</span>
              )}
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.nome_arquivo}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {item.mensagem_atual ||
                      (item.is_duplicate ? "Duplicata - aguardando processamento manual" : "Aguardando...")}
                  </p>
                  {(item.tentativas_processamento || 0) > 1 && (
                    <span className="text-xs text-muted-foreground">(Tentativa {item.tentativas_processamento}/3)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.status === "duplicata_aguardando" && (
                <>
                  <Button variant="default" size="sm" onClick={() => handleProcessDuplicate(item.id)}>
                    Processar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(item.id)}>
                    Cancelar
                  </Button>
                </>
              )}
              {item.status === "aguardando" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              {item.status === "processando" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(item.id)}>
                    Cancelar
                  </Button>
                </>
              )}
              {item.status === "finalizado" && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Button variant="default" size="sm" onClick={() => onApprove(item)}>
                    Aprovar
                  </Button>
                </>
              )}
              {item.status === "erro" && (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(item.id)}>
                    Remover
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
