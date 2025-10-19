-- ============================================
-- TABLES APPELS D'OFFRES (TENDERS)
-- ============================================

-- Table des profils d'alerte AO
CREATE TABLE IF NOT EXISTS public.tender_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  zone_type TEXT NOT NULL DEFAULT 'national',
  departments TEXT[] DEFAULT '{}',
  radius_km INTEGER,
  budget_min NUMERIC,
  budget_max NUMERIC,
  certifications TEXT[] DEFAULT '{}',
  alert_email BOOLEAN NOT NULL DEFAULT true,
  alert_push BOOLEAN NOT NULL DEFAULT true,
  score_threshold INTEGER NOT NULL DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Table des appels d'offres
CREATE TABLE IF NOT EXISTS public.tenders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  buyer TEXT NOT NULL,
  city TEXT,
  department TEXT,
  postal_code TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  deadline DATE,
  category TEXT,
  description TEXT,
  source TEXT,
  source_url TEXT,
  dce_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des matchs AO/profil
CREATE TABLE IF NOT EXISTS public.tender_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  match_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tender_id, user_id)
);

-- Table inbox emails AO
CREATE TABLE IF NOT EXISTS public.tender_inbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'ignored')),
  tender_id UUID REFERENCES public.tenders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_tenders_deadline ON public.tenders(deadline);
CREATE INDEX IF NOT EXISTS idx_tenders_department ON public.tenders(department);
CREATE INDEX IF NOT EXISTS idx_tender_matches_user ON public.tender_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_tender_matches_score ON public.tender_matches(score DESC);
CREATE INDEX IF NOT EXISTS idx_tender_inbox_user_status ON public.tender_inbox(user_id, status);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.tender_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_inbox ENABLE ROW LEVEL SECURITY;

-- Policies tender_profiles
CREATE POLICY "Users can view own tender profile"
ON public.tender_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tender profile"
ON public.tender_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tender profile"
ON public.tender_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tender profile"
ON public.tender_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Policies tenders (lecture publique pour matching)
CREATE POLICY "Anyone can view tenders"
ON public.tenders FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert tenders"
ON public.tenders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tenders"
ON public.tenders FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete tenders"
ON public.tenders FOR DELETE
TO authenticated
USING (true);

-- Policies tender_matches
CREATE POLICY "Users can view own matches"
ON public.tender_matches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert matches"
ON public.tender_matches FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete matches"
ON public.tender_matches FOR DELETE
TO authenticated
USING (true);

-- Policies tender_inbox
CREATE POLICY "Users can view own inbox"
ON public.tender_inbox FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inbox"
ON public.tender_inbox FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inbox"
ON public.tender_inbox FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inbox"
ON public.tender_inbox FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_tender_profiles_updated_at
BEFORE UPDATE ON public.tender_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tenders_updated_at
BEFORE UPDATE ON public.tenders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();