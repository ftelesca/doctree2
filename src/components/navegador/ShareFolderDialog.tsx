import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Share2, Trash2, CheckCircle, Clock, XCircle } from "lucide-react";

interface ShareFolderDialogProps {
  folder: { id: string; descricao: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExistingShare {
  id: string;
  user_guest_id: string;
  confirmed: boolean | null;
  guest: {
    full_name: string | null;
    email?: string;
  };
}

const emailSchema = z.string()
  .email({ message: "Email inválido" })
  .trim()
  .toLowerCase();

export function ShareFolderDialog({ folder, open, onOpenChange }: ShareFolderDialogProps) {
  const { user } = useAuth();
  const [shares, setShares] = useState<ExistingShare[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(false);

  useEffect(() => {
    if (open && folder) {
      loadShares();
    }
  }, [open, folder]);

  const loadShares = async () => {
    if (!folder) return;

    setLoadingShares(true);
    try {
      // Buscar compartilhamentos existentes
      const { data, error } = await supabase
        .from("folder_share")
        .select(
          `
          id,
          user_guest_id,
          confirmed,
          guest:profiles!user_guest_id (
            full_name
          )
        `
        )
        .eq("folder_id", folder.id);

      if (error) throw error;

      // Buscar emails dos usuários
      const sharesWithEmails = await Promise.all(
        (data || []).map(async (share: any) => {
          const { data: emailData } = await supabase.rpc("get_user_email_by_id", {
            user_uuid: share.user_guest_id,
          });

          return {
            ...share,
            guest: {
              ...share.guest,
              email: emailData || "Email não disponível",
            },
          };
        })
      );

      setShares(sharesWithEmails as ExistingShare[]);
    } catch (error) {
      console.error("Erro ao carregar compartilhamentos:", error);
      toast.error("Erro ao carregar compartilhamentos");
    } finally {
      setLoadingShares(false);
    }
  };

  const handleAddShare = async () => {
    if (!folder || !user) return;

    // Validar email
    const validation = emailSchema.safeParse(newEmail);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const validatedEmail = validation.data;

    // Validar não compartilhar consigo mesmo
    const { data: currentUserEmail } = await supabase.rpc("get_user_email_by_id", {
      user_uuid: user.id,
    });

    if (validatedEmail === currentUserEmail?.toLowerCase()) {
      toast.error("Você não pode compartilhar uma pasta com você mesmo");
      return;
    }

    // Verificar se já está compartilhado
    const alreadyShared = shares.some(
      (s) => s.guest.email?.toLowerCase() === validatedEmail
    );

    if (alreadyShared) {
      toast.error("Esta pasta já está compartilhada com este usuário");
      return;
    }

    setLoading(true);

    try {
      // Buscar ID do usuário pelo email
      const { data: guestUserId, error: userError } = await supabase.rpc(
        "get_user_id_by_email",
        { user_email: validatedEmail }
      );

      if (userError) throw userError;

      if (!guestUserId) {
        toast.error(
          "Usuário não encontrado. Ele precisa estar cadastrado no DocTree para receber compartilhamentos."
        );
        return;
      }

      // Criar compartilhamento com confirmed=null
      const { error: shareError } = await supabase.from("folder_share").insert({
        folder_id: folder.id,
        user_guest_id: guestUserId,
        usuario_criador_id: user.id,
        confirmed: null,
      });

      if (shareError) throw shareError;

      toast.success(
        "Compartilhamento criado! O usuário será notificado no próximo login."
      );
      setNewEmail("");
      await loadShares();
    } catch (error: any) {
      console.error("Erro ao compartilhar pasta:", error);
      if (error.code === "23505") {
        toast.error("Esta pasta já está compartilhada com este usuário");
      } else {
        toast.error("Erro ao compartilhar pasta");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      const { error } = await supabase.from("folder_share").delete().eq("id", shareId);

      if (error) throw error;

      toast.success("Compartilhamento removido");
      await loadShares();
    } catch (error) {
      console.error("Erro ao remover compartilhamento:", error);
      toast.error("Erro ao remover compartilhamento");
    }
  };

  const getStatusBadge = (confirmed: boolean | null) => {
    if (confirmed === null) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pendente
        </Badge>
      );
    }
    if (confirmed) {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Confirmado
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Recusado
      </Badge>
    );
  };

  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Pasta
          </DialogTitle>
          <DialogDescription>
            Compartilhe "{folder.descricao}" com outros usuários do DocTree
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lista de compartilhamentos existentes */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Compartilhado com:</Label>
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-2">
                  {loadingShares ? (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      Carregando...
                    </div>
                  ) : (
                    shares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {share.guest.full_name || "Nome não disponível"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {share.guest.email}
                          </p>
                          <div className="mt-1">{getStatusBadge(share.confirmed)}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteShare(share.id)}
                          title="Remover compartilhamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Adicionar novo compartilhamento */}
          <div className="space-y-2">
            <Label htmlFor="share-email">Email do usuário</Label>
            <div className="flex gap-2">
              <Input
                id="share-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newEmail.trim()) {
                    handleAddShare();
                  }
                }}
                disabled={loading}
              />
              <Button onClick={handleAddShare} disabled={loading || !newEmail.trim()}>
                {loading ? "..." : "Adicionar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O usuário precisa estar cadastrado no DocTree
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}