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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer l'utilisateur depuis le token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) throw new Error('Unauthorized');

    console.log('[EXPORT-USER-DATA] Exporting data for user:', user.id);

    // Récupérer toutes les données de l'utilisateur
    const [
      { data: profile },
      { data: entreprise },
      { data: chantiers },
      { data: membres },
      { data: notifications },
      { data: preferences },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('entreprises').select('*').eq('proprietaire_user_id', user.id).single(),
      supabase.from('chantiers').select('*, devis(*), factures_fournisseurs(*), frais_chantier(*), equipe_chantier(*, membres_equipe(*)), factures_clients(*), paiements_clients(*)').eq('entreprise_id', (await supabase.from('entreprises').select('id').eq('proprietaire_user_id', user.id).single()).data?.id),
      supabase.from('membres_equipe').select('*').eq('entreprise_id', (await supabase.from('entreprises').select('id').eq('proprietaire_user_id', user.id).single()).data?.id),
      supabase.from('notifications').select('*').eq('user_id', user.id),
      supabase.from('notification_preferences').select('*').eq('user_id', user.id).single(),
    ]);

    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile,
      entreprise,
      chantiers,
      membres_equipe: membres,
      notifications,
      notification_preferences: preferences,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="b8ild-export-${user.id}-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('[EXPORT-USER-DATA] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
