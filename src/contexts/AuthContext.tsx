import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  last_folder?: string;
  organizacoes?: { nome: string };
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          // Fetch profile asynchronously without blocking
          const fetchProfile = async () => {
            try {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .maybeSingle();
              
              // Se fez login com Google e tem avatar_url, atualizar o perfil
              const googleAvatarUrl = session.user.user_metadata?.avatar_url;
              if (googleAvatarUrl && profileData && profileData.avatar_url !== googleAvatarUrl) {
                await supabase
                  .from("profiles")
                  .update({ avatar_url: googleAvatarUrl })
                  .eq("id", session.user.id);

                setProfile({ ...profileData, avatar_url: googleAvatarUrl });
              } else {
                setProfile(profileData);
              }
            } catch (err) {
              console.error("Profile fetch error:", err);
              setProfile(null);
            }
          };
          
          fetchProfile();
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
      // onAuthStateChange will handle the session if it exists
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
      // Call the custom OAuth initiate edge function
      const { data, error } = await supabase.functions.invoke('google-oauth-initiate', {
        body: {}
      });

      if (error) throw error;

      if (!data || !data.authUrl || !data.state) {
        throw new Error('Invalid response from OAuth initiate function');
      }

      // Store state for CSRF validation
      sessionStorage.setItem('oauth_state', data.state);

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Error initiating Google login:', error);
      toast.error(error.message || "Erro ao fazer login com Google");
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Try to invalidate the session on the server (global sign-out)
      const { error } = await supabase.auth.signOut();

      // If it's a different error than "Session not found", surface it
      if (error && error.message !== 'Session not found') {
        throw error;
      }
    } catch (error: any) {
      // Silently handle session errors, only log severe errors
      console.error('Logout error:', error);
    } finally {
      // Ensure local cleanup even if the server reports missing session
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setSession(null);
      setUser(null);
      setProfile(null);

      navigate("/auth");
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

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      toast.success("Email enviado! Verifique sua caixa de entrada para redefinir sua senha.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      // Fetch updated profile
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setProfile(profileData);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
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
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
