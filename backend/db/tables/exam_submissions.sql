CREATE TABLE IF NOT EXISTS exam_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_code VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    user_number VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    score FLOAT DEFAULT 0,
    total FLOAT DEFAULT 0,
    answers JSON NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME NULL,
    FOREIGN KEY (exam_code) REFERENCES exams(code) ON DELETE CASCADE,
    INDEX idx_exam_sub_code (exam_code),
    INDEX idx_exam_sub_user (user_id)
);
