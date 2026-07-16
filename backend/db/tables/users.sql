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
