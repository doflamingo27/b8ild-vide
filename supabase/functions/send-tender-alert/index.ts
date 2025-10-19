import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenderAlertRequest {
  email: string;
  titre: string;
  organisme: string;
  ville: string;
  departement: string;
  montant_estime: number;
  deadline: string;
  score: number;
  criteres_ok: string[];
  ao_link: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: TenderAlertRequest = await req.json();

    console.log("Sending tender alert to:", data.email);

    // TODO: Integrate with Resend when RESEND_API_KEY is configured
    const emailContent = {
      to: data.email,
      subject: `🎯 Nouvel AO ${data.score}% — ${data.ville} (deadline ${data.deadline})`,
      html: `<div style='font-family:Inter,Arial;color:#2B2B2B'>
        <h2 style='color:#1C3F60'>Nouvel Appel d'Offres BTP</h2>
        <p><strong>${data.titre}</strong></p>
        <ul>
          <li>Organisme : ${data.organisme}</li>
          <li>Localisation : ${data.ville} (${data.departement})</li>
          <li>Montant estimé : ${data.montant_estime.toLocaleString()} €</li>
          <li>Date limite : ${data.deadline}</li>
          <li>Compatibilité : <strong>${data.score}%</strong></li>
        </ul>
        <p>Critères qui matchent :</p>
        <ul>
          ${data.criteres_ok.map(c => `<li>✅ ${c}</li>`).join("")}
        </ul>
        <p><a href='${data.ao_link}' style='background:#F7B500;color:#2B2B2B;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600'>Voir l'AO</a></p>
        <hr/>
        <p style='font-size:12px;color:#666'>Gérez vos préférences d'alertes dans Profil AO.</p>
      </div>`,
    };

    console.log("Tender alert email content prepared:", emailContent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Tender alert email prepared (Resend integration pending)",
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
    console.error("Error in send-tender-alert function:", error);
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
