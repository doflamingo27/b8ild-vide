import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  prenom?: string;
  nom?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, prenom, nom }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email);

    // TODO: Integrate with Resend when RESEND_API_KEY is configured
    // For now, just log the email
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || "";
    
    const emailContent = {
      to: email,
      subject: "Bienvenue sur B8ild — Configurez votre première équipe",
      html: `<div style='font-family:Inter,Arial,sans-serif;color:#2B2B2B'>
        <h2 style='color:#1C3F60'>Bienvenue sur B8ild 👷‍♂️</h2>
        <p>Bonjour ${prenom || ""} ${nom || ""},</p>
        <p>Merci de votre inscription. Commencez en 3 étapes :</p>
        <ol>
          <li>Ajoutez votre <strong>profil entreprise</strong></li>
          <li>Créez votre <strong>équipe</strong></li>
          <li>Lancez votre <strong>premier chantier</strong></li>
        </ol>
        <p><a href='${appUrl}/dashboard' style='background:#F7B500;color:#2B2B2B;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600'>Aller au Tableau de bord</a></p>
        <hr/>
        <p style='font-size:12px;color:#666'>© B8ild - Pilotez la rentabilité de vos chantiers en temps réel</p>
      </div>`,
    };

    console.log("Welcome email content prepared:", emailContent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Welcome email prepared (Resend integration pending)",
        email: emailContent 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
