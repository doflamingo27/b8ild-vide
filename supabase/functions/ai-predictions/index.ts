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
    const { chantierId, projectData } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Charger l'historique du chantier
    const { data: snapshots } = await supabase
      .from('snapshots_chantier')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('date', { ascending: false })
      .limit(30);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Appel à Lovable AI pour les prédictions
    const prompt = `Analyse le chantier suivant et prédis :
1. Date de fin estimée
2. Risque de dépassement budgétaire (%)
3. Recommandations d'optimisation

Données du chantier :
- Budget devis: ${projectData.budget_devis}€
- Coûts engagés actuels: ${projectData.couts_engages}€
- Durée estimée: ${projectData.duree_estimee} jours
- Rentabilité actuelle: ${projectData.rentabilite_pct}%
- Historique: ${snapshots?.length || 0} points de données

Historique récent:
${snapshots?.map(s => `- ${s.date}: Coût ${s.cout_engage}€, Rentabilité ${s.rentabilite_pct}%`).join('\n') || 'Aucun'}

Réponds en JSON avec: { "date_fin_predite": "YYYY-MM-DD", "confiance_pct": 85, "risque_depassement_pct": 15, "recommandations": ["rec1", "rec2", "rec3"] }`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert en gestion de chantiers BTP. Réponds toujours en JSON valide.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Parser le JSON de la réponse
    let predictions;
    try {
      predictions = JSON.parse(content);
    } catch {
      // Si la réponse n'est pas du JSON pur, extraire le JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid AI response format');
      }
    }

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in ai-predictions:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
