-- ========================================
-- 1) HELPERS + TRIGGERS COMMUNS
-- ========================================

-- 1.1 Rôle JWT (détecte service_role vs authenticated)
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS TEXT 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
AS $$ 
  SELECT COALESCE((auth.jwt() ->> 'role'), '') 
$$;

-- 1.2 Entreprise du user courant
CREATE OR REPLACE FUNCTION public.get_current_entreprise()
RETURNS UUID 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT e.id
  FROM public.entreprises e
  WHERE e.proprietaire_user_id = auth.uid()
  LIMIT 1
$$;

-- 1.3 Trigger automatique : created_by + entreprise_id
CREATE OR REPLACE FUNCTION public.set_enterprise_defaults()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  IF NEW.entreprise_id IS NULL THEN
    NEW.entreprise_id := public.get_current_entreprise();
  END IF;
  RETURN NEW;
END;
$$;

-- ========================================
-- 2) COLONNES + TRIGGERS SUR TABLES MÉTIERS
-- ========================================

-- Factures fournisseurs
ALTER TABLE public.factures_fournisseurs
  ADD COLUMN IF NOT EXISTS entreprise_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

DROP TRIGGER IF EXISTS t_set_defaults_ff ON public.factures_fournisseurs;
CREATE TRIGGER t_set_defaults_ff 
BEFORE INSERT ON public.factures_fournisseurs
FOR EACH ROW EXECUTE FUNCTION public.set_enterprise_defaults();

-- Frais chantier
ALTER TABLE public.frais_chantier
  ADD COLUMN IF NOT EXISTS entreprise_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

DROP TRIGGER IF EXISTS t_set_defaults_fc ON public.frais_chantier;
CREATE TRIGGER t_set_defaults_fc 
BEFORE INSERT ON public.frais_chantier
FOR EACH ROW EXECUTE FUNCTION public.set_enterprise_defaults();

-- Tenders (AO)
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS entreprise_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS hash_contenu TEXT;

DROP TRIGGER IF EXISTS t_set_defaults_tenders ON public.tenders;
CREATE TRIGGER t_set_defaults_tenders 
BEFORE INSERT ON public.tenders
FOR EACH ROW EXECUTE FUNCTION public.set_enterprise_defaults();

-- Tender matches
ALTER TABLE public.tender_matches
  ADD COLUMN IF NOT EXISTS entreprise_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

DROP TRIGGER IF EXISTS t_set_defaults_tm ON public.tender_matches;
CREATE TRIGGER t_set_defaults_tm 
BEFORE INSERT ON public.tender_matches
FOR EACH ROW EXECUTE FUNCTION public.set_enterprise_defaults();

-- Tender inbox
ALTER TABLE public.tender_inbox
  ADD COLUMN IF NOT EXISTS entreprise_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

DROP TRIGGER IF EXISTS t_set_defaults_ti ON public.tender_inbox;
CREATE TRIGGER t_set_defaults_ti 
BEFORE INSERT ON public.tender_inbox
FOR EACH ROW EXECUTE FUNCTION public.set_enterprise_defaults();

-- Templates fournisseurs
ALTER TABLE public.fournisseurs_templates
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

DROP TRIGGER IF EXISTS t_set_defaults_ft ON public.fournisseurs_templates;
CREATE TRIGGER t_set_defaults_ft 
BEFORE INSERT ON public.fournisseurs_templates
FOR EACH ROW EXECUTE FUNCTION public.set_enterprise_defaults();

-- Anti-doublon AO par entreprise
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenders_hash_per_company
ON public.tenders(entreprise_id, hash_contenu)
WHERE hash_contenu IS NOT NULL;

-- ========================================
-- 3) RLS + POLICIES (user OU service_role)
-- ========================================

-- Activer RLS
ALTER TABLE public.factures_fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frais_chantier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fournisseurs_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own invoices" ON public.factures_fournisseurs;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.factures_fournisseurs;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.factures_fournisseurs;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.factures_fournisseurs;

DROP POLICY IF EXISTS "Users can view own expenses" ON public.frais_chantier;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.frais_chantier;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.frais_chantier;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.frais_chantier;

DROP POLICY IF EXISTS "Anyone can view tenders" ON public.tenders;
DROP POLICY IF EXISTS "Authenticated users can insert tenders" ON public.tenders;
DROP POLICY IF EXISTS "Authenticated users can update tenders" ON public.tenders;
DROP POLICY IF EXISTS "Authenticated users can delete tenders" ON public.tenders;

DROP POLICY IF EXISTS "Users can view own matches" ON public.tender_matches;
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON public.tender_matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON public.tender_matches;

DROP POLICY IF EXISTS "Users can view own inbox" ON public.tender_inbox;
DROP POLICY IF EXISTS "Users can insert own inbox" ON public.tender_inbox;
DROP POLICY IF EXISTS "Users can update own inbox" ON public.tender_inbox;
DROP POLICY IF EXISTS "Users can delete own inbox" ON public.tender_inbox;

DROP POLICY IF EXISTS "Users can view own templates" ON public.fournisseurs_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.fournisseurs_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.fournisseurs_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.fournisseurs_templates;

-- FACTURES FOURNISSEURS
CREATE POLICY "ff_select" ON public.factures_fournisseurs
FOR SELECT USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "ff_insert" ON public.factures_fournisseurs
FOR INSERT WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "ff_update" ON public.factures_fournisseurs
FOR UPDATE USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
) WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "ff_delete" ON public.factures_fournisseurs
FOR DELETE USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

-- FRAIS CHANTIER
CREATE POLICY "fc_select" ON public.frais_chantier
FOR SELECT USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "fc_insert" ON public.frais_chantier
FOR INSERT WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "fc_update" ON public.frais_chantier
FOR UPDATE USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
) WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "fc_delete" ON public.frais_chantier
FOR DELETE USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

-- TENDERS
CREATE POLICY "tenders_select" ON public.tenders
FOR SELECT USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "tenders_insert" ON public.tenders
FOR INSERT WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "tenders_update" ON public.tenders
FOR UPDATE USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
) WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "tenders_delete" ON public.tenders
FOR DELETE USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

-- TENDER MATCHES
CREATE POLICY "tm_select" ON public.tender_matches
FOR SELECT USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "tm_insert" ON public.tender_matches
FOR INSERT WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "tm_update" ON public.tender_matches
FOR UPDATE USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
) WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

CREATE POLICY "tm_delete" ON public.tender_matches
FOR DELETE USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

-- TENDER INBOX
CREATE POLICY "ti_all" ON public.tender_inbox
FOR ALL USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
) WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

-- FOURNISSEURS TEMPLATES
CREATE POLICY "ft_all" ON public.fournisseurs_templates
FOR ALL USING (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
) WITH CHECK (
  entreprise_id = public.get_current_entreprise() 
  OR public.jwt_role() = 'service_role'
);

-- ========================================
-- 4) STORAGE POLICIES (buckets documents, factures, devis)
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Policies SELECT
CREATE POLICY "storage_select_own" ON storage.objects
FOR SELECT USING (
  bucket_id IN ('documents', 'factures', 'devis')
  AND (
    (split_part(name, '/', 1))::uuid = public.get_current_entreprise()
    OR public.jwt_role() = 'service_role'
  )
);

-- Policies INSERT
CREATE POLICY "storage_insert_own" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('documents', 'factures', 'devis')
  AND (
    (split_part(name, '/', 1))::uuid = public.get_current_entreprise()
    OR public.jwt_role() = 'service_role'
  )
);

-- Policies UPDATE
CREATE POLICY "storage_update_own" ON storage.objects
FOR UPDATE USING (
  bucket_id IN ('documents', 'factures', 'devis')
  AND (
    (split_part(name, '/', 1))::uuid = public.get_current_entreprise()
    OR public.jwt_role() = 'service_role'
  )
) WITH CHECK (
  bucket_id IN ('documents', 'factures', 'devis')
  AND (
    (split_part(name, '/', 1))::uuid = public.get_current_entreprise()
    OR public.jwt_role() = 'service_role'
  )
);

-- Policies DELETE
CREATE POLICY "storage_delete_own" ON storage.objects
FOR DELETE USING (
  bucket_id IN ('documents', 'factures', 'devis')
  AND (
    (split_part(name, '/', 1))::uuid = public.get_current_entreprise()
    OR public.jwt_role() = 'service_role'
  )
);

-- ========================================
-- 5) RPC SÉCURISÉE POUR INSERTS MULTI-TABLES
-- ========================================

CREATE OR REPLACE FUNCTION public.insert_extraction_service(
  p_table TEXT,
  p_data JSONB,
  p_entreprise_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  r TEXT := public.jwt_role();
BEGIN
  -- Autoriser service_role OU user de la même entreprise
  IF NOT (r = 'service_role' OR p_entreprise_id = public.get_current_entreprise()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_table = 'factures_fournisseurs' THEN
    INSERT INTO public.factures_fournisseurs (
      entreprise_id, created_by, chantier_id,
      fournisseur, montant_ht, tva_pct, tva_montant,
      categorie, fichier_url, extraction_json, confiance, siret, date_facture
    ) VALUES (
      p_entreprise_id, auth.uid(),
      (p_data->>'chantier_id')::uuid,
      (p_data->>'fournisseur')::text,
      (p_data->>'montant_ht')::numeric,
      (p_data->>'tva_pct')::numeric,
      (p_data->>'tva_montant')::numeric,
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
      (p_data->>'montant_total')::numeric,
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
      (p_data->>'budget_min')::numeric,
      (p_data->>'budget_max')::numeric,
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
$$;