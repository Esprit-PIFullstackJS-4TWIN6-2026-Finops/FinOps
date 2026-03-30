CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  owner_id CHAR(36) NULL,
  category VARCHAR(60) NOT NULL,
  logo VARCHAR(255) NULL,
  matricule_fiscal VARCHAR(100) NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  address VARCHAR(255) NULL,
  phone VARCHAR(40) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(40) NOT NULL,
  company_id CHAR(36) NULL,
  active_company_id CHAR(36) NULL,
  avatar_url VARCHAR(255) NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_company_id (company_id),
  INDEX idx_users_active_company_id (active_company_id)
);

ALTER TABLE companies
  ADD CONSTRAINT fk_companies_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users
  ADD CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_active_company FOREIGN KEY (active_company_id) REFERENCES companies(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS user_company_memberships (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  company_id CHAR(36) NOT NULL,
  role_id INT NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_company (user_id, company_id),
  INDEX idx_membership_company_role (company_id, role_id),
  CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS clients (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_clients_company (company_id),
  CONSTRAINT fk_clients_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  client_id CHAR(36) NULL,
  type ENUM('income', 'expense', 'transfer') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  tx_date DATE NOT NULL,
  description VARCHAR(255) NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tx_company_date (company_id, tx_date),
  INDEX idx_tx_company_type (company_id, type),
  CONSTRAINT fk_tx_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expenses (
  id CHAR(36) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  category VARCHAR(80) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  vendor VARCHAR(120) NULL,
  notes VARCHAR(255) NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exp_company_date (company_id, expense_date),
  CONSTRAINT fk_exp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_exp_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id CHAR(36) NULL,
  actor_user_id CHAR(36) NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  metadata_json JSON NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_company_date (company_id, created_at),
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
);
