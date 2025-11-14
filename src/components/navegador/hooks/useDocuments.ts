// Localização: src/components/navegador/hooks/useDocuments.ts

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Documento {
  id: string;
  descricao: string;
  data_referencia: string;
  folder_id: string;
  doc_entity: Array<{
    entity: {
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
    };
  }>;
  doc_file: {
    storage_path: string;
    nome_arquivo: string;
  }[];
}

export function useDocuments(ordenacaoDesc: boolean) {
  const [documentsByFolder, setDocumentsByFolder] = useState<
    Record<string, Documento[]>
  >({});
  const [loading, setLoading] = useState(false);

  const loadDocuments = useCallback(
    async (folderIds: string[]) => {
      if (!folderIds.length) {
        setDocumentsByFolder({});
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("doc")
          .select(
            `
            id,
            descricao,
            data_referencia,
            folder_id,
            doc_entity(
              entity(
                id,
                nome,
                identificador_1,
                identificador_2,
                entity_type(
                  nome,
                  nome_ident_1,
                  nome_ident_2,
                  icone
                )
              )
            ),
            doc_file(
              storage_path,
              nome_arquivo
            )
          `
          )
          .in("folder_id", folderIds);

        if (error) throw error;

        const documentosPorPastaMap: Record<string, Documento[]> = {};
        (data || []).forEach((doc: any) => {
          if (!documentosPorPastaMap[doc.folder_id]) {
            documentosPorPastaMap[doc.folder_id] = [];
          }
          documentosPorPastaMap[doc.folder_id].push(doc);
        });

        // Ordenar documentos de cada pasta
        Object.keys(documentosPorPastaMap).forEach((pastaId) => {
          documentosPorPastaMap[pastaId].sort((a, b) => {
            const dateA = a.data_referencia.slice(0, 10);
            const dateB = b.data_referencia.slice(0, 10);
            const cmp = dateA.localeCompare(dateB);
            return ordenacaoDesc ? -cmp : cmp;
          });
        });

        setDocumentsByFolder(documentosPorPastaMap);
      } catch (error) {
        console.error("Erro ao carregar documentos:", error);
        toast.error("Erro ao carregar documentos");
      } finally {
        setLoading(false);
      }
    },
    [ordenacaoDesc]
  );

  const updateDocument = useCallback(
    async (
      id: string,
      updates: { descricao?: string; data_referencia?: string }
    ) => {
      try {
        const { error } = await supabase
          .from("doc")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

        toast.success("Documento atualizado com sucesso");
        return true;
      } catch (error) {
        console.error("Erro ao atualizar documento:", error);
        toast.error("Erro ao atualizar documento");
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

  const deleteDocument = useCallback(async (id: string) => {
    try {
      // 1. Buscar todas as entidades relacionadas ANTES de deletar
      const { data: relatedEntities, error: fetchError } = await supabase
        .from("doc_entity")
        .select("entity_id")
        .eq("doc_id", id);

      if (fetchError) throw fetchError;

      const entityIds = relatedEntities?.map((re) => re.entity_id) || [];

      // 2. Deletar relacionamentos doc_entity
      const { error: entitiesError } = await supabase
        .from("doc_entity")
        .delete()
        .eq("doc_id", id);

      if (entitiesError) throw entitiesError;

      // 3. Limpar entidades órfãs
      let deletedEntitiesCount = 0;
      for (const entityId of entityIds) {
        const wasDeleted = await cleanupOrphanEntity(entityId);
        if (wasDeleted) deletedEntitiesCount++;
      }

      // 4. Buscar arquivos associados
      const { data: files, error: filesError } = await supabase
        .from("doc_file")
        .select("storage_path")
        .eq("doc_id", id);

      if (filesError) throw filesError;

      // 5. Deletar arquivos do storage
      if (files && files.length > 0) {
        const filePaths = files.map((f) => f.storage_path);
        const { error: storageError } = await supabase.storage
          .from("documentos")
          .remove(filePaths);

        if (storageError) throw storageError;
      }

      // 6. Deletar registros de arquivos
      const { error: docFilesError } = await supabase
        .from("doc_file")
        .delete()
        .eq("doc_id", id);

      if (docFilesError) throw docFilesError;

      // 7. Deletar documento
      const { error: docError } = await supabase
        .from("doc")
        .delete()
        .eq("id", id);

      if (docError) throw docError;

      if (deletedEntitiesCount > 0) {
        toast.success(
          `Documento excluído com sucesso. ${deletedEntitiesCount} entidade(s) órfã(s) também foram removidas.`
        );
      } else {
        toast.success("Documento excluído com sucesso");
      }

      return { success: true, deletedEntities: entityIds };
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento");
      return { success: false, deletedEntities: [] };
    }
  }, []);

  return {
    documentsByFolder,
    loading,
    loadDocuments,
    updateDocument,
    deleteDocument,
  };
}