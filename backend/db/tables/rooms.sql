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
