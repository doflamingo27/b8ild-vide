import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DAILY-SNAPSHOT] Starting daily snapshot creation');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Charger tous les chantiers actifs
    const { data: chantiers, error: chantiersError } = await supabase
      .from('chantiers')
      .select(`
        id,
        date_debut,
        duree_estimee,
        devis(montant_ttc),
        factures_fournisseurs(montant_ht),
        frais_chantier(montant_total),
        equipe_chantier(membre_id, membres_equipe(taux_horaire, charges_salariales, charges_patronales))
      `)
      .eq('statut', 'actif');

    if (chantiersError) throw chantiersError;

    console.log(`[DAILY-SNAPSHOT] Found ${chantiers?.length || 0} active projects`);

    const snapshots = [];

    for (const chantier of (chantiers || [])) {
      try {
        // Calculer les métriques
        const budget_devis = chantier.devis?.[0]?.montant_ttc || 0;
        const totalFactures = chantier.factures_fournisseurs?.reduce((sum, f) => sum + Number(f.montant_ht), 0) || 0;
        const totalFrais = chantier.frais_chantier?.reduce((sum, f) => sum + Number(f.montant_total), 0) || 0;
        const cout_engage = totalFactures + totalFrais;
        const budget_disponible = budget_devis - cout_engage;
        const rentabilite_pct = budget_devis > 0 ? (budget_disponible / budget_devis * 100) : 0;

        // Calculer le coût journalier équipe
        let cout_journalier_equipe = 0;
        for (const eq of (chantier.equipe_chantier || [])) {
          const membreData: any = eq.membres_equipe;
          if (membreData && !Array.isArray(membreData)) {
            const tauxHoraire = Number(membreData.taux_horaire) || 0;
            const chargesSal = Number(membreData.charges_salariales) || 0;
            const chargesPat = Number(membreData.charges_patronales) || 0;
            const coutHoraire = tauxHoraire * (1 + chargesSal / 100 + chargesPat / 100);
            cout_journalier_equipe += coutHoraire * 8; // 8h par jour
          }
        }

        snapshots.push({
          chantier_id: chantier.id,
          date: new Date().toISOString().split('T')[0],
          cout_engage,
          budget_disponible,
          rentabilite_pct: Math.round(rentabilite_pct * 10) / 10,
          nb_factures: chantier.factures_fournisseurs?.length || 0,
          nb_frais: chantier.frais_chantier?.length || 0,
        });
      } catch (err) {
        console.error(`[DAILY-SNAPSHOT] Error processing chantier ${chantier.id}:`, err);
      }
    }

    if (snapshots.length > 0) {
      const { error: insertError } = await supabase
        .from('snapshots_chantier')
        .insert(snapshots);

      if (insertError) throw insertError;
    }

    console.log(`[DAILY-SNAPSHOT] Created ${snapshots.length} snapshots successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      snapshots_created: snapshots.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[DAILY-SNAPSHOT] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
