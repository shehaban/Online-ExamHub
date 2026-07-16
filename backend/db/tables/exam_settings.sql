CREATE TABLE IF NOT EXISTS exam_settings (
    exam_code VARCHAR(50) PRIMARY KEY,
    capacity INT NULL,
    is_locked TINYINT(1) DEFAULT 0,
    FOREIGN KEY (exam_code) REFERENCES exams(code) ON DELETE CASCADE
);
