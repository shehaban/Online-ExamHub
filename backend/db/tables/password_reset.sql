CREATE TABLE IF NOT EXISTS password_reset (
    reset_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT DEFAULT NULL,
    verification_code VARCHAR(10) DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reset_id),
    UNIQUE KEY (reset_id)
);
