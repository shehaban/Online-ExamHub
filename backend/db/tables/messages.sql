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
