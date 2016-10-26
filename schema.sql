DROP DATABASE IF EXISTS crackai;

CREATE DATABASE IF NOT EXISTS crackai;

USE crackai;

DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
  ID         INTEGER PRIMARY KEY AUTO_INCREMENT,
  username   VARCHAR(100) UNIQUE,
  password   VARCHAR(100),
  email      VARCHAR(100) UNIQUE NULL,
  first_name VARCHAR(100)        NULL,
  last_name  VARCHAR(100)        NULL,
  created_at TIMESTAMP(6),
  updated_at TIMESTAMP(6)
)
  ENGINE = innodb;