-- A. Supprimer et recréer tous les triggers
DROP TRIGGER IF EXISTS t_recalc_eq ON equipe_chantier CASCADE;
DROP TRIGGER IF EXISTS t_recalc_frais ON frais_chantier CASCADE;
DROP TRIGGER IF EXISTS t_recalc_fact ON factures_fournisseurs CASCADE;
DROP TRIGGER IF EXISTS t_recalc_ch ON chantiers CASCADE;
DROP TRIGGER IF EXISTS t_recalc_membres ON membres_equipe CASCADE;

-- B. Recréer les triggers (AFTER pour éviter les problèmes de timing)
CREATE TRIGGER t_recalc_eq 
AFTER INSERT OR UPDATE OR DELETE ON equipe_chantier
FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

CREATE TRIGGER t_recalc_frais 
AFTER INSERT OR UPDATE OR DELETE ON frais_chantier
FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

CREATE TRIGGER t_recalc_fact 
AFTER INSERT OR UPDATE OR DELETE ON factures_fournisseurs
FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

CREATE TRIGGER t_recalc_ch 
AFTER INSERT OR UPDATE ON chantiers
FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

CREATE TRIGGER t_recalc_membres 
AFTER UPDATE ON membres_equipe
FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

-- C. Initialiser les métriques pour TOUS les chantiers existants
INSERT INTO chantier_metrics_realtime(chantier_id, metrics, updated_at)
SELECT 
  id,
  compute_chantier_metrics(id),
  now()
FROM chantiers
ON CONFLICT (chantier_id) 
DO UPDATE SET 
  metrics = EXCLUDED.metrics, 
  updated_at = now();

-- D. S'assurer que la table est publiée pour Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chantier_metrics_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chantier_metrics_realtime;
  END IF;
END$$;

-- E. Ajouter des valeurs par défaut pour les chantiers sans budget
UPDATE chantiers
SET 
  budget_ht = 10000,
  duree_estimee_jours = 30
WHERE budget_ht IS NULL 
   OR duree_estimee_jours IS NULL 
   OR budget_ht = 0;

-- F. Définir des contraintes pour éviter les NULL à l'avenir
ALTER TABLE chantiers 
  ALTER COLUMN budget_ht SET DEFAULT 0,
  ALTER COLUMN duree_estimee_jours SET DEFAULT 30;