-- Fix: rimuove il requisito profile_completed dall'INSERT su reports.
-- Il controllo rimane nel frontend. La RLS richiede solo che l'utente
-- sia autenticato e che user_id corrisponda all'utente loggato.

DROP POLICY IF EXISTS "reports: citizen inserisce con profilo completo" ON public.reports;

CREATE POLICY "reports: citizen inserisce"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
