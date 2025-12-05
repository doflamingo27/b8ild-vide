-- Fix function search_path mutable security warning
-- Update check_membre_statut_daily function with SET search_path

CREATE OR REPLACE FUNCTION public.check_membre_statut_daily()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Remettre à 'disponible' les membres dont toutes les affectations sont terminées
  UPDATE membres_equipe
  SET statut = 'disponible'
  WHERE statut = 'sur_chantier'
    AND NOT EXISTS (
      SELECT 1 
      FROM affectations_chantiers 
      WHERE membre_equipe_id = membres_equipe.id
        AND CURRENT_DATE BETWEEN date_debut AND date_fin
    );
END;
$function$;

-- Enable leaked password protection via auth config
-- Note: This is typically done via Supabase dashboard settings, but the migration documents the intent