-- ============================================================
-- CivicVoice — Storage Setup
-- PASSO 1: esegui questo file DOPO aver creato i bucket
--   manualmente in Supabase Dashboard > Storage > New bucket:
--   - "report-photos"  (Public: NO)
--   - "avatars"        (Public: SI)
-- PASSO 2: incolla ed esegui questo file nell'SQL Editor
-- ============================================================

-- RLS bucket: report-photos
-- Il citizen può caricare foto solo nella propria cartella (path: userId/reportId/...)
CREATE POLICY "report-photos: citizen carica"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'report-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Il citizen può leggere solo le proprie foto
CREATE POLICY "report-photos: proprietario legge"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Manager e admin possono leggere tutte le foto delle segnalazioni
CREATE POLICY "report-photos: manager admin leggono"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND ruolo IN ('manager', 'admin')
    )
  );

-- Il citizen può eliminare le proprie foto
CREATE POLICY "report-photos: proprietario elimina"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'report-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS bucket: avatars
-- Chiunque autenticato può caricare il proprio avatar
CREATE POLICY "avatars: utente carica proprio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Tutti possono leggere gli avatar (bucket pubblico)
CREATE POLICY "avatars: lettura pubblica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- L'utente può aggiornare il proprio avatar
CREATE POLICY "avatars: utente aggiorna proprio"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
