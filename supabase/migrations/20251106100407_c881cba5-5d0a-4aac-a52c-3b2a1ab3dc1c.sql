-- Supprimer toutes les versions de la fonction pour éviter les conflits
DROP FUNCTION IF EXISTS public.insert_extraction_service(text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.insert_extraction_service(text, uuid, jsonb);

-- Recréer UNE SEULE version avec l'ordre correct : p_table, p_entreprise_id, p_data
CREATE OR REPLACE FUNCTION public.insert_extraction_service(
  p_table text,
  p_entreprise_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_montant_ht numeric;
  v_tva_pct numeric;
  v_tva_montant numeric;
  v_montant_ttc numeric;
  v_montant_total numeric;
  v_extraction_status text := 'complete';
BEGIN
  -- Vérifier les permissions
  IF p_entreprise_id != get_current_entreprise() AND jwt_role() != 'service_role' THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_id := gen_random_uuid();

  -- Parser avec les fonctions sûres
  v_montant_ht := public.safe_num_fr(p_data->>'montant_ht');
  v_tva_pct := public.safe_pct_fr(p_data->>'tva_pct');
  v_tva_montant := public.safe_num_fr(p_data->>'tva_montant');
  v_montant_ttc := public.safe_num_fr(coalesce(p_data->>'montant_ttc', p_data->>'net'));
  v_montant_total := public.safe_num_fr(p_data->>'montant_total');

  -- Déterminer le statut d'extraction
  IF p_table = 'factures_fournisseurs' AND v_montant_ht IS NULL AND v_montant_ttc IS NULL THEN
    v_extraction_status := 'incomplete';
  END IF;

  IF p_table = 'factures_fournisseurs' THEN
    INSERT INTO factures_fournisseurs (
      id, entreprise_id, montant_ht, tva_pct, tva_montant, montant_ttc,
      fournisseur, siret, date_facture, categorie,
      extraction_json, confiance, pages_count, extraction_status, created_at
    ) VALUES (
      v_id, p_entreprise_id, v_montant_ht, v_tva_pct, v_tva_montant, v_montant_ttc,
      p_data->>'fournisseur', p_data->>'siret', (p_data->>'date_facture')::date, 
      coalesce(p_data->>'categorie', 'Autres'),
      p_data->'extraction_json', (p_data->>'confiance')::numeric, 
      (p_data->>'pages_count')::integer, v_extraction_status, now()
    );
  ELSIF p_table = 'frais_chantier' THEN
    INSERT INTO frais_chantier (
      id, entreprise_id, chantier_id, type_frais, montant_total,
      description, fournisseur_nom, siret, date_frais,
      extraction_json, confiance, pages_count, created_at
    ) VALUES (
      v_id, p_entreprise_id, (p_data->>'chantier_id')::uuid,
      coalesce(p_data->>'type_frais', 'Autres'), v_montant_total,
      p_data->>'description', p_data->>'fournisseur_nom', p_data->>'siret',
      (p_data->>'date_frais')::date, p_data->'extraction_json',
      (p_data->>'confiance')::numeric, (p_data->>'pages_count')::integer, now()
    );
  ELSIF p_table = 'tenders' THEN
    INSERT INTO tenders (
      id, entreprise_id, title, buyer, city, postal_code, deadline, budget_min,
      source, extraction_json, confiance, pages_count, created_at
    ) VALUES (
      v_id, p_entreprise_id, p_data->>'title', p_data->>'buyer',
      p_data->>'city', p_data->>'postal_code', (p_data->>'deadline')::date,
      public.safe_num_fr(p_data->>'budget_min'), coalesce(p_data->>'source', 'Import'),
      p_data->'extraction_json', (p_data->>'confiance')::numeric,
      (p_data->>'pages_count')::integer, now()
    );
  END IF;

  RETURN v_id;
END
$$;