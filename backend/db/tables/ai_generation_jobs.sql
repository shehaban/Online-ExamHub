CREATE TABLE IF NOT EXISTS ai_generation_jobs (
  job_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type ENUM('generate', 'refine') DEFAULT 'generate',
  status ENUM('pending', 'generating', 'completed', 'failed') DEFAULT 'pending',
  progress INT DEFAULT 0,
  title VARCHAR(255) DEFAULT '',
  questions JSON NULL,
  error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ai_jobs_user (user_id)
);
