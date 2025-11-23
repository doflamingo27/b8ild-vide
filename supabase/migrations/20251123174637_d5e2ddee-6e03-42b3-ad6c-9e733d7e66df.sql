
-- Activer Realtime pour la table membres_equipe
ALTER PUBLICATION supabase_realtime ADD TABLE membres_equipe;

-- S'assurer que la table a REPLICA IDENTITY FULL pour capturer toutes les données lors des updates
ALTER TABLE membres_equipe REPLICA IDENTITY FULL;
