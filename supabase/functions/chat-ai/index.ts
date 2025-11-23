import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Récupérer le user_id et entreprise_id
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('[chat-ai] Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer l'entreprise
    const { data: entreprise } = await supabase
      .from('entreprises')
      .select('id')
      .eq('proprietaire_user_id', user.id)
      .single();

    if (!entreprise) {
      return new Response(JSON.stringify({ error: 'Entreprise non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const entrepriseId = entreprise.id;

    // Récupérer le contexte de l'entreprise (limiter pour éviter trop de tokens)
    const { data: chantiers } = await supabase
      .from('chantiers')
      .select('id, nom_chantier, statut, etat_chantier, budget_ht')
      .eq('entreprise_id', entrepriseId)
      .limit(20);

    const { data: metrics } = await supabase
      .from('chantier_metrics_realtime')
      .select('chantier_id, metrics')
      .in('chantier_id', chantiers?.map(c => c.id) || []);

    const { data: membres } = await supabase
      .from('membres_equipe')
      .select('id, prenom, nom, statut, taux_horaire')
      .eq('entreprise_id', entrepriseId);

    // Calculer quelques métriques globales
    const totalBudget = chantiers?.reduce((sum, c) => sum + (c.budget_ht || 0), 0) || 0;
    const chantiersActifs = chantiers?.filter(c => c.etat_chantier === 'en_cours').length || 0;
    const membresDisponibles = membres?.filter(m => m.statut === 'disponible').length || 0;

    // Calculer rentabilité moyenne
    let totalProfitability = 0;
    let countWithProfit = 0;
    metrics?.forEach(m => {
      const profit = m.metrics?.profitability_pct;
      if (profit != null && profit !== 0) {
        totalProfitability += profit;
        countWithProfit++;
      }
    });
    const avgProfitability = countWithProfit > 0 ? (totalProfitability / countWithProfit).toFixed(1) : '0';

    const systemPrompt = `Tu es un assistant IA spécialisé dans la gestion de chantiers BTP pour l'entreprise.
Tu as accès aux données suivantes :
- ${chantiers?.length || 0} chantiers au total
- ${chantiersActifs} chantiers en cours
- Budget total : ${totalBudget.toFixed(2)}€
- Équipe : ${membres?.length || 0} membres (${membresDisponibles} disponibles)
- Rentabilité moyenne : ${avgProfitability}%

Tu dois :
1. Répondre en français avec un ton professionnel mais accessible
2. Donner des réponses précises basées sur les données réelles
3. Suggérer des actions concrètes quand pertinent
4. Alerter sur les problèmes détectés (rentabilité faible, retards, dépassements de budget)
5. Rester concis (max 200 mots par réponse)
6. Si on te demande des détails sur un chantier spécifique, utilise les données de métriques temps réel
7. Ne jamais inventer de chiffres, utilise uniquement les données fournies

Données détaillées des chantiers actifs :
${chantiers?.map(c => {
  const metric = metrics?.find(m => m.chantier_id === c.id)?.metrics;
  return `- ${c.nom_chantier} (${c.etat_chantier}) : Budget ${c.budget_ht}€, Rentabilité ${metric?.profitability_pct || 'N/A'}%`;
}).join('\n')}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[chat-ai] LOVABLE_API_KEY non configurée');
      return new Response(JSON.stringify({ error: 'Clé API manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[chat-ai] Appel Lovable AI avec', messages.length, 'messages');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10) // Limiter à 10 derniers messages pour économiser tokens
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chat-ai] Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Crédits Lovable AI insuffisants. Rechargez votre compte.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erreur IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retourner le stream directement
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[chat-ai] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
