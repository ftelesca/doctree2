import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');

        // Handle errors from Google
        if (errorParam) {
          const errorMessage = errorParam === 'access_denied' 
            ? 'Acesso negado. Você precisa autorizar o acesso para fazer login.'
            : 'Erro ao fazer login com Google';
          setError(errorMessage);
          toast.error(errorMessage);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (!code) {
          setError('Código de autorização não recebido');
          toast.error('Erro ao processar login');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // Validate state if it was stored
        const storedState = sessionStorage.getItem('oauth_state');
        if (storedState && state !== storedState) {
          setError('Estado de segurança inválido');
          toast.error('Erro de segurança ao fazer login');
          sessionStorage.removeItem('oauth_state');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // Clear stored state
        sessionStorage.removeItem('oauth_state');

        console.log('Exchanging authorization code for session...');

        // Call the edge function to exchange the code for tokens
        const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke(
          'google-oauth-callback',
          {
            body: { code, state }
          }
        );

        if (exchangeError) {
          console.error('Error exchanging code:', exchangeError);
          setError('Falha ao trocar código por sessão');
          toast.error('Erro ao fazer login');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (!exchangeData || !exchangeData.access_token || !exchangeData.refresh_token) {
          console.error('Invalid response from callback function:', exchangeData);
          setError('Resposta inválida do servidor');
          toast.error('Erro ao fazer login');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // Set the session in Supabase client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: exchangeData.access_token,
          refresh_token: exchangeData.refresh_token,
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          setError('Erro ao configurar sessão');
          toast.error('Erro ao fazer login');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        console.log('Session set successfully');
        toast.success('Login realizado com sucesso!');
        
        // Clear URL parameters
        window.history.replaceState({}, '', '/auth/callback');
        
        // Redirect to main page
        navigate('/navegador');
      } catch (error: any) {
        console.error('Error in auth callback:', error);
        setError(error.message || 'Erro desconhecido');
        toast.error('Erro ao processar login');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-pulse text-destructive text-xl">
            Erro ao processar login
          </div>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Redirecionando para a página de login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Processando login...</p>
      </div>
    </div>
  );
}
