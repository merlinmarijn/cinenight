ALTER TABLE users
    ADD COLUMN username VARCHAR(24) NULL AFTER display_name,
    ADD COLUMN account_type ENUM('REGISTERED','GUEST') NOT NULL DEFAULT 'REGISTERED' AFTER username,
    ADD COLUMN guest_code_hash VARCHAR(255) NULL AFTER password_hash,
    ADD COLUMN guest_signup_ip_hash VARCHAR(64) NULL AFTER guest_code_hash,
    ADD COLUMN display_name_changed_at TIMESTAMP NULL AFTER updated_at;

CREATE UNIQUE INDEX uk_users_username ON users(username);
CREATE INDEX idx_users_guest_signup_ip ON users(account_type, guest_signup_ip_hash, created_at);

CREATE TABLE guest_devices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_hash VARCHAR(64) NOT NULL,
    last_ip_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_guest_devices_hash UNIQUE (device_hash),
    CONSTRAINT fk_guest_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    KEY idx_guest_devices_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
