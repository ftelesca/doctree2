// Localização: src/components/navegador/hooks/useFilters.ts

import { useState, useCallback } from "react";

interface Documento {
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

interface EntityType {
  id: string;
  nome: string;
}

export function useFilters(entityTypes: EntityType[]) {
  const [selectedPasta, setSelectedPasta] = useState<string>("TODOS");
  const [selectedEntidade, setSelectedEntidade] = useState<string>("TODOS");
  const [selectedRegistro, setSelectedRegistro] = useState<string>("TODOS");

  const applyFilters = useCallback(
    (documentosPorPasta: Record<string, Documento[]>) => {
      if (!Object.keys(documentosPorPasta).length) return {};

      let documentosFiltrados = { ...documentosPorPasta };

      // Filtrar por pasta
      if (selectedPasta && selectedPasta !== "TODOS") {
        documentosFiltrados = {
          [selectedPasta]: documentosFiltrados[selectedPasta] || [],
        };
      }

      // Filtrar por registro específico
      if (selectedRegistro !== "TODOS") {
        Object.keys(documentosFiltrados).forEach((pastaId) => {
          documentosFiltrados[pastaId] = documentosFiltrados[pastaId].filter(
            (doc) =>
              doc.doc_entity.some((de) => de.entity.id === selectedRegistro)
          );
        });
      }
      // Filtrar por tipo de entidade
      else if (selectedEntidade !== "TODOS") {
        const entityTypeName = entityTypes.find(
          (e) => e.id === selectedEntidade
        )?.nome;

        if (entityTypeName) {
          Object.keys(documentosFiltrados).forEach((pastaId) => {
            documentosFiltrados[pastaId] = documentosFiltrados[pastaId].filter(
              (doc) =>
                doc.doc_entity.some(
                  (de) => de.entity.entity_type.nome === entityTypeName
                )
            );
          });
        }
      }

      return documentosFiltrados;
    },
    [selectedPasta, selectedRegistro, selectedEntidade, entityTypes]
  );

  return {
    selectedPasta,
    selectedEntidade,
    selectedRegistro,
    setSelectedPasta,
    setSelectedEntidade,
    setSelectedRegistro,
    applyFilters,
  };
}