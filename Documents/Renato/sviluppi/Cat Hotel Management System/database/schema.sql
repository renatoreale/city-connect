-- ============================================================
-- CAT HOTEL MANAGEMENT SYSTEM — Schema Database
-- MySQL 8.0+  |  Charset: utf8mb4
-- Generato da entità TypeORM
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `cat_hotel`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cat_hotel`;

-- ============================================================
-- TABELLE (ordine topologico, senza FK inline)
-- Le FK vengono aggiunte in blocco con ALTER TABLE in fondo
-- ============================================================

-- ─── 1. ROLES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `roles` (
  `id`          CHAR(36)     NOT NULL,
  `code`        ENUM('admin','ceo','titolare','manager','operatore') NOT NULL,
  `name`        VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NULL,
  `is_global`   TINYINT(1)   NOT NULL DEFAULT 0,
  `hierarchy`   INT          NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. PERMISSIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `permissions` (
  `id`          CHAR(36)     NOT NULL,
  `code`        VARCHAR(100) NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `description` VARCHAR(500) NULL,
  `module`      VARCHAR(50)  NOT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_permissions_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. ROLE_PERMISSIONS (tabella di giunzione) ──────────────
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id`       CHAR(36) NOT NULL,
  `permission_id` CHAR(36) NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `FK_rp_permission_idx` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. TENANTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tenants` (
  `id`          CHAR(36)     NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `code`        VARCHAR(100) NOT NULL,
  `address`     VARCHAR(255) NULL,
  `city`        VARCHAR(100) NULL,
  `postal_code` VARCHAR(10)  NULL,
  `province`    VARCHAR(100) NULL,
  `phone`       VARCHAR(20)  NULL,
  `email`       VARCHAR(255) NULL,
  `vat_number`  VARCHAR(16)  NULL,
  `fiscal_code` VARCHAR(16)  NULL,
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `settings`    JSON         NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  TIMESTAMP    NULL,
  `created_by`  VARCHAR(36)  NULL,
  `updated_by`  VARCHAR(36)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_tenants_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. TENANT_SETTINGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id`                                    CHAR(36)     NOT NULL,
  `tenant_id`                             CHAR(36)     NOT NULL,
  -- Sanitarie
  `fiv_felv_validity_months`              INT          NOT NULL DEFAULT 12,
  `vaccination_validity_months`           INT          NOT NULL DEFAULT 36,
  -- Prenotazioni
  `default_check_in_time`                 TIME         NULL,
  `default_check_out_time`                TIME         NULL,
  `min_booking_days`                      INT          NOT NULL DEFAULT 1,
  `max_booking_days`                      INT          NOT NULL DEFAULT 365,
  -- Preventivi / pagamenti
  `quote_validity_days`                   INT          NOT NULL DEFAULT 7,
  `deposit_percentage`                    DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  `checkin_payment_percentage`            DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  `checkout_payment_percentage`           DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  -- Pool gabbie
  `num_singole`                           INT          NOT NULL DEFAULT 0,
  `num_doppie`                            INT          NOT NULL DEFAULT 0,
  `cage_occupancy_days`                   INT          NOT NULL DEFAULT 4,
  -- Appuntamenti
  `check_in_max_per_slot`                 INT          NOT NULL DEFAULT 1,
  `check_out_max_per_slot`                INT          NOT NULL DEFAULT 1,
  `appointment_slot_duration`             INT          NOT NULL DEFAULT 30
                                                       COMMENT 'Durata slot in minuti',
  -- Email appuntamenti
  `send_appointment_confirmation`         TINYINT(1)   NOT NULL DEFAULT 1,
  `send_appointment_reminder`             TINYINT(1)   NOT NULL DEFAULT 1,
  `appointment_reminder_hours`            INT          NOT NULL DEFAULT 24,
  -- Pagamenti obbligatori a check-in/out
  `require_checkin_payment_at_checkin`    TINYINT(1)   NOT NULL DEFAULT 0,
  `require_checkout_payment_at_checkout`  TINYINT(1)   NOT NULL DEFAULT 0,
  -- Notifiche prenotazione
  `send_booking_confirmation`             TINYINT(1)   NOT NULL DEFAULT 1,
  `send_check_in_reminder`                TINYINT(1)   NOT NULL DEFAULT 1,
  `check_in_reminder_days`                INT          NOT NULL DEFAULT 3,
  -- Cat taxi
  `taxi_base_km`                          INT          NOT NULL DEFAULT 10,
  `taxi_base_price`                       DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  `taxi_extra_km_price`                   DECIMAL(10,2) NOT NULL DEFAULT 0.50,
  `created_at`                            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_tenant_settings_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. USERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`             CHAR(36)     NOT NULL,
  `email`          VARCHAR(255) NOT NULL,
  `password`       VARCHAR(255) NOT NULL,
  `first_name`     VARCHAR(100) NOT NULL,
  `last_name`      VARCHAR(100) NOT NULL,
  `phone`          VARCHAR(20)  NULL,
  `is_active`      TINYINT(1)   NOT NULL DEFAULT 1,
  `is_global_user` TINYINT(1)   NOT NULL DEFAULT 0,
  `last_login`     TIMESTAMP    NULL,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`     TIMESTAMP    NULL,
  `created_by`     VARCHAR(36)  NULL,
  `updated_by`     VARCHAR(36)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. USER_TENANTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_tenants` (
  `id`         CHAR(36)   NOT NULL,
  `user_id`    CHAR(36)   NOT NULL,
  `tenant_id`  CHAR(36)   NOT NULL,
  `role_id`    CHAR(36)   NOT NULL,
  `is_active`  TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_user_tenants_user_tenant` (`user_id`, `tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. REFRESH_TOKENS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`          CHAR(36)     NOT NULL,
  `token`       VARCHAR(500) NOT NULL,
  `user_id`     CHAR(36)     NOT NULL,
  `tenant_id`   CHAR(36)     NULL,
  `expires_at`  TIMESTAMP    NOT NULL,
  `is_revoked`  TINYINT(1)   NOT NULL DEFAULT 0,
  `ip_address`  VARCHAR(45)  NULL,
  `user_agent`  TEXT         NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_rt_user` (`user_id`),
  KEY `IDX_rt_token` (`token`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 9. CLIENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clients` (
  `id`                            CHAR(36)     NOT NULL,
  `tenant_id`                     CHAR(36)     NOT NULL,
  `first_name`                    VARCHAR(100) NOT NULL,
  `last_name`                     VARCHAR(100) NOT NULL,
  `fiscal_code`                   VARCHAR(16)  NULL,
  `email`                         VARCHAR(255) NULL,
  `phone1`                        VARCHAR(50)  NOT NULL,
  `phone1_label`                  VARCHAR(50)  NULL,
  `phone2`                        VARCHAR(50)  NULL,
  `phone2_label`                  VARCHAR(50)  NULL,
  `address`                       VARCHAR(255) NULL,
  `city`                          VARCHAR(100) NULL,
  `postal_code`                   VARCHAR(10)  NULL,
  `province`                      VARCHAR(2)   NULL,
  `intercom`                      VARCHAR(100) NULL,
  `floor`                         VARCHAR(50)  NULL,
  `staircase`                     VARCHAR(50)  NULL,
  `apartment`                     VARCHAR(50)  NULL,
  `mailbox`                       VARCHAR(100) NULL,
  `emergency_contact_name`        VARCHAR(200) NULL,
  `emergency_contact_phone`       VARCHAR(50)  NULL,
  `emergency_contact_email`       VARCHAR(255) NULL,
  `emergency_contact_fiscal_code` VARCHAR(16)  NULL,
  `veterinarian_name`             VARCHAR(100) NULL,
  `veterinarian_phone`            VARCHAR(50)  NULL,
  `rating`                        INT          NULL COMMENT '1-5',
  `rating_notes`                  TEXT         NULL,
  `privacy_accepted`              TINYINT(1)   NOT NULL DEFAULT 0,
  `health_form_accepted`          TINYINT(1)   NOT NULL DEFAULT 0,
  `rules_accepted`                TINYINT(1)   NOT NULL DEFAULT 0,
  `notes`                         TEXT         NULL,
  `is_blacklisted`                TINYINT(1)   NOT NULL DEFAULT 0,
  `blacklist_reason`              TEXT         NULL,
  `blacklisted_at`                TIMESTAMP    NULL,
  `blacklisted_by_tenant_id`      CHAR(36)     NULL,
  `blacklisted_by_user_id`        CHAR(36)     NULL,
  `is_active`                     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`                    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`                    TIMESTAMP    NULL,
  `created_by`                    VARCHAR(36)  NULL,
  `updated_by`                    VARCHAR(36)  NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_clients_tenant` (`tenant_id`),
  KEY `IDX_clients_email` (`email`),
  KEY `IDX_clients_fiscal_code` (`fiscal_code`),
  KEY `IDX_clients_last_name` (`last_name`),
  -- Indici compositi per le query principali (lista + filtri + ordinamento)
  KEY `IDX_clients_tenant_active_name` (`tenant_id`, `is_active`, `last_name`, `first_name`),
  KEY `IDX_clients_tenant_blacklisted` (`tenant_id`, `is_blacklisted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 10. CATS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cats` (
  `id`                       CHAR(36)     NOT NULL,
  `tenant_id`                CHAR(36)     NOT NULL,
  `client_id`                CHAR(36)     NOT NULL,
  `size`                     ENUM('normale','grande') NOT NULL DEFAULT 'normale',
  `sibling_group_id`         CHAR(36)     NULL
                             COMMENT 'UUID gruppo fratelli (stesso proprietario, stessa gabbia)',
  `name`                     VARCHAR(100) NOT NULL,
  `breed`                    VARCHAR(100) NULL,
  `coat_color`               VARCHAR(100) NULL,
  `gender`                   ENUM('M','F') NULL,
  `birth_date`               DATE         NULL,
  `weight_kg`                DECIMAL(5,2) NULL,
  `microchip_number`         VARCHAR(50)  NULL,
  `is_neutered`              TINYINT(1)   NOT NULL DEFAULT 0,
  `vaccination_date`         DATE         NULL,
  `fiv_felv_test_date`       DATE         NULL,
  `fiv_felv_result`          VARCHAR(50)  NULL,
  `requires_medication`      TINYINT(1)   NOT NULL DEFAULT 0,
  `medication_notes`         TEXT         NULL,
  `dietary_notes`            TEXT         NULL,
  `allergies`                TEXT         NULL,
  `temperament`              VARCHAR(100) NULL,
  `notes`                    TEXT         NULL,
  `is_blacklisted`           TINYINT(1)   NOT NULL DEFAULT 0,
  `blacklist_reason`         TEXT         NULL,
  `blacklisted_at`           TIMESTAMP    NULL,
  `blacklisted_by_tenant_id` CHAR(36)     NULL,
  `blacklisted_by_user_id`   CHAR(36)     NULL,
  `is_active`                TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`               TIMESTAMP    NULL,
  `created_by`               VARCHAR(36)  NULL,
  `updated_by`               VARCHAR(36)  NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_cats_tenant` (`tenant_id`),
  KEY `IDX_cats_client` (`client_id`),
  KEY `IDX_cats_sibling_group` (`sibling_group_id`),
  -- Indici compositi per lista gatti con filtro isActive
  KEY `IDX_cats_tenant_active` (`tenant_id`, `is_active`),
  KEY `IDX_cats_client_active` (`client_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 11. PRICE_LIST_ITEMS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `price_list_items` (
  `id`                CHAR(36)      NOT NULL,
  `code`              VARCHAR(50)   NOT NULL,
  `name`              VARCHAR(100)  NOT NULL,
  `description`       TEXT          NULL,
  `category`          ENUM('accommodation','extra_service') NOT NULL DEFAULT 'accommodation',
  `unit_type`         ENUM('per_night','per_day','one_time','per_hour') NOT NULL DEFAULT 'per_night',
  `pricing_model`     ENUM('standard','per_km','per_day_per_cat','one_time_per_cat') NULL DEFAULT 'standard',
  `base_price`        DECIMAL(10,2) NOT NULL,
  `high_season_price` DECIMAL(10,2) NULL,
  `is_active`         TINYINT(1)    NOT NULL DEFAULT 1,
  `sort_order`        INT           NOT NULL DEFAULT 0,
  `created_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`        TIMESTAMP     NULL,
  `created_by`        VARCHAR(36)   NULL,
  `updated_by`        VARCHAR(36)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_price_list_items_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 12. TENANT_PRICE_OVERRIDES ──────────────────────────────
CREATE TABLE IF NOT EXISTS `tenant_price_overrides` (
  `id`                  CHAR(36)      NOT NULL,
  `tenant_id`           CHAR(36)      NOT NULL,
  `price_list_item_id`  CHAR(36)      NOT NULL,
  `base_price`          DECIMAL(10,2) NULL,
  `high_season_price`   DECIMAL(10,2) NULL,
  `is_active`           TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`          TIMESTAMP     NULL,
  `created_by`          VARCHAR(36)   NULL,
  `updated_by`          VARCHAR(36)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_tpo_tenant_item` (`tenant_id`, `price_list_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 13. SEASONAL_PERIODS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `seasonal_periods` (
  `id`             CHAR(36)     NOT NULL,
  `name`           VARCHAR(100) NOT NULL,
  `start_month`    INT          NOT NULL COMMENT '1-12',
  `start_day`      INT          NOT NULL COMMENT '1-31',
  `end_month`      INT          NOT NULL COMMENT '1-12',
  `end_day`        INT          NOT NULL COMMENT '1-31',
  `is_high_season` TINYINT(1)   NOT NULL DEFAULT 1,
  `year`           INT          NULL    COMMENT 'NULL = ogni anno',
  `is_active`      TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`     TIMESTAMP    NULL,
  `created_by`     VARCHAR(36)  NULL,
  `updated_by`     VARCHAR(36)  NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 14. DISCOUNT_RULES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `discount_rules` (
  `id`                  CHAR(36)      NOT NULL,
  `tenant_id`           CHAR(36)      NULL COMMENT 'NULL = regola globale',
  `name`                VARCHAR(100)  NOT NULL,
  `description`         TEXT          NULL,
  `discount_type`       ENUM('duration','multi_cat','percentage','fixed') NOT NULL,
  `min_nights`          INT           NULL,
  `min_cats`            INT           NULL,
  `discount_value`      DECIMAL(10,2) NOT NULL,
  `is_percentage`       TINYINT(1)    NOT NULL DEFAULT 1,
  `applies_to_category` ENUM('accommodation','extra_service','all') NOT NULL DEFAULT 'all',
  `priority`            INT           NOT NULL DEFAULT 0,
  `is_cumulative`       TINYINT(1)    NOT NULL DEFAULT 0,
  `is_active`           TINYINT(1)    NOT NULL DEFAULT 1,
  `valid_from`          DATE          NULL,
  `valid_to`            DATE          NULL,
  `created_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`          TIMESTAMP     NULL,
  `created_by`          VARCHAR(36)   NULL,
  `updated_by`          VARCHAR(36)   NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_discount_rules_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 15. EMAIL_TEMPLATES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id`         CHAR(36)     NOT NULL,
  `tenant_id`  CHAR(36)     NULL COMMENT 'NULL = template di sistema',
  `code`       VARCHAR(50)  NOT NULL,
  `name`       VARCHAR(100) NOT NULL,
  `subject`    VARCHAR(255) NOT NULL,
  `body_html`  TEXT         NOT NULL,
  `body_text`  TEXT         NULL,
  `variables`  JSON         NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP    NULL,
  `created_by` VARCHAR(36)  NULL,
  `updated_by` VARCHAR(36)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_email_templates_tenant_code` (`tenant_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 16. STAFF_TASK_TYPES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `staff_task_types` (
  `id`          CHAR(36)     NOT NULL,
  `tenant_id`   CHAR(36)     NOT NULL,
  `name`        VARCHAR(100) NOT NULL,
  `color`       VARCHAR(7)   NULL COMMENT 'Colore HEX es. #FF5733',
  `description` TEXT         NULL,
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  TIMESTAMP    NULL,
  `created_by`  VARCHAR(36)  NULL,
  `updated_by`  VARCHAR(36)  NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_stt_tenant_active` (`tenant_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 17. QUOTES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `quotes` (
  `id`                        CHAR(36)      NOT NULL,
  `tenant_id`                 CHAR(36)      NOT NULL,
  `client_id`                 CHAR(36)      NOT NULL,
  `quote_number`              VARCHAR(20)   NOT NULL,
  `check_in_date`             DATE          NOT NULL,
  `check_out_date`            DATE          NOT NULL,
  `number_of_cats`            INT           NOT NULL,
  `subtotal_before_discounts` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_discounts`           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount`              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `applied_discounts`         JSON          NULL,
  `status`                    ENUM('draft','sent','accepted','rejected','expired','converted')
                              NOT NULL DEFAULT 'draft',
  `valid_until`               DATE          NULL,
  `notes`                     TEXT          NULL,
  `pdf_path`                  VARCHAR(500)  NULL,
  `pdf_generated_at`          TIMESTAMP     NULL,
  `created_at`                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`                TIMESTAMP     NULL,
  `created_by`                VARCHAR(36)   NULL,
  `updated_by`                VARCHAR(36)   NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_quotes_tenant` (`tenant_id`),
  KEY `IDX_quotes_client` (`client_id`),
  KEY `IDX_quotes_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 18. QUOTE_CATS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `quote_cats` (
  `id`         CHAR(36)  NOT NULL,
  `quote_id`   CHAR(36)  NOT NULL,
  `cat_id`     CHAR(36)  NOT NULL,
  `notes`      TEXT      NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_qc_quote` (`quote_id`),
  KEY `IDX_qc_cat` (`cat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 19. QUOTE_LINE_ITEMS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `quote_line_items` (
  `id`                   CHAR(36)      NOT NULL,
  `quote_id`             CHAR(36)      NOT NULL,
  `price_list_item_id`   CHAR(36)      NULL,
  `item_code`            VARCHAR(50)   NOT NULL,
  `item_name`            VARCHAR(100)  NOT NULL,
  `category`             ENUM('accommodation','extra_service') NOT NULL,
  `unit_type`            ENUM('per_night','per_day','one_time','per_hour') NOT NULL,
  `pricing_model`        ENUM('standard','per_km','per_day_per_cat','one_time_per_cat') NULL,
  `season_type`          ENUM('high','low') NULL,
  `start_date`           DATE          NULL,
  `end_date`             DATE          NULL,
  `applies_to_cat_count` INT           NULL,
  `unit_price`           DECIMAL(10,2) NOT NULL,
  `quantity`             INT           NOT NULL DEFAULT 1,
  `subtotal`             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total`                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `line_order`           INT           NOT NULL DEFAULT 0,
  `km`                   INT           NULL COMMENT 'Km percorsi (solo per pricing_model = per_km)',
  `created_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`           TIMESTAMP     NULL,
  `created_by`           VARCHAR(36)   NULL,
  `updated_by`           VARCHAR(36)   NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_qli_quote` (`quote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 20. BOOKINGS ────────────────────────────────────────────
-- Nota: id = quote_id (PrimaryColumn, non auto-generato)
CREATE TABLE IF NOT EXISTS `bookings` (
  `id`                        CHAR(36)      NOT NULL
                              COMMENT 'Stesso UUID del preventivo di origine',
  `tenant_id`                 CHAR(36)      NOT NULL,
  `quote_id`                  CHAR(36)      NOT NULL,
  `client_id`                 CHAR(36)      NOT NULL,
  `booking_number`            VARCHAR(20)   NOT NULL,
  `check_in_date`             DATE          NOT NULL,
  `check_out_date`            DATE          NOT NULL,
  `number_of_cats`            INT           NOT NULL,
  `number_of_nights`          INT           NOT NULL,
  `subtotal_before_discounts` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_discounts`           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount`              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `applied_discounts`         JSON          NULL,
  `status`                    VARCHAR(20)   NOT NULL DEFAULT 'confermata'
                              COMMENT 'confermata|check_in|in_corso|check_out|chiusa|cancellata|rimborsata|scaduta',
  `deposit_required`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `checkin_payment_required`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `checkout_payment_required` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes`                     TEXT          NULL,
  `created_at`                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`                TIMESTAMP     NULL,
  `created_by`                VARCHAR(36)   NULL,
  `updated_by`                VARCHAR(36)   NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_bookings_tenant_checkin_status` (`tenant_id`, `check_in_date`, `status`),
  KEY `IDX_bookings_client` (`client_id`),
  KEY `IDX_bookings_quote` (`quote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 21. BOOKING_CATS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `booking_cats` (
  `id`         CHAR(36)  NOT NULL,
  `booking_id` CHAR(36)  NOT NULL,
  `cat_id`     CHAR(36)  NOT NULL,
  `notes`      TEXT      NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_bc_booking` (`booking_id`),
  KEY `IDX_bc_cat` (`cat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 22. BOOKING_LINE_ITEMS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `booking_line_items` (
  `id`                   CHAR(36)      NOT NULL,
  `booking_id`           CHAR(36)      NOT NULL,
  `price_list_item_id`   CHAR(36)      NULL,
  `item_code`            VARCHAR(50)   NOT NULL,
  `item_name`            VARCHAR(100)  NOT NULL,
  `category`             ENUM('accommodation','extra_service') NOT NULL,
  `unit_type`            ENUM('per_night','per_day','one_time','per_hour') NOT NULL,
  `pricing_model`        ENUM('standard','per_km','per_day_per_cat','one_time_per_cat') NULL,
  `season_type`          ENUM('high','low') NULL,
  `start_date`           DATE          NULL,
  `end_date`             DATE          NULL,
  `applies_to_cat_count` INT           NULL,
  `unit_price`           DECIMAL(10,2) NOT NULL,
  `quantity`             INT           NOT NULL DEFAULT 1,
  `subtotal`             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total`                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `line_order`           INT           NOT NULL DEFAULT 0,
  `added_during_stay`    TINYINT(1)    NOT NULL DEFAULT 0,
  `km`                   INT           NULL COMMENT 'Km percorsi (solo per pricing_model = per_km)',
  `created_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`           TIMESTAMP     NULL,
  `created_by`           VARCHAR(36)   NULL,
  `updated_by`           VARCHAR(36)   NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_bli_booking` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 23. BOOKING_STATUS_HISTORY ──────────────────────────────
CREATE TABLE IF NOT EXISTS `booking_status_history` (
  `id`          CHAR(36)    NOT NULL,
  `booking_id`  CHAR(36)    NOT NULL,
  `from_status` VARCHAR(20) NULL,
  `to_status`   VARCHAR(20) NOT NULL,
  `changed_by`  CHAR(36)    NOT NULL,
  `changed_at`  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes`       TEXT        NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_bsh_booking` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 24. BOOKING_DAILY_OVERRIDES ────────────────────────────
CREATE TABLE IF NOT EXISTS `booking_daily_overrides` (
  `id`            CHAR(36)  NOT NULL,
  `tenant_id`     CHAR(36)  NOT NULL,
  `booking_id`    CHAR(36)  NOT NULL,
  `override_date` DATE      NOT NULL,
  `reason`        TEXT      NOT NULL,
  `created_by`    CHAR(36)  NOT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_bdo_booking_date` (`booking_id`, `override_date`),
  KEY `IDX_bdo_tenant_date` (`tenant_id`, `override_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 25. PAYMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payments` (
  `id`             CHAR(36)      NOT NULL,
  `tenant_id`      CHAR(36)      NOT NULL,
  `booking_id`     CHAR(36)      NOT NULL,
  `payment_type`   ENUM('caparra','acconto_checkin','saldo_checkout','extra','rimborso') NOT NULL,
  `amount`         DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('contanti','carta','bonifico','altro') NOT NULL,
  `payment_date`   DATE          NOT NULL,
  `notes`          TEXT          NULL,
  `created_by`     CHAR(36)      NOT NULL,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_payments_tenant` (`tenant_id`),
  KEY `IDX_payments_booking` (`booking_id`),
  KEY `IDX_payments_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 26. APPOINTMENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `appointments` (
  `id`               CHAR(36)    NOT NULL,
  `tenant_id`        CHAR(36)    NOT NULL,
  `booking_id`       CHAR(36)    NOT NULL,
  `appointment_type` VARCHAR(20) NOT NULL COMMENT 'check_in | check_out',
  `appointment_date` DATE        NOT NULL,
  `start_time`       TIME        NOT NULL,
  `end_time`         TIME        NOT NULL,
  `status`           ENUM('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
  `notes`            TEXT        NULL,
  `created_at`       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`       TIMESTAMP   NULL,
  `created_by`       VARCHAR(36) NULL,
  `updated_by`       VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_appointments_booking_type` (`booking_id`, `appointment_type`),
  KEY `IDX_appointments_tenant_date_type` (`tenant_id`, `appointment_date`, `appointment_type`),
  KEY `IDX_appointments_tenant_date_time_type` (`tenant_id`, `appointment_date`, `start_time`, `appointment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 27. APPOINTMENT_WEEKLY_SCHEDULES ────────────────────────
CREATE TABLE IF NOT EXISTS `appointment_weekly_schedules` (
  `id`            CHAR(36)    NOT NULL,
  `tenant_id`     CHAR(36)    NOT NULL,
  `day_of_week`   INT         NOT NULL COMMENT '0=Lunedì, 1=Martedì … 6=Domenica',
  `schedule_type` VARCHAR(20) NOT NULL COMMENT 'check_in | check_out',
  `start_time`    TIME        NOT NULL,
  `end_time`      TIME        NOT NULL,
  `is_active`     TINYINT(1)  NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_aws_tenant_day_type` (`tenant_id`, `day_of_week`, `schedule_type`),
  KEY `IDX_aws_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 28. EMAIL_LOGS ──────────────────────────────────────────
-- Nota: appointment_id è nullable; la FK su appointments viene
--       aggiunta dopo la creazione della tabella appointments
CREATE TABLE IF NOT EXISTS `email_logs` (
  `id`              CHAR(36)     NOT NULL,
  `tenant_id`       CHAR(36)     NOT NULL,
  `template_id`     CHAR(36)     NULL,
  `quote_id`        CHAR(36)     NULL,
  `appointment_id`  CHAR(36)     NULL,
  `recipient_email` VARCHAR(255) NOT NULL,
  `recipient_name`  VARCHAR(200) NULL,
  `subject`         VARCHAR(255) NOT NULL,
  `body_html`       TEXT         NOT NULL,
  `attachments`     JSON         NULL,
  `status`          ENUM('pending','sent','failed','bounced') NOT NULL DEFAULT 'pending',
  `sent_at`         TIMESTAMP    NULL,
  `error_message`   TEXT         NULL,
  `metadata`        JSON         NULL,
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by`      VARCHAR(36)  NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_el_tenant` (`tenant_id`),
  KEY `IDX_el_quote` (`quote_id`),
  KEY `IDX_el_appointment` (`appointment_id`),
  KEY `IDX_el_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 29. APPOINTMENT_REMINDERS ───────────────────────────────
CREATE TABLE IF NOT EXISTS `appointment_reminders` (
  `id`             CHAR(36)    NOT NULL,
  `tenant_id`      CHAR(36)    NOT NULL,
  `appointment_id` CHAR(36)    NOT NULL,
  `scheduled_for`  DATETIME    NOT NULL,
  `status`         ENUM('pending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
  `email_log_id`   CHAR(36)    NULL,
  `error_message`  TEXT        NULL,
  `attempts`       INT         NOT NULL DEFAULT 0,
  `created_at`     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_ar_tenant_status_for` (`tenant_id`, `status`, `scheduled_for`),
  KEY `IDX_ar_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 30. STAFF_TASKS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `staff_tasks` (
  `id`                   CHAR(36)    NOT NULL,
  `tenant_id`            CHAR(36)    NOT NULL,
  `task_type_id`         CHAR(36)    NOT NULL,
  `booking_id`           CHAR(36)    NULL,
  `assigned_to_user_id`  CHAR(36)    NULL,
  `due_date`             DATE        NOT NULL,
  `due_time`             TIME        NULL,
  `notes`                TEXT        NULL,
  `status`               ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `completed_at`         TIMESTAMP   NULL,
  `completed_by_user_id` CHAR(36)    NULL,
  `completion_notes`     TEXT        NULL,
  `created_at`           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`           TIMESTAMP   NULL,
  `created_by`           VARCHAR(36) NULL,
  `updated_by`           VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_st_tenant_due_status` (`tenant_id`, `due_date`, `status`),
  KEY `IDX_st_tenant_user_due` (`tenant_id`, `assigned_to_user_id`, `due_date`),
  KEY `IDX_st_tenant_booking` (`tenant_id`, `booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 31. AUDIT_LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`             CHAR(36)    NOT NULL,
  `entity_type`    VARCHAR(100) NOT NULL,
  `entity_id`      VARCHAR(36)  NOT NULL,
  `operation`      ENUM('INSERT','UPDATE','DELETE','RESTORE') NOT NULL,
  `tenant_id`      VARCHAR(36)  NULL,
  `user_id`        VARCHAR(36)  NOT NULL,
  `user_role`      VARCHAR(50)  NOT NULL,
  `before_data`    JSON         NULL,
  `after_data`     JSON         NULL,
  `changed_fields` JSON         NULL,
  `ip_address`     VARCHAR(45)  NULL,
  `user_agent`     TEXT         NULL,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_al_entity` (`entity_type`, `entity_id`),
  KEY `IDX_al_tenant` (`tenant_id`),
  KEY `IDX_al_user` (`user_id`),
  KEY `IDX_al_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================

-- role_permissions
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `FK_rp_role`       FOREIGN KEY (`role_id`)       REFERENCES `roles` (`id`)       ON DELETE CASCADE,
  ADD CONSTRAINT `FK_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

-- tenant_settings
ALTER TABLE `tenant_settings`
  ADD CONSTRAINT `FK_ts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

-- user_tenants
ALTER TABLE `user_tenants`
  ADD CONSTRAINT `FK_ut_user`   FOREIGN KEY (`user_id`)   REFERENCES `users` (`id`)   ON DELETE CASCADE,
  ADD CONSTRAINT `FK_ut_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_ut_role`   FOREIGN KEY (`role_id`)   REFERENCES `roles` (`id`);

-- refresh_tokens
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `FK_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- clients
ALTER TABLE `clients`
  ADD CONSTRAINT `FK_clients_tenant`               FOREIGN KEY (`tenant_id`)              REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_clients_blacklisted_by_tenant` FOREIGN KEY (`blacklisted_by_tenant_id`) REFERENCES `tenants` (`id`);

-- cats
ALTER TABLE `cats`
  ADD CONSTRAINT `FK_cats_tenant`               FOREIGN KEY (`tenant_id`)              REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_cats_client`               FOREIGN KEY (`client_id`)              REFERENCES `clients` (`id`),
  ADD CONSTRAINT `FK_cats_blacklisted_by_tenant` FOREIGN KEY (`blacklisted_by_tenant_id`) REFERENCES `tenants` (`id`);

-- tenant_price_overrides
ALTER TABLE `tenant_price_overrides`
  ADD CONSTRAINT `FK_tpo_tenant`          FOREIGN KEY (`tenant_id`)          REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_tpo_price_list_item` FOREIGN KEY (`price_list_item_id`) REFERENCES `price_list_items` (`id`);

-- discount_rules
ALTER TABLE `discount_rules`
  ADD CONSTRAINT `FK_dr_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

-- email_templates
ALTER TABLE `email_templates`
  ADD CONSTRAINT `FK_et_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

-- staff_task_types
ALTER TABLE `staff_task_types`
  ADD CONSTRAINT `FK_stt_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

-- quotes
ALTER TABLE `quotes`
  ADD CONSTRAINT `FK_quotes_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_quotes_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

-- quote_cats
ALTER TABLE `quote_cats`
  ADD CONSTRAINT `FK_qc_quote` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_qc_cat`   FOREIGN KEY (`cat_id`)   REFERENCES `cats` (`id`);

-- quote_line_items
ALTER TABLE `quote_line_items`
  ADD CONSTRAINT `FK_qli_quote`           FOREIGN KEY (`quote_id`)           REFERENCES `quotes` (`id`)          ON DELETE CASCADE,
  ADD CONSTRAINT `FK_qli_price_list_item` FOREIGN KEY (`price_list_item_id`) REFERENCES `price_list_items` (`id`);

-- bookings
ALTER TABLE `bookings`
  ADD CONSTRAINT `FK_bookings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_bookings_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `FK_bookings_quote`  FOREIGN KEY (`quote_id`)  REFERENCES `quotes` (`id`);

-- booking_cats
ALTER TABLE `booking_cats`
  ADD CONSTRAINT `FK_bc_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_bc_cat`     FOREIGN KEY (`cat_id`)     REFERENCES `cats` (`id`);

-- booking_line_items
ALTER TABLE `booking_line_items`
  ADD CONSTRAINT `FK_bli_booking`         FOREIGN KEY (`booking_id`)         REFERENCES `bookings` (`id`)        ON DELETE CASCADE,
  ADD CONSTRAINT `FK_bli_price_list_item` FOREIGN KEY (`price_list_item_id`) REFERENCES `price_list_items` (`id`);

-- booking_status_history
ALTER TABLE `booking_status_history`
  ADD CONSTRAINT `FK_bsh_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_bsh_user`    FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`);

-- booking_daily_overrides
ALTER TABLE `booking_daily_overrides`
  ADD CONSTRAINT `FK_bdo_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_bdo_user`    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

-- payments
ALTER TABLE `payments`
  ADD CONSTRAINT `FK_payments_tenant`  FOREIGN KEY (`tenant_id`)  REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  ADD CONSTRAINT `FK_payments_user`    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

-- appointments
ALTER TABLE `appointments`
  ADD CONSTRAINT `FK_appointments_tenant`  FOREIGN KEY (`tenant_id`)  REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_appointments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_appointments_user`    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

-- appointment_weekly_schedules
ALTER TABLE `appointment_weekly_schedules`
  ADD CONSTRAINT `FK_aws_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

-- email_logs
ALTER TABLE `email_logs`
  ADD CONSTRAINT `FK_el_tenant`      FOREIGN KEY (`tenant_id`)     REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_el_template`    FOREIGN KEY (`template_id`)   REFERENCES `email_templates` (`id`),
  ADD CONSTRAINT `FK_el_quote`       FOREIGN KEY (`quote_id`)      REFERENCES `quotes` (`id`),
  ADD CONSTRAINT `FK_el_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`);

-- appointment_reminders
ALTER TABLE `appointment_reminders`
  ADD CONSTRAINT `FK_ar_tenant`      FOREIGN KEY (`tenant_id`)     REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_ar_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_ar_email_log`   FOREIGN KEY (`email_log_id`)  REFERENCES `email_logs` (`id`);

-- staff_tasks
ALTER TABLE `staff_tasks`
  ADD CONSTRAINT `FK_st_tenant`          FOREIGN KEY (`tenant_id`)            REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `FK_st_task_type`       FOREIGN KEY (`task_type_id`)         REFERENCES `staff_task_types` (`id`),
  ADD CONSTRAINT `FK_st_booking`         FOREIGN KEY (`booking_id`)           REFERENCES `bookings` (`id`),
  ADD CONSTRAINT `FK_st_assigned_user`   FOREIGN KEY (`assigned_to_user_id`)  REFERENCES `users` (`id`),
  ADD CONSTRAINT `FK_st_completed_user`  FOREIGN KEY (`completed_by_user_id`) REFERENCES `users` (`id`);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- MIGRATION: pricing_model (eseguire su DB esistenti)
-- ============================================================
-- ALTER TABLE `price_list_items`
--   ADD COLUMN `pricing_model` ENUM('standard','per_km','per_day_per_cat','one_time_per_cat')
--   NULL DEFAULT 'standard' AFTER `unit_type`;
-- ALTER TABLE `quote_line_items`
--   ADD COLUMN `pricing_model` ENUM('standard','per_km','per_day_per_cat','one_time_per_cat')
--   NULL AFTER `unit_type`;
-- ALTER TABLE `booking_line_items`
--   ADD COLUMN `pricing_model` ENUM('standard','per_km','per_day_per_cat','one_time_per_cat')
--   NULL AFTER `unit_type`;


-- ============================================================
-- DATI INIZIALI (seed)
-- ============================================================

-- UUID fissi per poter creare i riferimenti nel seed
SET @role_admin_id    = '10000000-0000-0000-0000-000000000001';
SET @role_ceo_id      = '10000000-0000-0000-0000-000000000002';
SET @role_titolare_id = '10000000-0000-0000-0000-000000000003';
SET @role_manager_id  = '10000000-0000-0000-0000-000000000004';
SET @role_op_id       = '10000000-0000-0000-0000-000000000005';
SET @admin_user_id    = '20000000-0000-0000-0000-000000000001';
SET @demo_tenant_id   = '30000000-0000-0000-0000-000000000001';

-- ─── Ruoli ───────────────────────────────────────────────────
INSERT IGNORE INTO `roles` (`id`, `code`, `name`, `description`, `is_global`, `hierarchy`) VALUES
  (@role_admin_id,    'admin',     'Amministratore', 'Accesso globale a tutte le pensioni',  1, 100),
  (@role_ceo_id,      'ceo',       'CEO',            'CEO / responsabile principale',        0,  90),
  (@role_titolare_id, 'titolare',  'Titolare',       'Titolare della pensione',             0,  70),
  (@role_manager_id,  'manager',   'Manager',        'Manager operativo',                   0,  50),
  (@role_op_id,       'operatore', 'Operatore',      'Operatore standard',                  0,  30);

-- ─── Listino prezzi base ──────────────────────────────────────
INSERT IGNORE INTO `price_list_items`
  (`id`, `code`, `name`, `category`, `unit_type`, `base_price`, `high_season_price`, `is_active`, `sort_order`)
VALUES
  (UUID(), 'SOGGIORNO_SINGOLO',  'Soggiorno gabbia singola', 'accommodation',  'per_night', 25.00, 35.00, 1,  1),
  (UUID(), 'SOGGIORNO_DOPPIO',   'Soggiorno gabbia doppia',  'accommodation',  'per_night', 20.00, 28.00, 1,  2),
  (UUID(), 'EXTRA_PASTO',        'Pasto extra',              'extra_service',  'one_time',   5.00, NULL,  1, 10),
  (UUID(), 'EXTRA_MEDICAZIONE',  'Somministrazione farmaci', 'extra_service',  'per_day',    3.00, NULL,  1, 11),
  (UUID(), 'EXTRA_TRASPORTO',    'Servizio trasporto',       'extra_service',  'one_time',  20.00, NULL,  1, 12);

-- ─── Tenant di demo ───────────────────────────────────────────
INSERT IGNORE INTO `tenants` (`id`, `name`, `code`, `is_active`) VALUES
  (@demo_tenant_id, 'Demo Cat Hotel', 'demo', 1);

-- ─── Utente admin iniziale ────────────────────────────────────
-- Password: Admin1234! (bcrypt, rounds=12)
-- CAMBIA QUESTA PASSWORD AL PRIMO ACCESSO
INSERT IGNORE INTO `users`
  (`id`, `email`, `password`, `first_name`, `last_name`, `is_active`, `is_global_user`)
VALUES (
  @admin_user_id,
  'admin@cathotel.local',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj0A3H4k9b8K',
  'Admin',
  'Sistema',
  1,
  1
);

-- ─── Associazione admin → tenant di demo ─────────────────────
INSERT IGNORE INTO `user_tenants` (`id`, `user_id`, `tenant_id`, `role_id`, `is_active`)
VALUES (UUID(), @admin_user_id, @demo_tenant_id, @role_admin_id, 1);
