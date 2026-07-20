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
