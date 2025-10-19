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
    console.log("[SEND-TENDER-DIGEST] Start daily digest");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer tous les profils avec alert_frequency = 'daily'
    const { data: profiles, error: profilesError } = await supabase
      .from("tender_profiles")
      .select("*, profiles!inner(email)")
      .eq("alert_email", true)
      .eq("alert_frequency", "daily");

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      console.log("[SEND-TENDER-DIGEST] No profiles with daily alerts");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    // Pour chaque profil, récupérer les matchs du jour
    for (const profile of profiles) {
      // Récupérer les matchs de la dernière journée
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: todayMatches, error: matchesError } = await supabase
        .from("tender_matches")
        .select(`
          *,
          tenders (
            id,
            title,
            buyer,
            city,
            budget_min,
            budget_max,
            deadline
          )
        `)
        .eq("user_id", profile.user_id)
        .gte("score", profile.score_threshold)
        .gte("created_at", yesterday.toISOString())
        .is("notified_at", null);

      if (matchesError) {
        console.error("[SEND-TENDER-DIGEST] Matches error:", matchesError);
        continue;
      }

      if (!todayMatches || todayMatches.length === 0) {
        continue;
      }

      // Créer une notification in-app avec résumé
      if (profile.alert_push) {
        await supabase
          .from("notifications")
          .insert({
            user_id: profile.user_id,
            type: "tender",
            title: `Résumé quotidien - ${todayMatches.length} AO pertinents`,
            message: todayMatches.slice(0, 3).map((m: any) => m.tenders?.title).join(", "),
            link: "/tenders/catalog",
          });
      }

      // TODO: Envoyer un email digest (nécessite Resend)
      // const email = profile.profiles?.email;
      // if (email) {
      //   await sendDigestEmail(email, todayMatches);
      // }

      // Marquer tous les matchs comme notifiés
      for (const match of todayMatches) {
        await supabase
          .from("tender_matches")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", match.id);
      }

      sentCount++;
    }

    console.log("[SEND-TENDER-DIGEST] Success", { sent: sentCount });

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[SEND-TENDER-DIGEST] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
