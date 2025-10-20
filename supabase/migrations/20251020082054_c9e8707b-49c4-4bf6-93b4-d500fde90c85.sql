-- RLS policies pour permettre l'upload temporaire et la lecture des fichiers OCR

-- Policy pour upload temporaire dans factures
CREATE POLICY "Users can upload temp files to factures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'factures' AND 
  (storage.foldername(name))[1] LIKE 'temp-%'
);

-- Policy pour upload temporaire dans devis
CREATE POLICY "Users can upload temp files to devis"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'devis' AND 
  (storage.foldername(name))[1] LIKE 'temp-%'
);

-- Policy pour lire les fichiers via signed URLs (factures)
CREATE POLICY "Users can read factures files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'factures');

-- Policy pour lire les fichiers via signed URLs (devis)
CREATE POLICY "Users can read devis files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'devis');