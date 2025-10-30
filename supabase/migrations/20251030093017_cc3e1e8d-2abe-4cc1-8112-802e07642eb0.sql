-- Migration: Élargir précision NUMERIC et ajouter bornes sûres

-- 1) Montants (euros) → NUMERIC(16,2) pour éviter overflow
ALTER TABLE factures_fournisseurs
  ALTER COLUMN montant_ht TYPE NUMERIC(16,2),
  ALTER COLUMN tva_montant TYPE NUMERIC(16,2);

-- Note: montant_ttc n'existe pas dans factures_fournisseurs (calculé), on l'ajoute
ALTER TABLE factures_fournisseurs
  ADD COLUMN IF NOT EXISTS montant_ttc NUMERIC(16,2);

ALTER TABLE frais_chantier
  ALTER COLUMN montant_total TYPE NUMERIC(16,2);

-- 2) Pourcentages TVA → NUMERIC(5,2) pour 0..100 avec 2 décimales
ALTER TABLE factures_fournisseurs
  ALTER COLUMN tva_pct TYPE NUMERIC(5,2);

-- 3) Bornes de sécurité
ALTER TABLE factures_fournisseurs
  DROP CONSTRAINT IF EXISTS chk_factures_montants_bounds;

ALTER TABLE factures_fournisseurs
  ADD CONSTRAINT chk_factures_montants_bounds
  CHECK (
    (montant_ht IS NULL OR (montant_ht >= 0 AND montant_ht <= 999999999999.99)) AND
    (tva_montant IS NULL OR (tva_montant >= 0 AND tva_montant <= 999999999999.99)) AND
    (montant_ttc IS NULL OR (montant_ttc >= 0 AND montant_ttc <= 999999999999.99)) AND
    (tva_pct IS NULL OR (tva_pct >= 0 AND tva_pct <= 100))
  );

-- 4) Fonctions SQL de parsing sûr (anti-overflow)

-- Convertit du texte FR → NUMERIC ou NULL (gère espaces, €, milliers, virgule)
CREATE OR REPLACE FUNCTION public.safe_num_fr(p_text text, p_max numeric DEFAULT 999999999999.99)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s text := NULL;
  n numeric := NULL;
BEGIN
  IF p_text IS NULL OR trim(p_text) = '' THEN RETURN NULL; END IF;
  s := p_text;
  -- supprimer €, espaces
  s := replace(replace(replace(s, '€', ''), chr(160), ''), ' ', '');
  -- supprimer points milliers (avant 3 chiffres)
  s := regexp_replace(s, '\.(?=\d{3}(\D|$))', '', 'g');
  -- remplace virgule décimale par point
  s := regexp_replace(s, ',(?=\d{1,2}$)', '.');
  -- enlève tout sauf chiffres, signe et point
  s := regexp_replace(s, '[^0-9\.\-]', '', 'g');
  IF s = '' OR s IS NULL THEN RETURN NULL; END IF;

  BEGIN
    n := s::numeric;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF n < -p_max OR n > p_max THEN
    RETURN NULL;
  END IF;
  RETURN round(n, 2);
END $$;

-- Pourcentages: retourne 0..100 (jamais 0..1)
CREATE OR REPLACE FUNCTION public.safe_pct_fr(p_text text)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  n numeric := public.safe_num_fr(p_text, 1000);
BEGIN
  IF n IS NULL THEN RETURN NULL; END IF;
  -- Si < 1, considérer que c'était un ratio → ramener en %
  IF n < 1 THEN
    n := n * 100;
  END IF;
  IF n < 0 THEN n := 0; END IF;
  IF n > 100 THEN n := 100; END IF;
  RETURN round(n, 2);
END $$;

-- 5) Mise à jour de la RPC insert_extraction_service pour utiliser les fonctions safe
CREATE OR REPLACE FUNCTION public.insert_extraction_service(p_table text, p_data jsonb, p_entreprise_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id UUID;
  r TEXT := public.jwt_role();
  v_montant_ht numeric;
  v_tva_pct numeric;
  v_tva_montant numeric;
  v_montant_ttc numeric;
BEGIN
  -- Autoriser service_role OU user de la même entreprise
  IF NOT (r = 'service_role' OR p_entreprise_id = public.get_current_entreprise()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_table = 'factures_fournisseurs' THEN
    -- Parsing sécurisé avec fonctions SQL
    v_montant_ht := public.safe_num_fr(p_data->>'montant_ht');
    v_tva_pct := public.safe_pct_fr(p_data->>'tva_pct');
    v_tva_montant := public.safe_num_fr(p_data->>'tva_montant');
    v_montant_ttc := public.safe_num_fr(coalesce(p_data->>'montant_ttc', p_data->>'net'));

    INSERT INTO public.factures_fournisseurs (
      entreprise_id, created_by, chantier_id,
      fournisseur, montant_ht, tva_pct, tva_montant, montant_ttc,
      categorie, fichier_url, extraction_json, confiance, siret, date_facture
    ) VALUES (
      p_entreprise_id, auth.uid(),
      (p_data->>'chantier_id')::uuid,
      (p_data->>'fournisseur')::text,
      v_montant_ht,
      v_tva_pct,
      v_tva_montant,
      v_montant_ttc,
      (p_data->>'categorie')::text,
      (p_data->>'fichier_url')::text,
      p_data,
      (p_data->>'confiance')::numeric,
      (p_data->>'siret')::text,
      (p_data->>'date_facture')::date
    )
    RETURNING id INTO new_id;

  ELSIF p_table = 'frais_chantier' THEN
    INSERT INTO public.frais_chantier (
      entreprise_id, created_by, chantier_id,
      type_frais, montant_total, fournisseur_nom, siret,
      date_frais, description, extraction_json, confiance
    ) VALUES (
      p_entreprise_id, auth.uid(),
      (p_data->>'chantier_id')::uuid,
      (p_data->>'type_frais')::text,
      public.safe_num_fr(p_data->>'montant_total'),
      (p_data->>'fournisseur_nom')::text,
      (p_data->>'siret')::text,
      (p_data->>'date_frais')::date,
      (p_data->>'description')::text,
      p_data,
      (p_data->>'confiance')::numeric
    )
    RETURNING id INTO new_id;

  ELSIF p_table = 'tenders' THEN
    INSERT INTO public.tenders (
      entreprise_id, created_by,
      title, buyer, category, description,
      city, postal_code, department,
      budget_min, budget_max, deadline,
      source, source_url, dce_url,
      hash_contenu, extraction_json, confiance
    ) VALUES (
      p_entreprise_id, auth.uid(),
      (p_data->>'title')::text,
      (p_data->>'buyer')::text,
      (p_data->>'category')::text,
      (p_data->>'description')::text,
      (p_data->>'city')::text,
      (p_data->>'postal_code')::text,
      (p_data->>'department')::text,
      public.safe_num_fr(p_data->>'budget_min'),
      public.safe_num_fr(p_data->>'budget_max'),
      (p_data->>'deadline')::date,
      (p_data->>'source')::text,
      (p_data->>'source_url')::text,
      (p_data->>'dce_url')::text,
      (p_data->>'hash')::text,
      p_data,
      (p_data->>'confiance')::numeric
    )
    ON CONFLICT (entreprise_id, hash_contenu) 
    WHERE hash_contenu IS NOT NULL
    DO UPDATE SET
      title = EXCLUDED.title,
      buyer = EXCLUDED.buyer,
      extraction_json = EXCLUDED.extraction_json,
      updated_at = NOW()
    RETURNING id INTO new_id;

  ELSE
    RAISE EXCEPTION 'unsupported table %', p_table;
  END IF;

  RETURN new_id;
END;
$function$;