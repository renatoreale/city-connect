-- ============================================================
-- CivicVoice — Schema Supabase completo (idempotente)
-- Può essere rieseguito senza errori anche se già applicato.
-- Eseguire nell'SQL Editor di Supabase Dashboard.
-- ============================================================

-- ============================================================
-- ENUM (ignorati se già esistono)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('citizen', 'manager', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM (
    'nuova', 'in_valutazione', 'assegnata',
    'in_lavorazione', 'risolta', 'respinta', 'archiviata'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_priority AS ENUM ('bassa', 'media', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- FUNZIONI di supporto (CREATE OR REPLACE = idempotente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABELLA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL DEFAULT '',
  cognome          TEXT NOT NULL DEFAULT '',
  telefono         TEXT,
  codice_fiscale   TEXT,
  foto_profilo_url TEXT,
  ruolo            public.user_role NOT NULL DEFAULT 'citizen',
  citta            TEXT,
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "profiles: utente vede solo se stesso" ON public.profiles;
CREATE POLICY "profiles: utente vede solo se stesso"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: utente aggiorna solo se stesso" ON public.profiles;
CREATE POLICY "profiles: utente aggiorna solo se stesso"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: admin vede tutti" ON public.profiles;
CREATE POLICY "profiles: admin vede tutti"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.ruolo = 'admin'
    )
  );

DROP POLICY IF EXISTS "profiles: admin aggiorna tutti" ON public.profiles;
CREATE POLICY "profiles: admin aggiorna tutti"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.ruolo = 'admin'
    )
  );

-- ============================================================
-- TABELLA: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  icona      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories: lettura pubblica" ON public.categories;
CREATE POLICY "categories: lettura pubblica"
  ON public.categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "categories: solo admin inserisce" ON public.categories;
CREATE POLICY "categories: solo admin inserisce"
  ON public.categories FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );

DROP POLICY IF EXISTS "categories: solo admin aggiorna" ON public.categories;
CREATE POLICY "categories: solo admin aggiorna"
  ON public.categories FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );

DROP POLICY IF EXISTS "categories: solo admin elimina" ON public.categories;
CREATE POLICY "categories: solo admin elimina"
  ON public.categories FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );

INSERT INTO public.categories (nome, icona) VALUES
  ('Strade e marciapiedi', '🛣️'),
  ('Illuminazione pubblica', '💡'),
  ('Rifiuti e decoro urbano', '🗑️'),
  ('Verde pubblico', '🌳'),
  ('Viabilità e sosta', '🚗'),
  ('Segnaletica', '🚧'),
  ('Barriere architettoniche', '♿'),
  ('Acqua e fognature', '💧'),
  ('Edifici pubblici', '🏛️'),
  ('Sicurezza urbana', '🔒'),
  ('Altro', '📋')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- TABELLA: sectors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sectors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sectors: lettura pubblica" ON public.sectors;
CREATE POLICY "sectors: lettura pubblica"
  ON public.sectors FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "sectors: solo admin inserisce" ON public.sectors;
CREATE POLICY "sectors: solo admin inserisce"
  ON public.sectors FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );

DROP POLICY IF EXISTS "sectors: solo admin aggiorna" ON public.sectors;
CREATE POLICY "sectors: solo admin aggiorna"
  ON public.sectors FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );

DROP POLICY IF EXISTS "sectors: solo admin elimina" ON public.sectors;
CREATE POLICY "sectors: solo admin elimina"
  ON public.sectors FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );

INSERT INTO public.sectors (nome) VALUES
  ('Ufficio Tecnico'),
  ('Polizia Municipale'),
  ('Ambiente'),
  ('Manutenzione Strade'),
  ('Verde Pubblico'),
  ('Servizi Sociali'),
  ('Protezione Civile'),
  ('Urbanistica'),
  ('Pubblica Illuminazione'),
  ('Ufficio Lavori Pubblici')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- TABELLA: reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titolo                 TEXT NOT NULL,
  descrizione            TEXT NOT NULL,
  citta                  TEXT NOT NULL,
  provincia              TEXT,
  cap                    TEXT,
  via                    TEXT NOT NULL,
  numero_civico          TEXT,
  latitudine             DOUBLE PRECISION,
  longitudine            DOUBLE PRECISION,
  riferimenti_aggiuntivi TEXT,
  categoria_id           UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  settore_id             UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  stato                  public.report_status NOT NULL DEFAULT 'nuova',
  priorita               public.report_priority NOT NULL DEFAULT 'media',
  presa_in_carico_da     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note_manager           TEXT,
  note_admin             TEXT,
  motivo_respinta        TEXT,
  data_chiusura          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id    ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_stato      ON public.reports(stato);
CREATE INDEX IF NOT EXISTS idx_reports_citta      ON public.reports(citta);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "reports: citizen vede proprie" ON public.reports;
CREATE POLICY "reports: citizen vede proprie"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports: manager vede tutte" ON public.reports;
CREATE POLICY "reports: manager vede tutte"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND ruolo IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "reports: citizen inserisce con profilo completo" ON public.reports;
CREATE POLICY "reports: citizen inserisce con profilo completo"
  ON public.reports FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND profile_completed = TRUE
    )
  );

DROP POLICY IF EXISTS "reports: citizen modifica se nuova" ON public.reports;
CREATE POLICY "reports: citizen modifica se nuova"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id AND stato = 'nuova')
  WITH CHECK (auth.uid() = user_id AND stato = 'nuova');

DROP POLICY IF EXISTS "reports: manager aggiorna" ON public.reports;
CREATE POLICY "reports: manager aggiorna"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND ruolo IN ('manager', 'admin')
    )
  );

-- ============================================================
-- VIEW: reports_for_manager (anonimizzata)
-- ============================================================
CREATE OR REPLACE VIEW public.reports_for_manager
WITH (security_invoker = TRUE) AS
SELECT
  r.id,
  r.titolo,
  r.descrizione,
  r.citta,
  r.provincia,
  r.cap,
  r.via,
  r.numero_civico,
  r.latitudine,
  r.longitudine,
  r.riferimenti_aggiuntivi,
  r.categoria_id,
  r.settore_id,
  r.stato,
  r.priorita,
  r.note_manager,
  r.motivo_respinta,
  r.data_chiusura,
  r.created_at,
  r.updated_at,
  c.nome AS categoria_nome,
  s.nome AS settore_nome
FROM public.reports r
LEFT JOIN public.categories c ON c.id = r.categoria_id
LEFT JOIN public.sectors   s ON s.id = r.settore_id;

-- ============================================================
-- TABELLA: report_photos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  file_url   TEXT NOT NULL,
  file_path  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_photos_report_id ON public.report_photos(report_id);

ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_photos: citizen vede proprie" ON public.report_photos;
CREATE POLICY "report_photos: citizen vede proprie"
  ON public.report_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE id = report_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "report_photos: manager admin vedono tutte" ON public.report_photos;
CREATE POLICY "report_photos: manager admin vedono tutte"
  ON public.report_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND ruolo IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "report_photos: citizen inserisce per proprie" ON public.report_photos;
CREATE POLICY "report_photos: citizen inserisce per proprie"
  ON public.report_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE id = report_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "report_photos: citizen elimina foto se nuova" ON public.report_photos;
CREATE POLICY "report_photos: citizen elimina foto se nuova"
  ON public.report_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE id = report_id AND user_id = auth.uid() AND stato = 'nuova'
    )
  );

-- ============================================================
-- TABELLA: status_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.status_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  old_status public.report_status,
  new_status public.report_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_report_id ON public.status_history(report_id);

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_history: citizen vede proprie" ON public.status_history;
CREATE POLICY "status_history: citizen vede proprie"
  ON public.status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE id = report_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "status_history: manager admin vedono tutto" ON public.status_history;
CREATE POLICY "status_history: manager admin vedono tutto"
  ON public.status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND ruolo IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "status_history: manager admin inseriscono" ON public.status_history;
CREATE POLICY "status_history: manager admin inseriscono"
  ON public.status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND ruolo IN ('manager', 'admin')
    )
  );

-- ============================================================
-- FUNZIONE RPC: aggiorna stato con log automatico
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_report_status(
  p_report_id UUID,
  p_new_status public.report_status,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_status public.report_status;
  v_role       public.user_role;
BEGIN
  SELECT ruolo INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION 'Accesso negato';
  END IF;

  SELECT stato INTO v_old_status FROM public.reports WHERE id = p_report_id;

  UPDATE public.reports
  SET stato = p_new_status,
      presa_in_carico_da = CASE
        WHEN p_new_status != 'nuova' AND presa_in_carico_da IS NULL THEN auth.uid()
        ELSE presa_in_carico_da
      END,
      data_chiusura = CASE
        WHEN p_new_status IN ('risolta', 'respinta', 'archiviata') AND data_chiusura IS NULL
        THEN NOW()
        ELSE data_chiusura
      END
  WHERE id = p_report_id;

  INSERT INTO public.status_history (report_id, old_status, new_status, changed_by, note)
  VALUES (p_report_id, v_old_status, p_new_status, auth.uid(), p_note);
END;
$$;

-- Fine schema principale.
-- Per lo storage eseguire: supabase/storage-setup.sql
