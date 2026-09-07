ALTER TABLE users
    MODIFY COLUMN can_create_groups BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET can_create_groups = FALSE
WHERE `role` = 'USER';
