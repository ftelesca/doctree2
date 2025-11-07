import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile after state update
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();
            
            // Se fez login com Google e tem avatar_url, atualizar o perfil
            const googleAvatarUrl = session.user.user_metadata?.avatar_url;
            if (googleAvatarUrl && profileData && profileData.foto_url !== googleAvatarUrl) {
              await supabase
                .from("profiles")
                .update({ foto_url: googleAvatarUrl })
                .eq("id", session.user.id);
              
              // Atualizar o estado local com a nova foto
              setProfile({ ...profileData, foto_url: googleAvatarUrl });
            } else {
              setProfile(profileData);
            }
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          
          // Se fez login com Google e tem avatar_url, atualizar o perfil
          const googleAvatarUrl = session.user.user_metadata?.avatar_url;
          if (googleAvatarUrl && profileData && profileData.foto_url !== googleAvatarUrl) {
            await supabase
              .from("profiles")
              .update({ foto_url: googleAvatarUrl })
              .eq("id", session.user.id);
            
            // Atualizar o estado local com a nova foto
            setProfile({ ...profileData, foto_url: googleAvatarUrl });
          } else {
            setProfile(profileData);
          }
          
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Traduzir erro de email não confirmado
        if (error.message.toLowerCase().includes("email not confirmed")) {
          const customError = new Error("Email não confirmado");
          (customError as any).code = "email_not_confirmed";
          (customError as any).email = email;
          throw customError;
        }
        throw error;
      }
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } catch (error: any) {
      if (error.code === "email_not_confirmed") {
        throw error; // Deixar a página tratar este erro específico
      }
      toast.error(error.message || "Erro ao fazer login");
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      toast.success("Cadastro realizado! Verifique seu email para confirmar a conta.");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar");
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login com Google");
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Erro ao sair");
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      toast.success("Email de verificação reenviado! Verifique sua caixa de entrada.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao reenviar email");
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
