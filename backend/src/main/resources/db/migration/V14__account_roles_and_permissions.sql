ALTER TABLE users
    MODIFY COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
    ADD COLUMN can_create_groups BOOLEAN NOT NULL DEFAULT TRUE AFTER `role`;

UPDATE users
SET `role` = 'USER'
WHERE `role` IS NULL OR `role` NOT IN ('ADMIN', 'VIP', 'USER');

UPDATE users
SET `role` = 'ADMIN'
WHERE id = (
    SELECT first_user.id
    FROM (
        SELECT id
        FROM users
        ORDER BY created_at, id
        LIMIT 1
    ) first_user
)
AND NOT EXISTS (
    SELECT 1
    FROM (SELECT `role` FROM users) existing_admins
    WHERE existing_admins.`role` = 'ADMIN'
);

CREATE TABLE app_bootstrap (
    id INT NOT NULL PRIMARY KEY,
    admin_claimed BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_bootstrap (id, admin_claimed)
SELECT 1, EXISTS(SELECT 1 FROM users WHERE `role` = 'ADMIN');
