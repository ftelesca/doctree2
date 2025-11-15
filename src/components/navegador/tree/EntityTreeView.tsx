// Localização: src/components/navegador/tree/EntityTreeView.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FolderOpen, Folder } from "lucide-react";
import { getIconComponent } from "@/utils/iconHelper";
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

interface EntityTreeViewProps {
  entidadeRaiz: EntityRaiz;
  pastas: Pasta[];
  documentosPorPasta: Record<string, Documento[]>;
  pastaExpandida: Record<string, boolean>;
  selectedDocument: { storage_path: string } | null;
  onToggle: (key: string) => void;
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
}

export function EntityTreeView({
  entidadeRaiz,
  pastas,
  documentosPorPasta,
  pastaExpandida,
  selectedDocument,
  onToggle,
  onSelectDocument,
  onEditDoc,
  onDeleteDoc,
  onEditEntity,
  onDeleteEntity,
  onSelectEntityRoot,
}: EntityTreeViewProps) {
  // Filtrar documentos que contêm a entidade raiz
  const docsComEntidadeRaiz = new Set<string>();
  const pastasPorDoc: Record<string, string> = {};

  Object.keys(documentosPorPasta).forEach((pastaId) => {
    const documentos = documentosPorPasta[pastaId] || [];
    documentos.forEach((doc) => {
      const temEntidadeRaiz = doc.doc_entity.some((de) => de.entity.id === entidadeRaiz.id);
      if (temEntidadeRaiz) {
        docsComEntidadeRaiz.add(doc.id);
        pastasPorDoc[doc.id] = pastaId;
      }
    });
  });

  // Agrupar documentos por pasta
  const docsPorPastaFiltrados: Record<string, Documento[]> = {};
  Object.keys(documentosPorPasta).forEach((pastaId) => {
    const documentos = documentosPorPasta[pastaId] || [];
    const docsNaPasta = documentos.filter((doc) => docsComEntidadeRaiz.has(doc.id));
    if (docsNaPasta.length > 0) {
      docsPorPastaFiltrados[pastaId] = docsNaPasta;
    }
  });

  const pastasComDocs = pastas.filter((pasta) => docsPorPastaFiltrados[pasta.id]?.length > 0);

  const IconeRaiz = entidadeRaiz.icone ? getIconComponent(entidadeRaiz.icone) : null;

  if (pastasComDocs.length === 0) {
    return (
      <Card className="border-0 shadow-none rounded-none bg-transparent">
        <CardContent className="p-0">
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum documento encontrado para esta entidade
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none rounded-none bg-transparent">
      <CardContent className="p-0 text-sm">
        {/* Cabeçalho da Entidade Raiz */}
        <div className="px-3 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            {IconeRaiz && <IconeRaiz className="h-5 w-5 text-primary" />}
            <div className="flex-1">
              <div className="font-semibold text-base">{entidadeRaiz.nome}</div>
              <div className="text-xs text-muted-foreground">{entidadeRaiz.tipo}</div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {pastasComDocs.length} pasta(s)
            </Badge>
          </div>
        </div>

        {/* Lista de Pastas com Documentos */}
        {pastasComDocs.map((pasta, pastaIndex) => {
          const documentos = docsPorPastaFiltrados[pasta.id] || [];
          const pastaKey = `entity-${entidadeRaiz.id}-pasta-${pasta.id}`;
          const isPastaExpanded = pastaExpandida[pastaKey] !== false;

          return (
            <div key={pasta.id} className="border-b border-border/50">
              {/* Cabeçalho da Pasta */}
              <div
                className="flex items-center justify-between px-3 py-2 hover:bg-accent/50 cursor-pointer group"
                onClick={() => onToggle(pastaKey)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {isPastaExpanded ? (
                    <>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      <FolderOpen className="h-4 w-4 text-primary" />
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Folder className="h-4 w-4 text-muted-foreground" />
                    </>
                  )}
                  <span className="font-medium">{pasta.descricao}</span>
                  {!pasta.isOwner && pasta.ownerName && (
                    <Badge variant="outline" className="text-xs ml-2">
                      {pasta.ownerName}
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {documentos.length}
                </Badge>
              </div>

              {/* Lista de Documentos */}
              {isPastaExpanded && (
                <div className="ml-6">
                  {documentos.map((doc, docIndex) => {
                    const docKey = `entity-${entidadeRaiz.id}-${pasta.id}-${doc.id}`;
                    const isDocExpanded = pastaExpandida[docKey] || false;

                    // Filtrar entidades para excluir a entidade raiz da lista de filhos
                    const entidadesFilhas = (doc.doc_entity || [])
                      .filter((de) => de.entity.id !== entidadeRaiz.id)
                      .sort((a, b) => {
                        const tipoCompare = a.entity.entity_type.nome.localeCompare(b.entity.entity_type.nome);
                        if (tipoCompare !== 0) return tipoCompare;
                        return a.entity.nome.localeCompare(b.entity.nome);
                      });

                    const isLastDoc = docIndex === documentos.length - 1;

                    return (
                      <div key={doc.id} className={!isLastDoc ? "border-b border-border/50" : ""}>
                        <DocumentNode
                          documento={doc}
                          pasta={pasta}
                          entityCount={entidadesFilhas.length}
                          hasEntities={entidadesFilhas.length > 0}
                          isExpanded={isDocExpanded}
                          isSelected={selectedDocument?.storage_path === doc.doc_file?.[0]?.storage_path}
                          onToggle={() => onToggle(docKey)}
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
                          {entidadesFilhas.map((ee, entIndex) => {
                            const isLastEnt = entIndex === entidadesFilhas.length - 1;
                            const reg = ee.entity;

                            return (
                              <div key={entIndex} className={!isLastEnt ? "border-b border-border/30" : ""}>
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
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
