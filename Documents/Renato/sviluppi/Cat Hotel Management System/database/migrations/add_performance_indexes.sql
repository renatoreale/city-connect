-- ============================================================
-- MIGRAZIONE PERFORMANCE: Aggiunta indici compositi
-- Da eseguire una sola volta sui DB esistenti
-- ============================================================

-- Clients: indice principale per lista (tenant + filtro attivo + ordinamento)
ALTER TABLE `clients`
  ADD KEY `IDX_clients_tenant_active_name` (`tenant_id`, `is_active`, `last_name`, `first_name`),
  ADD KEY `IDX_clients_tenant_blacklisted` (`tenant_id`, `is_blacklisted`);

-- Cats: indice per lista per tenant e per cliente
ALTER TABLE `cats`
  ADD KEY `IDX_cats_tenant_active` (`tenant_id`, `is_active`),
  ADD KEY `IDX_cats_client_active` (`client_id`, `is_active`);

-- ============================================================
-- MIGRAZIONE CAT TAXI: colonne km e tariffa
-- Da eseguire una sola volta sui DB esistenti
-- ============================================================

-- Colonna km su quote_line_items
ALTER TABLE `quote_line_items`
  ADD COLUMN `km` INT NULL COMMENT 'Km percorsi (solo per pricing_model = per_km)'
  AFTER `line_order`;

-- Colonna km su booking_line_items
ALTER TABLE `booking_line_items`
  ADD COLUMN `km` INT NULL COMMENT 'Km percorsi (solo per pricing_model = per_km)'
  AFTER `added_during_stay`;

-- Colonne taxi su tenant_settings
ALTER TABLE `tenant_settings`
  ADD COLUMN `taxi_base_km`        INT           NOT NULL DEFAULT 10   AFTER `check_in_reminder_days`,
  ADD COLUMN `taxi_base_price`     DECIMAL(10,2) NOT NULL DEFAULT 20.00 AFTER `taxi_base_km`,
  ADD COLUMN `taxi_extra_km_price` DECIMAL(10,2) NOT NULL DEFAULT 0.50  AFTER `taxi_base_price`;
