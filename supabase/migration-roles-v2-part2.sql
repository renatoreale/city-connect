-- ============================================================
-- CivicVoice — Migrazione v2 PARTE 2/2
-- Esegui DOPO migration-roles-v2-part1.sql
-- ============================================================

-- 1. Tabelle geografiche
CREATE TABLE IF NOT EXISTS public.regioni (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.regioni ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.comuni (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  regione_id UUID NOT NULL REFERENCES public.regioni(id) ON DELETE CASCADE,
  provincia  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nome, regione_id)
);
ALTER TABLE public.comuni ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.uffici (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  comune_id  UUID NOT NULL REFERENCES public.comuni(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nome, comune_id)
);
ALTER TABLE public.uffici ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.squadre_lavoro (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  ufficio_id UUID NOT NULL REFERENCES public.uffici(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nome, ufficio_id)
);
ALTER TABLE public.squadre_lavoro ENABLE ROW LEVEL SECURITY;

-- 2. Colonne geografiche in profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS regione_id UUID REFERENCES public.regioni(id),
  ADD COLUMN IF NOT EXISTS comune_id  UUID REFERENCES public.comuni(id),
  ADD COLUMN IF NOT EXISTS ufficio_id UUID REFERENCES public.uffici(id),
  ADD COLUMN IF NOT EXISTS squadra_id UUID REFERENCES public.squadre_lavoro(id);

-- 3. Colonne assegnazione in reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS comune_id  UUID REFERENCES public.comuni(id),
  ADD COLUMN IF NOT EXISTS ufficio_id UUID REFERENCES public.uffici(id),
  ADD COLUMN IF NOT EXISTS squadra_id UUID REFERENCES public.squadre_lavoro(id);

-- 4. Migra ruoli esistenti ai nuovi valori
UPDATE public.profiles SET ruolo = 'super_admin'       WHERE ruolo = 'admin';
UPDATE public.profiles SET ruolo = 'operatore_ufficio' WHERE ruolo = 'manager';
UPDATE public.profiles SET ruolo = 'cittadino'         WHERE ruolo = 'citizen';

-- 5. Funzioni helper geografiche (SECURITY DEFINER = bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_regione_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT regione_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_comune_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT comune_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_ufficio_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT ufficio_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_squadra_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT squadra_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 6. RLS tabelle geografiche
DROP POLICY IF EXISTS "regioni: lettura autenticati" ON public.regioni;
CREATE POLICY "regioni: lettura autenticati"
  ON public.regioni FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "regioni: super_admin gestisce" ON public.regioni;
CREATE POLICY "regioni: super_admin gestisce"
  ON public.regioni FOR ALL USING (public.get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "comuni: lettura autenticati" ON public.comuni;
CREATE POLICY "comuni: lettura autenticati"
  ON public.comuni FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "comuni: admin gestisce" ON public.comuni;
CREATE POLICY "comuni: admin gestisce"
  ON public.comuni FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'admin_regione'));

DROP POLICY IF EXISTS "uffici: lettura autenticati" ON public.uffici;
CREATE POLICY "uffici: lettura autenticati"
  ON public.uffici FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "uffici: admin gestisce" ON public.uffici;
CREATE POLICY "uffici: admin gestisce"
  ON public.uffici FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'admin_regione', 'admin_comune'));

DROP POLICY IF EXISTS "squadre: lettura autenticati" ON public.squadre_lavoro;
CREATE POLICY "squadre: lettura autenticati"
  ON public.squadre_lavoro FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "squadre: admin gestisce" ON public.squadre_lavoro;
CREATE POLICY "squadre: admin gestisce"
  ON public.squadre_lavoro FOR ALL
  USING (public.get_my_role() IN ('super_admin', 'admin_regione', 'admin_comune', 'admin_ufficio'));

-- 7. RLS reports: aggiorna per nuovi ruoli
DROP POLICY IF EXISTS "reports: citizen vede proprie" ON public.reports;
CREATE POLICY "reports: cittadino vede proprie"
  ON public.reports FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports: manager vede tutte" ON public.reports;
CREATE POLICY "reports: staff vede per scope"
  ON public.reports FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'admin_regione'
        AND comune_id IN (SELECT id FROM public.comuni WHERE regione_id = public.get_my_regione_id()))
    OR (public.get_my_role() IN ('admin_comune', 'admin_ufficio', 'operatore_ufficio')
        AND comune_id = public.get_my_comune_id())
    OR (public.get_my_role() = 'squadra_lavoro'
        AND squadra_id = public.get_my_squadra_id())
  );

DROP POLICY IF EXISTS "reports: citizen inserisce con profilo completo" ON public.reports;
DROP POLICY IF EXISTS "reports: citizen inserisce" ON public.reports;
CREATE POLICY "reports: cittadino inserisce"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports: citizen modifica se nuova" ON public.reports;
CREATE POLICY "reports: cittadino modifica se nuova"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id AND stato = 'nuova')
  WITH CHECK (auth.uid() = user_id AND stato = 'nuova');

DROP POLICY IF EXISTS "reports: manager aggiorna" ON public.reports;
CREATE POLICY "reports: staff aggiorna"
  ON public.reports FOR UPDATE
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'admin_regione'
        AND comune_id IN (SELECT id FROM public.comuni WHERE regione_id = public.get_my_regione_id()))
    OR (public.get_my_role() IN ('admin_comune', 'admin_ufficio', 'operatore_ufficio')
        AND comune_id = public.get_my_comune_id())
    OR (public.get_my_role() = 'squadra_lavoro'
        AND squadra_id = public.get_my_squadra_id())
  );

DROP POLICY IF EXISTS "reports: super_admin elimina" ON public.reports;
CREATE POLICY "reports: super_admin elimina"
  ON public.reports FOR DELETE
  USING (public.get_my_role() = 'super_admin');

-- 8. RLS profiles: aggiorna per nuovi ruoli
DROP POLICY IF EXISTS "profiles: admin vede tutti" ON public.profiles;
CREATE POLICY "profiles: admin vede tutti"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() IN ('super_admin', 'admin_regione', 'admin_comune', 'admin_ufficio'));

DROP POLICY IF EXISTS "profiles: admin aggiorna tutti" ON public.profiles;
CREATE POLICY "profiles: admin aggiorna tutti"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() IN ('super_admin', 'admin_regione', 'admin_comune', 'admin_ufficio'));

-- 9. Aggiorna update_report_status per nuovi ruoli
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

  IF v_role NOT IN ('super_admin','admin_regione','admin_comune','admin_ufficio','operatore_ufficio','squadra_lavoro') THEN
    RAISE EXCEPTION 'Accesso negato';
  END IF;

  IF v_role = 'squadra_lavoro' AND p_new_status NOT IN ('in_lavorazione', 'terminata') THEN
    RAISE EXCEPTION 'La squadra può impostare solo: in_lavorazione, terminata';
  END IF;

  SELECT stato INTO v_old_status FROM public.reports WHERE id = p_report_id;

  UPDATE public.reports
  SET stato = p_new_status,
      presa_in_carico_da = CASE
        WHEN p_new_status != 'nuova' AND presa_in_carico_da IS NULL THEN auth.uid()
        ELSE presa_in_carico_da
      END,
      data_chiusura = CASE
        WHEN p_new_status IN ('risolta','respinta','archiviata') AND data_chiusura IS NULL THEN NOW()
        ELSE data_chiusura
      END
  WHERE id = p_report_id;

  INSERT INTO public.status_history (report_id, old_status, new_status, changed_by, note)
  VALUES (p_report_id, v_old_status, p_new_status, auth.uid(), p_note);
END;
$$;

-- 10. RLS status_history: aggiorna per nuovi ruoli
DROP POLICY IF EXISTS "status_history: manager admin vedono tutto" ON public.status_history;
CREATE POLICY "status_history: staff vede tutto"
  ON public.status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id AND (
        r.user_id = auth.uid()
        OR public.get_my_role() IN ('super_admin','admin_regione','admin_comune','admin_ufficio','operatore_ufficio','squadra_lavoro')
      )
    )
  );

DROP POLICY IF EXISTS "status_history: manager admin inseriscono" ON public.status_history;
CREATE POLICY "status_history: staff inserisce"
  ON public.status_history FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('super_admin','admin_regione','admin_comune','admin_ufficio','operatore_ufficio','squadra_lavoro')
  );
