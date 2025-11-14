// Edge function to invite users to DocTree and send folder share invitations
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, folder_id, folder_name, invited_by_id } = await req.json();

    if (!email || !folder_id || !folder_name || !invited_by_id) {
      console.error("Missing required fields:", { email, folder_id, folder_name, invited_by_id });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the inviter's name
    const { data: inviterProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", invited_by_id)
      .single();

    if (profileError) {
      console.error("Error fetching inviter profile:", profileError);
    }

    const inviterName = inviterProfile?.full_name || "Um usuário";

    // Get the site URL - fallback to Supabase URL if not set
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SUPABASE_URL") || "";
    console.log("Using site URL:", siteUrl);

    // Send invite email using Supabase Auth Admin API
    const { data: inviteData, error: inviteError } =
      await supabaseClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/navegador`,
        data: {
          invited_by: invited_by_id,
          invited_by_name: inviterName,
          folder_id: folder_id,
          folder_name: folder_name,
        },
      });

    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      return new Response(
        JSON.stringify({
          error: inviteError.message,
          details: inviteError,
          email: email
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invite email sent successfully",
        user: inviteData.user,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
