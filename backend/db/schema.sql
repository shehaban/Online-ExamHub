CREATE DATABASE IF NOT EXISTS examHUB;
USE examHUB;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  user_id      INT            NOT NULL AUTO_INCREMENT,
  user_number  VARCHAR(50)    NOT NULL UNIQUE,
  name         VARCHAR(100)   NOT NULL,
  password     VARCHAR(255)   NOT NULL,
  rule         ENUM('STUDENT', 'TEACHER') NOT NULL,
  email        VARCHAR(255)   NULL DEFAULT NULL,
  avatar       VARCHAR(255)   NULL DEFAULT NULL,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id)
);

-- 2. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
  admin_id     INT            NOT NULL AUTO_INCREMENT,
  name         VARCHAR(100)   NOT NULL,
  password     VARCHAR(255)   NOT NULL,
  email        VARCHAR(255)   NULL DEFAULT NULL,
  avatar       VARCHAR(255)   NULL DEFAULT NULL,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_number  VARCHAR(50)    NOT NULL UNIQUE,

  PRIMARY KEY (admin_id)
);

-- 3. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    teacher_id INT NOT NULL,
    visibility ENUM('public', 'private') DEFAULT 'public',
    room_code VARCHAR(20) NULL,
    capacity INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (teacher_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
        
    CONSTRAINT chk_private_room_code CHECK (
        (visibility = 'public') OR 
        (visibility = 'private' AND room_code IS NOT NULL)
    ),
    
    INDEX idx_room_code (room_code)
);

-- 4. ROOM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS room_members (
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (room_id, student_id),
    
    FOREIGN KEY (room_id)
        REFERENCES rooms(room_id)
        ON DELETE CASCADE,
        
    FOREIGN KEY (student_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (room_id)
        REFERENCES rooms(room_id)
        ON DELETE CASCADE,
        
    FOREIGN KEY (sender_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
        
    INDEX idx_room_messages (room_id, created_at)
);

-- 6. FILES TABLE
CREATE TABLE IF NOT EXISTS file_uploads (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    uploaded_by INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (room_id)
        REFERENCES rooms(room_id)
        ON DELETE CASCADE,
        
    FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
        
    INDEX idx_room_files (room_id)
);

-- 7. PASSWORD RESET TABLE
CREATE TABLE IF NOT EXISTS password_reset (
    reset_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT DEFAULT NULL,
    verification_code VARCHAR(10) DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reset_id),
    UNIQUE KEY (reset_id)
);

-- 8. EXAMS TABLE
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

-- 9. EXAM SUBMISSIONS TABLE
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

-- 10. EXAM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS exam_settings (
    exam_code VARCHAR(50) PRIMARY KEY,
    capacity INT NULL,
    is_locked TINYINT(1) DEFAULT 0,
    FOREIGN KEY (exam_code) REFERENCES exams(code) ON DELETE CASCADE
);
