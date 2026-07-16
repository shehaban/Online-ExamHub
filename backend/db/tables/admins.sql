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
