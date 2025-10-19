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
    const { tender_id, user_id } = await req.json();
    console.log("[CALCULATE-MATCH] Start", { tender_id, user_id });

    if (!tender_id || !user_id) {
      throw new Error("tender_id and user_id are required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer le profil AO de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from("tender_profiles")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (profileError) {
      console.error("[CALCULATE-MATCH] Profile error:", profileError);
      throw profileError;
    }

    if (!profile) {
      console.log("[CALCULATE-MATCH] No profile found");
      return new Response(JSON.stringify({ score: 0, match_reasons: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer l'appel d'offres
    const { data: tender, error: tenderError } = await supabase
      .from("tenders")
      .select("*")
      .eq("id", tender_id)
      .single();

    if (tenderError) {
      console.error("[CALCULATE-MATCH] Tender error:", tenderError);
      throw tenderError;
    }

    // Calculer le score de matching
    let score = 0;
    const matchReasons: any = {};

    // 1. Spécialités (40 points)
    if (profile.specialties && profile.specialties.length > 0 && tender.category) {
      const categoryLower = tender.category.toLowerCase();
      const specialtyMatch = profile.specialties.some((s: string) => 
        categoryLower.includes(s.toLowerCase()) || s.toLowerCase().includes(categoryLower)
      );
      if (specialtyMatch) {
        score += 40;
        matchReasons.specialties = true;
      }
    }

    // 2. Zone géographique (20 points)
    if (tender.department) {
      if (profile.zone_type === "france") {
        score += 20;
        matchReasons.zone = true;
      } else if (profile.zone_type === "departments" && profile.departments) {
        const deptMatch = profile.departments.includes(tender.department);
        if (deptMatch) {
          score += 20;
          matchReasons.zone = true;
        }
      }
      // TODO: Pour "radius", implémenter le calcul de distance géographique
    }

    // 3. Budget (20 points)
    if (tender.budget_min && tender.budget_max) {
      const tenderBudget = (tender.budget_min + tender.budget_max) / 2;
      const minBudget = profile.budget_min || 0;
      const maxBudget = profile.budget_max || Infinity;
      
      if (tenderBudget >= minBudget && tenderBudget <= maxBudget) {
        score += 20;
        matchReasons.budget = true;
      }
    }

    // 4. Certifications (10 points)
    if (profile.certifications && profile.certifications.length > 0 && tender.required_docs) {
      const certMatch = tender.required_docs.some((doc: string) =>
        profile.certifications.some((cert: string) => 
          doc.toLowerCase().includes(cert.toLowerCase())
        )
      );
      if (certMatch) {
        score += 10;
        matchReasons.certifications = true;
      }
    }

    // 5. Délai (10 points) - si deadline est dans le futur et suffisamment loin
    if (tender.deadline) {
      const deadlineDate = new Date(tender.deadline);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline >= 7) {
        score += 10;
        matchReasons.deadline = true;
      }
    }

    console.log("[CALCULATE-MATCH] Score calculated", { score, matchReasons });

    // Enregistrer ou mettre à jour le match
    const { error: upsertError } = await supabase
      .from("tender_matches")
      .upsert({
        user_id,
        tender_id,
        score,
        match_reasons: matchReasons,
      }, {
        onConflict: "user_id,tender_id",
      });

    if (upsertError) {
      console.error("[CALCULATE-MATCH] Upsert error:", upsertError);
      throw upsertError;
    }

    return new Response(JSON.stringify({ score, match_reasons: matchReasons }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[CALCULATE-MATCH] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
