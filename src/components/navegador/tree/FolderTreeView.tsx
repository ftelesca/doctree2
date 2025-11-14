// Localização: src/components/navegador/tree/FolderTreeView.tsx

import { Card, CardContent } from "@/components/ui/card";
import { FolderNode } from "./FolderNode";
import { DocumentNode } from "./DocumentNode";
import { EntityNode } from "./EntityNode";
import type { Pasta } from "../hooks/useFolders";
import type { Documento } from "../hooks/useDocuments";

interface EntityRaiz {
  id: string;
  nome: string;
  tipo: string;
  icone: string | null;
}

interface FolderTreeViewProps {
  pastas: Pasta[];
  documentosPorPasta: Record<string, Documento[]>;
  pastaExpandida: Record<string, boolean>;
  selectedDocument: { storage_path: string } | null;
  onTogglePasta: (pastaId: string, documentos: Documento[]) => void;
  onToggleDoc: (docKey: string) => void;
  onSelectDocument: (doc: {
    storage_path: string;
    nome_arquivo: string;
    descricao: string;
    data_referencia: string;
  }) => void;
  onEditDoc: (doc: Documento) => void;
  onDeleteDoc: (doc: Documento) => void;
  onEditEntity: (entity: any) => void;
  onDeleteEntity: (entity: any, docId: string) => void;
  onSelectEntityRoot: (entity: EntityRaiz) => void;
  onAnalysis: (pasta: Pasta) => void;
  onShare: (pasta: Pasta) => void;
}

export function FolderTreeView({
  pastas,
  documentosPorPasta,
  pastaExpandida,
  selectedDocument,
  onTogglePasta,
  onToggleDoc,
  onSelectDocument,
  onEditDoc,
  onDeleteDoc,
  onEditEntity,
  onDeleteEntity,
  onSelectEntityRoot,
  onAnalysis,
  onShare,
}: FolderTreeViewProps) {
  const pastasComDocs = pastas.filter(
    (pasta) => documentosPorPasta[pasta.id]?.length > 0
  );

  if (pastasComDocs.length === 0) {
    return (
      <Card className="border-0 shadow-none rounded-none bg-transparent">
        <CardContent className="p-0">
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum documento encontrado com os filtros selecionados
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none rounded-none bg-transparent">
      <CardContent className="p-0 text-sm">
        {pastasComDocs.map((pasta, pastaIndex) => {
          const documentos = documentosPorPasta[pasta.id] || [];
          const isPastaExpanded = pastaExpandida[pasta.id] !== false;

          return (
            <div
              key={pasta.id}
              className={pastaIndex !== 0 ? "border-t border-border/50" : ""}
            >
              <FolderNode
                pasta={pasta}
                documentCount={documentos.length}
                isExpanded={isPastaExpanded}
                onToggle={() => onTogglePasta(pasta.id, documentos)}
                onAnalysis={() => onAnalysis(pasta)}
                onShare={() => onShare(pasta)}
              >
                {documentos.length === 0 ? (
                  <div className="ml-6 p-2 text-xs text-muted-foreground">
                    Nenhum documento
                  </div>
                ) : (
                  documentos.map((doc, docIndex) => {
                    const docKey = `${pasta.id}-${doc.id}`;
                    const isDocExpanded = pastaExpandida[docKey] || false;
                    const entidades = (doc.doc_entity || []).sort((a, b) => {
                      const tipoCompare = a.entity.entity_type.nome.localeCompare(
                        b.entity.entity_type.nome
                      );
                      if (tipoCompare !== 0) return tipoCompare;
                      return a.entity.nome.localeCompare(b.entity.nome);
                    });
                    const isLastDoc = docIndex === documentos.length - 1;

                    return (
                      <div
                        key={doc.id}
                        className={!isLastDoc ? "border-b border-border/50" : ""}
                      >
                        <DocumentNode
                          documento={doc}
                          pasta={pasta}
                          entityCount={entidades.length}
                          hasEntities={entidades.length > 0}
                          isExpanded={isDocExpanded}
                          isSelected={
                            selectedDocument?.storage_path ===
                            doc.doc_file?.[0]?.storage_path
                          }
                          onToggle={() => onToggleDoc(docKey)}
                          onSelect={() => {
                            if (doc.doc_file && doc.doc_file.length > 0) {
                              onSelectDocument({
                                storage_path: doc.doc_file[0].storage_path,
                                nome_arquivo: doc.doc_file[0].nome_arquivo,
                                descricao: doc.descricao,
                                data_referencia: doc.data_referencia,
                              });
                            }
                          }}
                          onEdit={() => onEditDoc(doc)}
                          onDelete={() => onDeleteDoc(doc)}
                        >
                          {entidades.map((ee, entIndex) => {
                            const isLastEnt = entIndex === entidades.length - 1;
                            const reg = ee.entity;

                            return (
                              <div
                                key={entIndex}
                                className={
                                  !isLastEnt ? "border-b border-border/30" : ""
                                }
                              >
                                <EntityNode
                                  entity={reg}
                                  pasta={pasta}
                                  docId={doc.id}
                                  onSelectAsRoot={() =>
                                    onSelectEntityRoot({
                                      id: reg.id,
                                      nome: reg.nome,
                                      tipo: reg.entity_type.nome,
                                      icone: reg.entity_type.icone,
                                    })
                                  }
                                  onEdit={() => onEditEntity(reg)}
                                  onDelete={() => onDeleteEntity(reg, doc.id)}
                                />
                              </div>
                            );
                          })}
                        </DocumentNode>
                      </div>
                    );
                  })
                )}
              </FolderNode>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}