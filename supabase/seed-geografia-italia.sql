-- ============================================================
-- CivicVoice — Seed: Regioni, Capoluoghi di Provincia, Uffici
-- 20 regioni · 107 capoluoghi · 10 uffici × comune = 1.070 uffici
-- Idempotente: ON CONFLICT DO NOTHING
-- ============================================================

-- 1. REGIONI
INSERT INTO public.regioni (nome) VALUES
  ('Abruzzo'),('Basilicata'),('Calabria'),('Campania'),('Emilia-Romagna'),
  ('Friuli-Venezia Giulia'),('Lazio'),('Liguria'),('Lombardia'),('Marche'),
  ('Molise'),('Piemonte'),('Puglia'),('Sardegna'),('Sicilia'),
  ('Toscana'),('Trentino-Alto Adige'),('Umbria'),('Valle d''Aosta'),('Veneto')
ON CONFLICT (nome) DO NOTHING;

-- 2. COMUNI (capoluoghi di provincia)
INSERT INTO public.comuni (nome, regione_id, provincia) VALUES
  -- ABRUZZO
  ('L''Aquila',  (SELECT id FROM public.regioni WHERE nome='Abruzzo'), 'AQ'),
  ('Chieti',     (SELECT id FROM public.regioni WHERE nome='Abruzzo'), 'CH'),
  ('Pescara',    (SELECT id FROM public.regioni WHERE nome='Abruzzo'), 'PE'),
  ('Teramo',     (SELECT id FROM public.regioni WHERE nome='Abruzzo'), 'TE'),
  -- BASILICATA
  ('Matera',     (SELECT id FROM public.regioni WHERE nome='Basilicata'), 'MT'),
  ('Potenza',    (SELECT id FROM public.regioni WHERE nome='Basilicata'), 'PZ'),
  -- CALABRIA
  ('Catanzaro',       (SELECT id FROM public.regioni WHERE nome='Calabria'), 'CZ'),
  ('Cosenza',         (SELECT id FROM public.regioni WHERE nome='Calabria'), 'CS'),
  ('Crotone',         (SELECT id FROM public.regioni WHERE nome='Calabria'), 'KR'),
  ('Reggio Calabria', (SELECT id FROM public.regioni WHERE nome='Calabria'), 'RC'),
  ('Vibo Valentia',   (SELECT id FROM public.regioni WHERE nome='Calabria'), 'VV'),
  -- CAMPANIA
  ('Avellino',  (SELECT id FROM public.regioni WHERE nome='Campania'), 'AV'),
  ('Benevento', (SELECT id FROM public.regioni WHERE nome='Campania'), 'BN'),
  ('Caserta',   (SELECT id FROM public.regioni WHERE nome='Campania'), 'CE'),
  ('Napoli',    (SELECT id FROM public.regioni WHERE nome='Campania'), 'NA'),
  ('Salerno',   (SELECT id FROM public.regioni WHERE nome='Campania'), 'SA'),
  -- EMILIA-ROMAGNA
  ('Bologna',       (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'BO'),
  ('Ferrara',       (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'FE'),
  ('Forlì',         (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'FC'),
  ('Modena',        (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'MO'),
  ('Parma',         (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'PR'),
  ('Piacenza',      (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'PC'),
  ('Ravenna',       (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'RA'),
  ('Reggio Emilia', (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'RE'),
  ('Rimini',        (SELECT id FROM public.regioni WHERE nome='Emilia-Romagna'), 'RN'),
  -- FRIULI-VENEZIA GIULIA
  ('Gorizia',   (SELECT id FROM public.regioni WHERE nome='Friuli-Venezia Giulia'), 'GO'),
  ('Pordenone', (SELECT id FROM public.regioni WHERE nome='Friuli-Venezia Giulia'), 'PN'),
  ('Trieste',   (SELECT id FROM public.regioni WHERE nome='Friuli-Venezia Giulia'), 'TS'),
  ('Udine',     (SELECT id FROM public.regioni WHERE nome='Friuli-Venezia Giulia'), 'UD'),
  -- LAZIO
  ('Frosinone', (SELECT id FROM public.regioni WHERE nome='Lazio'), 'FR'),
  ('Latina',    (SELECT id FROM public.regioni WHERE nome='Lazio'), 'LT'),
  ('Rieti',     (SELECT id FROM public.regioni WHERE nome='Lazio'), 'RI'),
  ('Roma',      (SELECT id FROM public.regioni WHERE nome='Lazio'), 'RM'),
  ('Viterbo',   (SELECT id FROM public.regioni WHERE nome='Lazio'), 'VT'),
  -- LIGURIA
  ('Genova',    (SELECT id FROM public.regioni WHERE nome='Liguria'), 'GE'),
  ('Imperia',   (SELECT id FROM public.regioni WHERE nome='Liguria'), 'IM'),
  ('La Spezia', (SELECT id FROM public.regioni WHERE nome='Liguria'), 'SP'),
  ('Savona',    (SELECT id FROM public.regioni WHERE nome='Liguria'), 'SV'),
  -- LOMBARDIA
  ('Bergamo', (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'BG'),
  ('Brescia', (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'BS'),
  ('Como',    (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'CO'),
  ('Cremona', (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'CR'),
  ('Lecco',   (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'LC'),
  ('Lodi',    (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'LO'),
  ('Mantova', (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'MN'),
  ('Milano',  (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'MI'),
  ('Monza',   (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'MB'),
  ('Pavia',   (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'PV'),
  ('Sondrio', (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'SO'),
  ('Varese',  (SELECT id FROM public.regioni WHERE nome='Lombardia'), 'VA'),
  -- MARCHE
  ('Ancona',        (SELECT id FROM public.regioni WHERE nome='Marche'), 'AN'),
  ('Ascoli Piceno', (SELECT id FROM public.regioni WHERE nome='Marche'), 'AP'),
  ('Fermo',         (SELECT id FROM public.regioni WHERE nome='Marche'), 'FM'),
  ('Macerata',      (SELECT id FROM public.regioni WHERE nome='Marche'), 'MC'),
  ('Pesaro',        (SELECT id FROM public.regioni WHERE nome='Marche'), 'PU'),
  -- MOLISE
  ('Campobasso', (SELECT id FROM public.regioni WHERE nome='Molise'), 'CB'),
  ('Isernia',    (SELECT id FROM public.regioni WHERE nome='Molise'), 'IS'),
  -- PIEMONTE
  ('Alessandria', (SELECT id FROM public.regioni WHERE nome='Piemonte'), 'AL'),
  ('Asti',        (SELECT id FROM public.regioni WHERE nome='Piemonte'), 'AT'),
  ('Biella',      (SELECT id FROM public.regioni WHERE nome='Piemonte'), 'BI'),
  ('Cuneo',       (SELECT id FROM public.regioni WHERE nome='Piemonte'), 'CN'),
  ('Novara',      (SELECT id FROM public.regioni WHERE nome='Piemonte'), 'NO'),
  ('Torino',      (SELECT id FROM public.regioni WHERE nome='Piemonte'), 'TO'),
  ('Verbania',    (SELECT id FROM public.regioni WHERE nome='Piemonte'), 'VB'),
  ('Vercelli',    (SELECT id FROM public.regioni WHERE nome='Piemonte'), 'VC'),
  -- PUGLIA
  ('Bari',     (SELECT id FROM public.regioni WHERE nome='Puglia'), 'BA'),
  ('Barletta', (SELECT id FROM public.regioni WHERE nome='Puglia'), 'BT'),
  ('Brindisi', (SELECT id FROM public.regioni WHERE nome='Puglia'), 'BR'),
  ('Foggia',   (SELECT id FROM public.regioni WHERE nome='Puglia'), 'FG'),
  ('Lecce',    (SELECT id FROM public.regioni WHERE nome='Puglia'), 'LE'),
  ('Taranto',  (SELECT id FROM public.regioni WHERE nome='Puglia'), 'TA'),
  -- SARDEGNA
  ('Cagliari', (SELECT id FROM public.regioni WHERE nome='Sardegna'), 'CA'),
  ('Nuoro',    (SELECT id FROM public.regioni WHERE nome='Sardegna'), 'NU'),
  ('Oristano', (SELECT id FROM public.regioni WHERE nome='Sardegna'), 'OR'),
  ('Sassari',  (SELECT id FROM public.regioni WHERE nome='Sardegna'), 'SS'),
  ('Carbonia', (SELECT id FROM public.regioni WHERE nome='Sardegna'), 'SU'),
  -- SICILIA
  ('Agrigento',   (SELECT id FROM public.regioni WHERE nome='Sicilia'), 'AG'),
  ('Caltanissetta',(SELECT id FROM public.regioni WHERE nome='Sicilia'), 'CL'),
  ('Catania',     (SELECT id FROM public.regioni WHERE nome='Sicilia'), 'CT'),
  ('Enna',        (SELECT id FROM public.regioni WHERE nome='Sicilia'), 'EN'),
  ('Messina',     (SELECT id FROM public.regioni WHERE nome='Sicilia'), 'ME'),
  ('Palermo',     (SELECT id FROM public.regioni WHERE nome='Sicilia'), 'PA'),
  ('Ragusa',      (SELECT id FROM public.regioni WHERE nome='Sicilia'), 'RG'),
  ('Siracusa',    (SELECT id FROM public.regioni WHERE nome='Sicilia'), 'SR'),
  ('Trapani',     (SELECT id FROM public.regioni WHERE nome='Sicilia'), 'TP'),
  -- TOSCANA
  ('Arezzo',  (SELECT id FROM public.regioni WHERE nome='Toscana'), 'AR'),
  ('Firenze', (SELECT id FROM public.regioni WHERE nome='Toscana'), 'FI'),
  ('Grosseto',(SELECT id FROM public.regioni WHERE nome='Toscana'), 'GR'),
  ('Livorno', (SELECT id FROM public.regioni WHERE nome='Toscana'), 'LI'),
  ('Lucca',   (SELECT id FROM public.regioni WHERE nome='Toscana'), 'LU'),
  ('Massa',   (SELECT id FROM public.regioni WHERE nome='Toscana'), 'MS'),
  ('Pisa',    (SELECT id FROM public.regioni WHERE nome='Toscana'), 'PI'),
  ('Pistoia', (SELECT id FROM public.regioni WHERE nome='Toscana'), 'PT'),
  ('Prato',   (SELECT id FROM public.regioni WHERE nome='Toscana'), 'PO'),
  ('Siena',   (SELECT id FROM public.regioni WHERE nome='Toscana'), 'SI'),
  -- TRENTINO-ALTO ADIGE
  ('Bolzano', (SELECT id FROM public.regioni WHERE nome='Trentino-Alto Adige'), 'BZ'),
  ('Trento',  (SELECT id FROM public.regioni WHERE nome='Trentino-Alto Adige'), 'TN'),
  -- UMBRIA
  ('Perugia', (SELECT id FROM public.regioni WHERE nome='Umbria'), 'PG'),
  ('Terni',   (SELECT id FROM public.regioni WHERE nome='Umbria'), 'TR'),
  -- VALLE D'AOSTA
  ('Aosta', (SELECT id FROM public.regioni WHERE nome='Valle d''Aosta'), 'AO'),
  -- VENETO
  ('Belluno', (SELECT id FROM public.regioni WHERE nome='Veneto'), 'BL'),
  ('Padova',  (SELECT id FROM public.regioni WHERE nome='Veneto'), 'PD'),
  ('Rovigo',  (SELECT id FROM public.regioni WHERE nome='Veneto'), 'RO'),
  ('Treviso', (SELECT id FROM public.regioni WHERE nome='Veneto'), 'TV'),
  ('Venezia', (SELECT id FROM public.regioni WHERE nome='Veneto'), 'VE'),
  ('Verona',  (SELECT id FROM public.regioni WHERE nome='Veneto'), 'VR'),
  ('Vicenza', (SELECT id FROM public.regioni WHERE nome='Veneto'), 'VI')
ON CONFLICT (nome, regione_id) DO NOTHING;

-- 3. UFFICI — 10 uffici standard per ogni comune (CROSS JOIN)
INSERT INTO public.uffici (nome, comune_id)
SELECT u.nome, c.id
FROM (VALUES
  ('Ufficio Tecnico'),
  ('Polizia Municipale'),
  ('Ufficio Ambiente e Rifiuti'),
  ('Manutenzione Strade e Infrastrutture'),
  ('Verde Pubblico e Arredo Urbano'),
  ('Servizi Sociali e Assistenza'),
  ('Protezione Civile'),
  ('Urbanistica ed Edilizia Privata'),
  ('Pubblica Illuminazione'),
  ('Ufficio Lavori Pubblici')
) AS u(nome)
CROSS JOIN public.comuni c
ON CONFLICT (nome, comune_id) DO NOTHING;
