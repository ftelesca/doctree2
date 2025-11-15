import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle user denial
    if (error) {
      console.log('User denied OAuth consent:', error);
      return Response.redirect('https://doctree.com.br/auth?error=access_denied', 302);
    }

    if (!code) {
      console.error('No authorization code received');
      return Response.redirect('https://doctree.com.br/auth?error=no_code', 302);
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing required environment variables');
    }

    console.log('Exchanging authorization code for tokens...');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://doctree.com.br/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return Response.redirect('https://doctree.com.br/auth?error=token_exchange_failed', 302);
    }

    const tokens = await tokenResponse.json();
    console.log('Successfully received tokens from Google');

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Sign in with Google ID token
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: tokens.id_token,
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return Response.redirect('https://doctree.com.br/auth?error=auth_failed', 302);
    }

    console.log('Successfully created Supabase session for user:', authData.user?.email);

    // Redirect to frontend with session tokens
    const redirectUrl = new URL('https://doctree.com.br/auth/callback');
    redirectUrl.searchParams.set('access_token', authData.session.access_token);
    redirectUrl.searchParams.set('refresh_token', authData.session.refresh_token);
    redirectUrl.searchParams.set('state', state || '');

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error('Error in google-oauth-callback:', error);
    return Response.redirect('https://doctree.com.br/auth?error=unexpected_error', 302);
  }
});
