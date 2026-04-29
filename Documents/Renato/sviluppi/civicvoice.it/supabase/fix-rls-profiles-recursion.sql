-- Fix: infinite recursion in profiles RLS policies
--
-- Problema: le policy "admin vede tutti" e "admin aggiorna tutti" su profiles
-- fanno EXISTS (SELECT 1 FROM public.profiles ...) dentro una policy che è già
-- su profiles — Postgres entra in ricorsione infinita.
--
-- Soluzione: una funzione SECURITY DEFINER bypassa RLS quando legge profiles,
-- spezzando il loop.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ruolo FROM public.profiles WHERE id = auth.uid()
$$;

-- Riscrive le due policy ricorsive usando la funzione helper

DROP POLICY IF EXISTS "profiles: admin vede tutti" ON public.profiles;
CREATE POLICY "profiles: admin vede tutti"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profiles: admin aggiorna tutti" ON public.profiles;
CREATE POLICY "profiles: admin aggiorna tutti"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');
