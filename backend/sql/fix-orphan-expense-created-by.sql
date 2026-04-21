-- Optional: repair orphan created_by on expenses/transactions before enabling DB foreign keys in production.
-- Run in MySQL client: mysql -u root -p finops_saas < fix-orphan-expense-created-by.sql

SET @uid := (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

UPDATE expenses e
LEFT JOIN users u ON u.id = e.created_by
SET e.created_by = @uid
WHERE u.id IS NULL AND @uid IS NOT NULL;

UPDATE transactions t
LEFT JOIN users u ON u.id = t.created_by
SET t.created_by = @uid
WHERE u.id IS NULL AND @uid IS NOT NULL;

UPDATE activity_logs a
LEFT JOIN users u ON u.id = a.actor_user_id
SET a.actor_user_id = @uid
WHERE u.id IS NULL AND @uid IS NOT NULL;
