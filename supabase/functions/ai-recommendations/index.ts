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
    const { userId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Charger tous les chantiers de l'utilisateur
    const { data: entreprise } = await supabase
      .from('entreprises')
      .select('id')
      .eq('proprietaire_user_id', userId)
      .single();

    if (!entreprise) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: chantiers } = await supabase
      .from('chantiers')
      .select('*, devis(*), factures_fournisseurs(*), frais_chantier(*)')
      .eq('entreprise_id', entreprise.id)
      .eq('statut', 'actif');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Construire un résumé pour l'IA
    const summary = chantiers?.map(c => {
      const totalFactures = c.factures_fournisseurs?.reduce((sum: number, f: any) => sum + Number(f.montant_ht), 0) || 0;
      const totalFrais = c.frais_chantier?.reduce((sum: number, f: any) => sum + Number(f.montant_total), 0) || 0;
      const devisAmount = c.devis?.[0]?.montant_ttc || 0;
      const rentabilite = devisAmount > 0 ? ((devisAmount - totalFactures - totalFrais) / devisAmount * 100).toFixed(1) : 0;
      
      return `- ${c.nom_chantier}: Budget ${devisAmount}€, Dépenses ${totalFactures + totalFrais}€, Rentabilité ${rentabilite}%`;
    }).join('\n') || 'Aucun chantier actif';

    const prompt = `Analyse les chantiers BTP suivants et génère 3-5 recommandations concrètes pour améliorer la rentabilité et l'efficacité :

${summary}

Réponds en JSON avec un tableau de recommandations : [{ "type": "budget|planning|team|supplier", "title": "Titre court", "description": "Description claire", "impact": "high|medium|low" }]`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un consultant expert en gestion de chantiers BTP. Réponds en JSON valide.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Error:', await aiResponse.text());
      throw new Error('AI API error');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    let recommendations;
    try {
      recommendations = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        recommendations = [];
      }
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in ai-recommendations:', error);
    return new Response(JSON.stringify({ recommendations: [], error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
