CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(255) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
);

INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
('maintenance_mode', 'false'),
('allow_signup', 'true'),
('min_pass_score', '50'),
('system_name', 'Online ExamHub'),
('teacher_code', 'INSTRUCTOR2024');
