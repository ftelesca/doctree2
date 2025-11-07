import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface LastFolderContextType {
  lastFolder: string | null;
  setLastFolder: (folderId: string) => void;
}

const LastFolderContext = createContext<LastFolderContextType | undefined>(undefined);

export const useLastFolder = () => {
  const context = useContext(LastFolderContext);
  if (!context) {
    throw new Error("useLastFolder must be used within LastFolderProvider");
  }
  return context;
};

export const LastFolderProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [lastFolder, setLastFolderState] = useState<string | null>(null);

  // Inicializar com o valor do profile
  useEffect(() => {
    if (profile?.last_folder) {
      setLastFolderState(profile.last_folder);
    }
  }, [profile?.last_folder]);

  // Função que atualiza local (instantâneo) + banco (background)
  const setLastFolder = (folderId: string) => {
    // 1. Atualizar estado local IMEDIATAMENTE
    setLastFolderState(folderId);

    // 2. Atualizar no banco de forma assíncrona (não bloqueia a UI)
    if (user) {
      supabase
        .from("profiles")
        .update({ last_folder: folderId })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) {
            console.error("Erro ao atualizar last_folder:", error);
          }
        });
    }
  };

  return (
    <LastFolderContext.Provider value={{ lastFolder, setLastFolder }}>
      {children}
    </LastFolderContext.Provider>
  );
};
