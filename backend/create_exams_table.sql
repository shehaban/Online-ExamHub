-- Table to store exam definitions and questions
CREATE TABLE IF NOT EXISTS exams (
    exam_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    questions JSON NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track students who joined the exam, their status, join/finish times, and submission results
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

-- Table to store instructor management settings for each exam (e.g. locks, capacity limits)
CREATE TABLE IF NOT EXISTS exam_settings (
    exam_code VARCHAR(50) PRIMARY KEY,
    capacity INT NULL,
    is_locked TINYINT DEFAULT 0,
    FOREIGN KEY (exam_code) REFERENCES exams(code) ON DELETE CASCADE
);
