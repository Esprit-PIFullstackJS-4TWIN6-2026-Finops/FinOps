USE saas_dashboard;

INSERT INTO companies (id, name, category, logo_url, tax_id) VALUES
(1, 'Alpha Tech', 'Technology', NULL, 'TAX-ALPHA-001'),
(2, 'Beta Retail', 'Retail', NULL, 'TAX-BETA-001')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO roles (id, name) VALUES
(1, 'super_admin'),
(2, 'admin'),
(3, 'manager'),
(4, 'accountant'),
(5, 'sales')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO permissions (id, permission_key, label) VALUES
(1, 'view_revenue', 'Voir revenus'),
(2, 'view_expenses', 'Voir charges'),
(3, 'view_profit', 'Voir bénéfice'),
(4, 'view_retention', 'Voir rétention'),
(5, 'export_data', 'Exporter données'),
(6, 'view_forecasts', 'Voir prévisions'),
(7, 'view_alerts', 'Voir alertes')
ON DUPLICATE KEY UPDATE label = VALUES(label);

DELETE FROM role_permissions;
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
UNION ALL
SELECT 2, id FROM permissions
UNION ALL SELECT 3, 1
UNION ALL SELECT 3, 2
UNION ALL SELECT 3, 3
UNION ALL SELECT 3, 4
UNION ALL SELECT 3, 6
UNION ALL SELECT 3, 7
UNION ALL SELECT 4, 1
UNION ALL SELECT 4, 2
UNION ALL SELECT 4, 3
UNION ALL SELECT 4, 5
UNION ALL SELECT 5, 1
UNION ALL SELECT 5, 4;

-- password: Admin123!
INSERT INTO users (id, company_id, role_id, full_name, email, password_hash, is_active) VALUES
(1, NULL, 1, 'Super Admin', 'superadmin@saas.com', '$2a$10$w3lLxQ6O1X1UiU0JjF8v0.Y7M1YhL8j6xEwJ8kP3h7v0y7WbH5rzq', 1),
(2, 1, 2, 'Company Admin', 'admin@alpha.com', '$2a$10$w3lLxQ6O1X1UiU0JjF8v0.Y7M1YhL8j6xEwJ8kP3h7v0y7WbH5rzq', 1),
(3, 1, 3, 'Manager One', 'manager@alpha.com', '$2a$10$w3lLxQ6O1X1UiU0JjF8v0.Y7M1YhL8j6xEwJ8kP3h7v0y7WbH5rzq', 1),
(4, 2, 2, 'Admin Beta', 'admin@beta.com', '$2a$10$w3lLxQ6O1X1UiU0JjF8v0.Y7M1YhL8j6xEwJ8kP3h7v0y7WbH5rzq', 1)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT INTO revenues (company_id, department, amount, retention_rate, date) VALUES
(1, 'Sales', 12000, 82, CURDATE() - INTERVAL 5 MONTH),
(1, 'Sales', 15000, 80, CURDATE() - INTERVAL 4 MONTH),
(1, 'Sales', 16800, 79, CURDATE() - INTERVAL 3 MONTH),
(1, 'Sales', 17400, 81, CURDATE() - INTERVAL 2 MONTH),
(1, 'Sales', 18200, 83, CURDATE() - INTERVAL 1 MONTH),
(1, 'Sales', 19100, 84, CURDATE()),
(2, 'Sales', 8000, 75, CURDATE() - INTERVAL 1 MONTH),
(2, 'Sales', 8300, 74, CURDATE());

INSERT INTO expenses (company_id, category, department, amount, date) VALUES
(1, 'Infrastructure', 'Ops', 4100, CURDATE() - INTERVAL 1 MONTH),
(1, 'Marketing', 'Growth', 2800, CURDATE() - INTERVAL 1 MONTH),
(1, 'Salaries', 'HR', 5300, CURDATE() - INTERVAL 1 MONTH),
(1, 'Infrastructure', 'Ops', 4300, CURDATE()),
(1, 'Marketing', 'Growth', 2600, CURDATE()),
(2, 'Infrastructure', 'Ops', 1900, CURDATE()),
(2, 'Salaries', 'HR', 2900, CURDATE());

