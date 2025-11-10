-- ==========================================
-- PARTIE 1 : CORRECTION CRITIQUE - safe_num_fr
-- ==========================================

CREATE OR REPLACE FUNCTION public.safe_num_fr(p_text text, p_max numeric DEFAULT 999999999999.99)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE 
  s text; 
  n numeric;
BEGIN
  IF p_text IS NULL THEN RETURN NULL; END IF;
  
  -- Supprimer espaces insécables, €, espaces
  s := regexp_replace(p_text, '\u00A0', ' ', 'g');
  s := replace(replace(s, '€', ''), ' ', '');
  
  -- Si contient . ET , → . = milliers, , = décimale
  IF position('.' in s) > 0 AND position(',' in s) > 0 THEN
    s := replace(replace(s, '.', ''), ',', '.');
  ELSE
    -- Si seule virgule avec 1-2 décimales : remplacer par point
    s := regexp_replace(s, ',(?=\d{1,2}$)', '.', 'g');
    -- Sinon, supprimer points-milliers
    s := regexp_replace(s, '\.(?=\d{3}(?!\d))', '', 'g');
  END IF;
  
  -- Garder seulement chiffres, point, signe
  s := regexp_replace(s, '[^0-9\.\-]', '', 'g');
  
  IF s IS NULL OR s = '' OR s = '-' THEN RETURN NULL; END IF;
  
  BEGIN
    n := s::numeric;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  
  IF n < -p_max OR n > p_max THEN RETURN NULL; END IF;
  
  RETURN n;
END$function$;

-- ==========================================
-- PARTIE 2 : AMÉLIORATION CRÉATION CHANTIER
-- ==========================================

-- Ajouter les nouvelles colonnes si elles n'existent pas
ALTER TABLE chantiers 
  ADD COLUMN IF NOT EXISTS date_debut_reelle DATE,
  ADD COLUMN IF NOT EXISTS date_fin_estimee DATE,
  ADD COLUMN IF NOT EXISTS date_fin_reelle DATE,
  ADD COLUMN IF NOT EXISTS etat_chantier TEXT DEFAULT 'brouillon';

-- Ajouter une contrainte pour les états valides
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_etat_chantier'
  ) THEN
    ALTER TABLE chantiers 
      ADD CONSTRAINT chk_etat_chantier 
      CHECK (etat_chantier IN ('brouillon', 'projection', 'attente_signature', 'en_cours', 'suspendu', 'termine', 'annule'));
  END IF;
END $$;

-- Renommer la colonne existante date_debut en date_debut_prevue si nécessaire
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chantiers' 
    AND column_name = 'date_debut'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chantiers' 
    AND column_name = 'date_debut_prevue'
  ) THEN
    ALTER TABLE chantiers RENAME COLUMN date_debut TO date_debut_prevue;
  END IF;
END $$;