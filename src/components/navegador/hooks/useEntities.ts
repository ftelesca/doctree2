// Localização: src/components/navegador/hooks/useEntities.ts

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EntityType {
  id: string;
  nome: string;
}

export interface Entity {
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
}

export interface SimpleEntity {
  id: string;
  nome: string;
  identificador_1: string;
}

export function useEntities() {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entities, setEntities] = useState<SimpleEntity[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEntityTypes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("entity_type")
        .select("id, nome")
        .order("nome");

      if (error) throw error;

      setEntityTypes(data || []);
    } catch (error) {
      console.error("Erro ao carregar tipos de entidade:", error);
      toast.error("Erro ao carregar tipos de entidade");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEntitiesByType = useCallback(async (typeId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("entity")
        .select("id, nome, identificador_1")
        .eq("entity_type_id", typeId)
        .order("nome");

      if (error) throw error;

      setEntities(data || []);
    } catch (error) {
      console.error("Erro ao carregar entidades:", error);
      toast.error("Erro ao carregar entidades");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEntity = useCallback(
    async (
      id: string,
      updates: {
        nome?: string;
        identificador_1?: string;
        identificador_2?: string | null;
      }
    ) => {
      try {
        // Limpar identificadores (apenas alfanumérico)
        const cleanUpdates = { ...updates };
        if (cleanUpdates.identificador_1) {
          cleanUpdates.identificador_1 = cleanUpdates.identificador_1
            .trim()
            .replace(/[^A-Za-z0-9]/g, "");
        }
        if (cleanUpdates.identificador_2) {
          cleanUpdates.identificador_2 = cleanUpdates.identificador_2
            .trim()
            .replace(/[^A-Za-z0-9]/g, "");
        }

        const { error } = await supabase
          .from("entity")
          .update(cleanUpdates)
          .eq("id", id);

        if (error) throw error;

        toast.success("Entidade atualizada com sucesso");
        return true;
      } catch (error) {
        console.error("Erro ao atualizar entidade:", error);
        toast.error("Erro ao atualizar entidade");
        return false;
      }
    },
    []
  );

  const cleanupOrphanEntity = async (entityId: string): Promise<boolean> => {
    try {
      const { data: remainingRelations, error: checkError } = await supabase
        .from("doc_entity")
        .select("id")
        .eq("entity_id", entityId)
        .limit(1);

      if (checkError) throw checkError;

      if (!remainingRelations || remainingRelations.length === 0) {
        const { error: entityError } = await supabase
          .from("entity")
          .delete()
          .eq("id", entityId);

        if (entityError) throw entityError;
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Erro ao limpar entidade ${entityId}:`, error);
      return false;
    }
  };

  const deleteEntityFromDoc = useCallback(
    async (entityId: string, docId: string) => {
      try {
        // Deletar apenas o relacionamento com este documento específico
        const { error: docEntityError } = await supabase
          .from("doc_entity")
          .delete()
          .eq("entity_id", entityId)
          .eq("doc_id", docId);

        if (docEntityError) throw docEntityError;

        // Verificar se a entidade ficou órfã e deletá-la se necessário
        const wasDeleted = await cleanupOrphanEntity(entityId);

        if (wasDeleted) {
          toast.success(
            "Entidade removida do documento e excluída (sem outros vínculos)"
          );
          return { success: true, wasDeleted: true };
        } else {
          toast.success("Entidade removida do documento");
          return { success: true, wasDeleted: false };
        }
      } catch (error) {
        console.error("Erro ao excluir entidade:", error);
        toast.error("Erro ao excluir entidade");
        return { success: false, wasDeleted: false };
      }
    },
    []
  );

  return {
    entityTypes,
    entities,
    loading,
    loadEntityTypes,
    loadEntitiesByType,
    updateEntity,
    deleteEntityFromDoc,
  };
}