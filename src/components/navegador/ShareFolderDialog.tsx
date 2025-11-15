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
  folder_id: string;
  user_guest_id: string | null;
  guest_email: string | null;
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
          folder_id,
          user_guest_id,
          guest_email,
          confirmed,
          guest:profiles!user_guest_id (
            full_name
          )
        `
        )
        .eq("folder_id", folder.id);

      if (error) throw error;

      // Processar compartilhamentos (existentes e pendentes)
      const sharesWithEmails = await Promise.all(
        (data || []).map(async (share: any) => {
          if (share.user_guest_id) {
            // Usuário existente - buscar email
      const { data: emailData } = await (supabase as any).rpc("get_user_email_by_id", {
        user_uuid: share.user_guest_id,
      });

            return {
              ...share,
              guest: {
                ...share.guest,
                email: emailData || "Email não disponível",
              },
            };
          } else if (share.guest_email) {
            // Usuário convidado (ainda não cadastrado)
            return {
              ...share,
              guest: {
                full_name: "Usuário convidado",
                email: share.guest_email,
              },
            };
          }

          return share;
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
    const { data: currentUserEmail } = await (supabase as any).rpc("get_user_email_by_id", {
      user_uuid: user.id,
    });

    if (validatedEmail === ((currentUserEmail as string) || "").toLowerCase()) {
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
      // Tentar buscar ID do usuário pelo email
      const { data: guestUserId } = await (supabase as any).rpc(
        "get_user_id_by_email",
        { user_email: validatedEmail }
      );

      if (guestUserId) {
        // Usuário existe - criar compartilhamento com user_guest_id
        const { error: shareError } = await (supabase as any)
          .from("folder_share")
          .insert([{
            folder_id: folder.id,
            user_guest_id: guestUserId,
            guest_email: validatedEmail,
            usuario_criador_id: user.id,
            confirmed: null,
          }]);

        if (shareError) throw shareError;

        toast.success(
          "Compartilhamento criado! O usuário será notificado no próximo login."
        );
      } else {
        // Usuário não existe - criar compartilhamento com guest_email
        const { error: shareError } = await (supabase as any)
          .from("folder_share")
          .insert([{
            folder_id: folder.id,
            guest_email: validatedEmail,
            usuario_criador_id: user.id,
            confirmed: null,
          }]);

        if (shareError) throw shareError;

        // Enviar email de convite via edge function
        try {
          const { data: inviteData, error: inviteError } = await supabase.functions.invoke(
            "invite-user",
            {
              body: {
                email: validatedEmail,
                folder_id: folder.id,
                folder_name: folder.descricao,
                invited_by_id: user.id,
              },
            }
          );

          if (inviteError) {
            console.error("Erro ao enviar email de convite:", inviteError);
            console.error("Response data:", inviteData);
            toast.warning(
              "Compartilhamento criado! Porém não foi possível enviar o email de convite. Verifique o console para mais detalhes."
            );
          } else {
            console.log("Invite sent successfully:", inviteData);
            toast.success(
              "Convite enviado! O usuário receberá um email para se cadastrar no DocTree."
            );
          }
        } catch (inviteError) {
          console.error("Erro ao enviar email de convite:", inviteError);
          toast.warning(
            "Compartilhamento criado! Porém não foi possível enviar o email de convite."
          );
        }
      }

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

  const handleDeleteShare = async (share: ExistingShare) => {
    try {
      let query = supabase
        .from("folder_share")
        .delete()
        .eq("folder_id", share.folder_id);

      // Use user_guest_id or guest_email depending on which is set
      if (share.user_guest_id) {
        query = query.eq("user_guest_id", share.user_guest_id);
      } else if (share.guest_email) {
        query = query.eq("guest_email", share.guest_email);
      }

      const { error } = await query;

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
                        key={`${share.folder_id}:${share.user_guest_id ?? share.guest_email}`}
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
                          onClick={() => handleDeleteShare(share)}
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
              Se o usuário não estiver cadastrado, receberá um convite por email
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