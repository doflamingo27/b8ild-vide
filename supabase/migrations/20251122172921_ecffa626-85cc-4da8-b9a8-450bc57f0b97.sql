-- Politiques RLS pour le bucket logos
-- Permettre aux utilisateurs de télécharger leur propre logo

-- Politique pour permettre l'upload (INSERT)
CREATE POLICY "Users can upload own company logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre la mise à jour (UPDATE)
CREATE POLICY "Users can update own company logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre la suppression (DELETE)
CREATE POLICY "Users can delete own company logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);