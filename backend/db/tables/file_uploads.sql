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
