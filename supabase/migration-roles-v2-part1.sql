-- ============================================================
-- CivicVoice — Migrazione v2 PARTE 1/2
-- Esegui QUESTO PRIMO, poi esegui migration-roles-v2-part2.sql
-- ============================================================

-- Aggiunge nuovi valori enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin_regione';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin_comune';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin_ufficio';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'operatore_ufficio';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'squadra_lavoro';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'cittadino';

-- Aggiunge nuovo status report
ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'terminata' AFTER 'in_lavorazione';
