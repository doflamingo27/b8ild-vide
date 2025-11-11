-- Corriger compute_chantier_metrics pour utiliser date_debut_prevue
CREATE OR REPLACE FUNCTION public.compute_chantier_metrics(p_chantier uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  -- Récupérer les infos du chantier (utilise date_debut_prevue au lieu de date_debut)
  SELECT COALESCE(budget_ht, 0), date_debut_prevue, COALESCE(duree_estimee_jours, 0)
    INTO _budget_ht, _date_debut, _duree_estimee
  FROM chantiers WHERE id = p_chantier;

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

  -- Jours écoulés depuis le début (plafonnés à la durée estimée)
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

  -- Statut couleur selon les règles
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

  -- Retourne date_debut (qui référence date_debut_prevue) pour compatibilité avec l'interface TypeScript
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