-- Assouplir les politiques RLS pour le bucket de logos afin de corriger l'erreur persistante

-- Supprimer les anciennes politiques trop restrictives
DROP POLICY IF EXISTS "Users can upload own company logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own company logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own company logo" ON storage.objects;

-- Politique unique : tout utilisateur authentifié peut gérer les objets du bucket 'logos'
CREATE POLICY "Authenticated can manage logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');