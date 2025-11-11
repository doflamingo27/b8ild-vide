-- ========================================
-- ÉTAPE 1 : Enrichir la table devis
-- ========================================

-- Ajouter colonnes pour multi-devis
ALTER TABLE public.devis 
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'V1',
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse')),
ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS date_envoi DATE,
ADD COLUMN IF NOT EXISTS date_acceptation DATE,
ADD COLUMN IF NOT EXISTS extraction_json JSONB,
ADD COLUMN IF NOT EXISTS confiance NUMERIC,
ADD COLUMN IF NOT EXISTS pages_count INTEGER;

-- Contrainte : Un seul devis actif par chantier
CREATE UNIQUE INDEX IF NOT EXISTS idx_devis_actif_unique 
ON public.devis (chantier_id) 
WHERE actif = true;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_devis_chantier_statut ON public.devis(chantier_id, statut);
CREATE INDEX IF NOT EXISTS idx_devis_actif ON public.devis(actif) WHERE actif = true;

-- ========================================
-- ÉTAPE 2 : Modifier compute_chantier_metrics
-- ========================================

CREATE OR REPLACE FUNCTION public.compute_chantier_metrics(p_chantier UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _budget_ht NUMERIC := 0;
  _date_debut DATE;
  _duree_estimee INTEGER := 0;
  _cout_jour_equipe NUMERIC := 0;
  _couts_fixes NUMERIC := 0;
  _jours_ecoules INTEGER := 0;
  _mo_reel NUMERIC := 0;
  _marge_a_date NUMERIC := 0;
  _profit_pct NUMERIC := 0;
  _budget_dispo NUMERIC := 0;
  _jour_critique NUMERIC := NULL;
  _jours_restants_rentables NUMERIC := NULL;
  _statut TEXT := 'VERT';
BEGIN
  -- ✅ Récupérer le budget depuis le devis actif (priorité) ou chantiers.budget_ht (fallback)
  SELECT 
    COALESCE(
      (SELECT montant_ttc FROM devis WHERE chantier_id = p_chantier AND actif = true LIMIT 1),
      c.budget_ht,
      0
    ),
    c.date_debut_prevue,
    COALESCE(c.duree_estimee_jours, 0)
  INTO _budget_ht, _date_debut, _duree_estimee
  FROM chantiers c
  WHERE c.id = p_chantier;

  -- Coût journalier équipe (8h/jour)
  SELECT COALESCE(SUM(
    (m.taux_horaire * (1 + COALESCE(m.charges_salariales, 0)/100 + COALESCE(m.charges_patronales, 0)/100)) * 8
  ), 0)
  INTO _cout_jour_equipe
  FROM equipe_chantier ec
  JOIN membres_equipe m ON m.id = ec.membre_id
  WHERE ec.chantier_id = p_chantier AND m.actif = true;

  -- Coûts fixes engagés (frais + factures)
  SELECT COALESCE(SUM(montant_total), 0) INTO _couts_fixes
  FROM frais_chantier WHERE chantier_id = p_chantier;

  _couts_fixes := _couts_fixes + COALESCE(
    (SELECT SUM(COALESCE(montant_ttc, montant_ht, 0)) 
     FROM factures_fournisseurs 
     WHERE chantier_id = p_chantier), 0
  );

  -- Jours écoulés depuis le début
  IF _date_debut IS NOT NULL THEN
    _jours_ecoules := GREATEST(0, LEAST(_duree_estimee, (CURRENT_DATE - _date_debut)));
  ELSE
    _jours_ecoules := 0;
  END IF;

  -- Coût main d'œuvre réel
  _mo_reel := _jours_ecoules * _cout_jour_equipe;

  -- Marge à date et profitabilité
  _marge_a_date := _budget_ht - (_couts_fixes + _mo_reel);
  
  IF _budget_ht > 0 THEN
    _profit_pct := ROUND((_marge_a_date / _budget_ht) * 100, 2);
  ELSE
    _profit_pct := 0;
  END IF;

  -- Budget disponible et jour critique
  _budget_dispo := _budget_ht - _couts_fixes;
  
  IF _cout_jour_equipe > 0 THEN
    _jour_critique := (_budget_dispo / _cout_jour_equipe);
    _jours_restants_rentables := FLOOR(_jour_critique - _jours_ecoules);
  ELSE
    _jour_critique := NULL;
    _jours_restants_rentables := NULL;
  END IF;

  -- Statut couleur
  IF _jours_restants_rentables IS NOT NULL THEN
    IF _jours_restants_rentables >= 7 AND _profit_pct >= 10 THEN
      _statut := 'VERT';
    ELSIF (_jours_restants_rentables BETWEEN 3 AND 6) OR (_profit_pct BETWEEN 0 AND 9.99) THEN
      _statut := 'JAUNE';
    ELSIF (_jours_restants_rentables BETWEEN 1 AND 2) OR (_profit_pct BETWEEN -10 AND -0.01) THEN
      _statut := 'ORANGE';
    ELSE
      _statut := 'ROUGE';
    END IF;
  ELSIF _profit_pct >= 10 THEN
    _statut := 'VERT';
  ELSIF _profit_pct < -10 THEN
    _statut := 'ROUGE';
  ELSE
    _statut := 'JAUNE';
  END IF;

  RETURN jsonb_build_object(
    'budget_ht', ROUND(_budget_ht, 2),
    'date_debut', _date_debut,
    'duree_estimee_jours', _duree_estimee,
    'cout_journalier_equipe', ROUND(_cout_jour_equipe, 2),
    'couts_fixes_engages', ROUND(_couts_fixes, 2),
    'jours_ecoules', _jours_ecoules,
    'cout_main_oeuvre_reel', ROUND(_mo_reel, 2),
    'marge_a_date', ROUND(_marge_a_date, 2),
    'profitability_pct', _profit_pct,
    'budget_disponible', ROUND(_budget_dispo, 2),
    'jour_critique', _jour_critique,
    'jours_restants_rentables', _jours_restants_rentables,
    'statut_rentabilite', _statut
  );
END;
$function$;

-- ========================================
-- ÉTAPE 3 : Trigger pour sync budget
-- ========================================

CREATE OR REPLACE FUNCTION public.sync_budget_from_devis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Si le devis devient actif, mettre à jour chantiers.budget_ht
  IF NEW.actif = true THEN
    UPDATE chantiers
    SET budget_ht = NEW.montant_ttc
    WHERE id = NEW.chantier_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trg_sync_budget_devis ON public.devis;
CREATE TRIGGER trg_sync_budget_devis
AFTER INSERT OR UPDATE OF actif, montant_ttc ON public.devis
FOR EACH ROW
WHEN (NEW.actif = true)
EXECUTE FUNCTION public.sync_budget_from_devis();

-- ========================================
-- ÉTAPE 4 : Fonction RPC pour insert_devis_extraction
-- ========================================

CREATE OR REPLACE FUNCTION public.insert_devis_extraction(
  p_entreprise_id UUID,
  p_chantier_id UUID,
  p_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_id UUID;
  v_montant_ht NUMERIC;
  v_tva NUMERIC;
  v_montant_ttc NUMERIC;
  v_version TEXT;
  v_max_version INT;
BEGIN
  -- Vérifier les permissions
  IF p_entreprise_id != get_current_entreprise() AND jwt_role() != 'service_role' THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_id := gen_random_uuid();

  -- Parser les montants
  v_montant_ht := public.safe_num_fr(p_data->>'montant_ht');
  v_tva := public.safe_pct_fr(p_data->>'tva');
  v_montant_ttc := public.safe_num_fr(p_data->>'montant_ttc');

  -- Auto-incrémenter la version
  SELECT COALESCE(MAX(CAST(REPLACE(version, 'V', '') AS INTEGER)), 0) + 1
  INTO v_max_version
  FROM devis
  WHERE chantier_id = p_chantier_id;
  
  v_version := 'V' || v_max_version;

  -- Désactiver les autres devis si c'est le premier
  IF v_max_version = 1 THEN
    UPDATE devis SET actif = false WHERE chantier_id = p_chantier_id;
  END IF;

  -- Insérer le nouveau devis
  INSERT INTO devis (
    id, chantier_id, montant_ht, tva, montant_ttc, version, statut, actif,
    extraction_json, confiance, pages_count, created_at
  ) VALUES (
    v_id, p_chantier_id, v_montant_ht, v_tva, v_montant_ttc, v_version,
    COALESCE(p_data->>'statut', 'brouillon'),
    COALESCE((p_data->>'actif')::BOOLEAN, (v_max_version = 1)), -- Premier devis = actif
    p_data->'extraction_json',
    (p_data->>'confiance')::NUMERIC,
    (p_data->>'pages_count')::INTEGER,
    NOW()
  );

  RETURN v_id;
END;
$function$;