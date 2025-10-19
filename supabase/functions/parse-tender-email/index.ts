import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inbox_id } = await req.json();
    console.log("[PARSE-TENDER-EMAIL] Start", { inbox_id });

    if (!inbox_id) {
      throw new Error("inbox_id is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer l'email de l'inbox
    const { data: inboxItem, error: inboxError } = await supabase
      .from("tender_inbox")
      .select("*")
      .eq("id", inbox_id)
      .single();

    if (inboxError) throw inboxError;

    // Parser l'email avec Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un assistant qui extrait des informations structurées d'emails d'appels d'offres BTP.
Analyse l'email et extrait les informations suivantes :
- title: titre de l'appel d'offres
- buyer: organisme acheteur
- city: ville
- department: département (code à 2 chiffres)
- postal_code: code postal
- budget_min: budget minimum en euros (nombre)
- budget_max: budget maximum en euros (nombre)
- deadline: date limite de candidature (format YYYY-MM-DD)
- category: catégorie BTP (ex: "Gros œuvre", "Second œuvre", "Électricité")
- description: description détaillée`;

    const userPrompt = `Sujet: ${inboxItem.email_subject}
Expéditeur: ${inboxItem.email_sender}
Corps: ${inboxItem.email_body || ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_tender_data",
            description: "Extract structured tender data from email",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                buyer: { type: "string" },
                city: { type: "string" },
                department: { type: "string" },
                postal_code: { type: "string" },
                budget_min: { type: "number" },
                budget_max: { type: "number" },
                deadline: { type: "string", format: "date" },
                category: { type: "string" },
                description: { type: "string" }
              },
              required: ["title", "buyer"],
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_tender_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[PARSE-TENDER-EMAIL] AI Error:", errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No data extracted from email");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("[PARSE-TENDER-EMAIL] Data extracted:", extractedData);

    // Créer le tender
    const { data: tender, error: tenderError } = await supabase
      .from("tenders")
      .insert({
        title: extractedData.title,
        buyer: extractedData.buyer,
        city: extractedData.city || null,
        department: extractedData.department || null,
        postal_code: extractedData.postal_code || null,
        budget_min: extractedData.budget_min || null,
        budget_max: extractedData.budget_max || null,
        deadline: extractedData.deadline || null,
        category: extractedData.category || null,
        description: extractedData.description || null,
        source: 'Email',
      })
      .select()
      .single();

    if (tenderError) throw tenderError;

    // Mettre à jour l'inbox
    const { error: updateError } = await supabase
      .from("tender_inbox")
      .update({
        converted_tender_id: tender.id,
        status: 'converted',
      })
      .eq("id", inbox_id);

    if (updateError) throw updateError;

    // Calculer le matching pour cet utilisateur
    await supabase.functions.invoke('calculate-tender-match', {
      body: { tender_id: tender.id, user_id: inboxItem.user_id }
    });

    console.log("[PARSE-TENDER-EMAIL] Success", { tender_id: tender.id });

    return new Response(JSON.stringify({ tender_id: tender.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[PARSE-TENDER-EMAIL] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
