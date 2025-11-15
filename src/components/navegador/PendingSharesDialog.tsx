import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";

interface PendingShare {
  folder_id: string;
  user_guest_id: string;
  folder: {
    descricao: string;
  };
  owner: {
    full_name: string | null;
  };
}

export function PendingSharesDialog() {
  const { user } = useAuth();
  const [currentPending, setCurrentPending] = useState<PendingShare | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkPendingShares();
    }
  }, [user]);

  const checkPendingShares = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("folder_share")
        .select(`
          folder_id,
          user_guest_id,
          usuario_criador_id,
          folder:folder (descricao)
        `)
        .eq("user_guest_id", user.id)
        .is("confirmed", null)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Buscar dados do dono
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.usuario_criador_id)
          .single();

        setCurrentPending({
          ...data,
          folder: Array.isArray(data.folder) ? data.folder[0] : data.folder,
          owner: ownerData || { full_name: null }
        } as any as PendingShare);
      }
    } catch (error) {
      console.error("Erro ao verificar compartilhamentos pendentes:", error);
    }
  };

  const handleResponse = async (accept: boolean) => {
    if (!currentPending) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("folder_share")
        .update({ confirmed: accept })
        .eq("folder_id", currentPending.folder_id)
        .eq("user_guest_id", currentPending.user_guest_id);

      if (error) throw error;

      toast.success(
        accept
          ? "Compartilhamento aceito! A pasta está disponível no navegador."
          : "Compartilhamento recusado."
      );

      setCurrentPending(null);

      // Verificar se há mais pendências após um delay
      setTimeout(() => {
        checkPendingShares();
      }, 500);
    } catch (error) {
      console.error("Erro ao processar resposta:", error);
      toast.error("Erro ao processar resposta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentPending) return null;

  const ownerName = currentPending.owner?.full_name || "Um usuário";
  const folderName = currentPending.folder?.descricao || "uma pasta";

  return (
    <Dialog open={!!currentPending} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Convite para Pasta Compartilhada
          </DialogTitle>
          <DialogDescription className="pt-4">
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">
                  <strong className="text-foreground">{ownerName}</strong> compartilhou a pasta
                </p>
                <Badge variant="secondary" className="mt-2">
                  {folderName}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Ao aceitar, você terá acesso de visualização aos documentos desta pasta.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleResponse(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Recusar
          </Button>
          <Button
            onClick={() => handleResponse(true)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Processando..." : "Aceitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}