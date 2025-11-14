-- Créer la table des équipes nommées
CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  specialite TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter une colonne equipe_id à membres_equipe (optionnelle, un membre peut ne pas être dans une équipe)
ALTER TABLE public.membres_equipe 
ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL;

-- Créer la table des affectations temporelles
CREATE TABLE IF NOT EXISTS public.affectations_chantiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  membre_equipe_id UUID NOT NULL REFERENCES public.membres_equipe(id) ON DELETE CASCADE,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL,
  
  -- Période d'affectation
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  
  -- Temps de travail
  jours_travailles DECIMAL(5,2) NOT NULL CHECK (jours_travailles > 0),
  heures_par_jour DECIMAL(4,2) DEFAULT 7 CHECK (heures_par_jour > 0),
  
  -- Taux spécifique (si différent du taux habituel du membre)
  taux_horaire_specifique DECIMAL(8,2),
  
  -- Charges (copiées depuis membre pour historique figé)
  charges_salariales_pct DECIMAL(5,2),
  charges_patronales_pct DECIMAL(5,2),
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte de validation des dates
  CONSTRAINT valid_dates CHECK (date_fin >= date_debut)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_affectations_membre ON public.affectations_chantiers(membre_equipe_id);
CREATE INDEX IF NOT EXISTS idx_affectations_chantier ON public.affectations_chantiers(chantier_id);
CREATE INDEX IF NOT EXISTS idx_affectations_dates ON public.affectations_chantiers(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_affectations_equipe ON public.affectations_chantiers(equipe_id);
CREATE INDEX IF NOT EXISTS idx_equipes_entreprise ON public.equipes(entreprise_id);

-- Row Level Security pour equipes
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own teams" ON public.equipes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entreprises e
      WHERE e.id = equipes.entreprise_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own teams" ON public.equipes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entreprises e
      WHERE e.id = equipes.entreprise_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own teams" ON public.equipes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.entreprises e
      WHERE e.id = equipes.entreprise_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own teams" ON public.equipes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.entreprises e
      WHERE e.id = equipes.entreprise_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

-- Row Level Security pour affectations_chantiers
ALTER TABLE public.affectations_chantiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON public.affectations_chantiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chantiers c
      JOIN public.entreprises e ON e.id = c.entreprise_id
      WHERE c.id = affectations_chantiers.chantier_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own assignments" ON public.affectations_chantiers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chantiers c
      JOIN public.entreprises e ON e.id = c.entreprise_id
      WHERE c.id = affectations_chantiers.chantier_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own assignments" ON public.affectations_chantiers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chantiers c
      JOIN public.entreprises e ON e.id = c.entreprise_id
      WHERE c.id = affectations_chantiers.chantier_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own assignments" ON public.affectations_chantiers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chantiers c
      JOIN public.entreprises e ON e.id = c.entreprise_id
      WHERE c.id = affectations_chantiers.chantier_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_equipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipes_timestamp
  BEFORE UPDATE ON public.equipes
  FOR EACH ROW
  EXECUTE FUNCTION update_equipes_updated_at();

CREATE TRIGGER update_affectations_timestamp
  BEFORE UPDATE ON public.affectations_chantiers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();