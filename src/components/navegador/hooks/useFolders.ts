// Localização: src/components/navegador/hooks/useFolders.ts

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Pasta {
  id: string;
  descricao: string;
  created_at: string;
  updated_at: string;
  usuario_criador_id: string;
  isOwner: boolean;
  ownerName?: string | null;
}

export function useFolders() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Pasta[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFolders = useCallback(async () => {
    if (!user) {
      setFolders([]);
      return;
    }

    setLoading(true);

    try {
      // Buscar pastas próprias
      const { data: ownFolders, error: ownError } = await supabase
        .from("folder")
        .select("id, descricao, created_at, updated_at, usuario_criador_id")
        .eq("usuario_criador_id", user.id)
        .order("descricao", { ascending: true });

      if (ownError) throw ownError;

      // Buscar pastas compartilhadas CONFIRMADAS com nome do owner
      const { data: sharedFolders, error: sharedError } = await supabase
        .from("folder_share")
        .select(`
          folder_id,
          folder:folder_id (
            id,
            descricao,
            created_at,
            updated_at,
            usuario_criador_id
          ),
          owner:profiles!usuario_criador_id (
            full_name
          )
        `)
        .eq("user_guest_id", user.id)
        .eq("confirmed", true);

      if (sharedError) throw sharedError;

      // Combinar pastas próprias e compartilhadas
      const ownWithFlag: Pasta[] = (ownFolders || []).map((f) => ({
        ...f,
        isOwner: true,
        ownerName: null,
      }));

      const sharedWithFlag: Pasta[] = (sharedFolders || [])
        .filter((sf: any) => sf.folder)
        .map((sf: any) => ({
          ...sf.folder,
          isOwner: false,
          ownerName: sf.owner?.full_name || "Usuário",
        }));

      const allFolders = [...ownWithFlag, ...sharedWithFlag].sort((a, b) =>
        a.descricao.localeCompare(b.descricao)
      );

      setFolders(allFolders);
    } catch (error) {
      console.error("Erro ao carregar pastas:", error);
      toast.error("Erro ao carregar pastas");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createFolder = useCallback(
    async (descricao: string) => {
      if (!user) return;

      // Validação: verificar se já existe pasta com mesma descrição
      const descricaoExistente = folders.some(
        (p) => p.descricao.toLowerCase().trim() === descricao.toLowerCase().trim()
      );

      if (descricaoExistente) {
        toast.error("Já existe uma pasta com essa descrição");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("folder")
          .insert({ descricao: descricao.trim(), usuario_criador_id: user.id })
          .select()
          .single();

        if (error) throw error;

        toast.success("Pasta criada com sucesso");
        await loadFolders();
        return data.id;
      } catch (error) {
        console.error("Erro ao criar pasta:", error);
        toast.error("Erro ao criar pasta");
      }
    },
    [user, folders, loadFolders]
  );

  const updateFolder = useCallback(
    async (id: string, descricao: string) => {
      try {
        const { error } = await supabase
          .from("folder")
          .update({ descricao: descricao.trim() })
          .eq("id", id);

        if (error) throw error;

        toast.success("Pasta atualizada com sucesso");
        await loadFolders();
      } catch (error) {
        console.error("Erro ao atualizar pasta:", error);
        toast.error("Erro ao atualizar pasta");
      }
    },
    [loadFolders]
  );

  return {
    folders,
    loading,
    loadFolders,
    createFolder,
    updateFolder,
  };
}