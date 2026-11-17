-- KampusCare database schema + seed data (MySQL 8)
-- Import: mysql -u root -p < db/schema_and_seed.sql
--
-- Menghapus dan membuat ulang seluruh tabel (destruktif).
-- Akun demo: mahasiswa@kampuscare.ac.id / password123

CREATE DATABASE IF NOT EXISTS kampus_care
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kampus_care;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS report_history;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS classrooms;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  nim varchar(30) DEFAULT NULL,
  email varchar(150) NOT NULL,
  password_hash varchar(255) NOT NULL,
  major varchar(100) DEFAULT NULL,
  avatar_url varchar(500) DEFAULT NULL,
  role enum('mahasiswa','admin') NOT NULL DEFAULT 'mahasiswa',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_nim (nim)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE classrooms (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  building varchar(100) NOT NULL,
  location varchar(150) NOT NULL,
  status enum('kosong','digunakan','upcoming','maintenance') NOT NULL DEFAULT 'kosong',
  capacity int NOT NULL DEFAULT 0,
  facilities json DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  classroom_id int DEFAULT NULL,
  title varchar(200) NOT NULL,
  description text,
  location_detail varchar(255) DEFAULT NULL,
  status enum('menunggu','diproses','selesai') NOT NULL DEFAULT 'menunggu',
  photo_url varchar(500) DEFAULT NULL,
  evidence_photo_url varchar(500) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_user (user_id),
  KEY idx_reports_classroom (classroom_id),
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_reports_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_history (
  id int NOT NULL AUTO_INCREMENT,
  report_id int NOT NULL,
  changed_by int NOT NULL,
  old_status enum('menunggu','diproses','selesai') DEFAULT NULL,
  new_status enum('menunggu','diproses','selesai') NOT NULL,
  note text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_report (report_id),
  KEY idx_history_user (changed_by),
  CONSTRAINT fk_history_report FOREIGN KEY (report_id) REFERENCES reports (id),
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (id, name, nim, email, password_hash, major, avatar_url, role) VALUES
  (1, 'Fiqri Ridho F', '202410370110167', 'mahasiswa@kampuscare.ac.id',
   '$2b$10$3SEb9tTbvEd90Y9ik/ZchOrinKUdcVhyB7fQ/44eoQXyN/qjmIBF2',
   'Teknik Informatika', 'https://krs.umm.ac.id/Poto/2024/202410370110167.JPG', 'mahasiswa'),
  (2, 'Admin KampusCare', NULL, 'admin@kampuscare.ac.id',
   '$2b$10$A3KCFU.iG2q9m5kN3VPpi.UiVeRhLc84VSvfq.UQIRJk3xqSk8M.a',
   'Administrator', 'https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff', 'admin');

INSERT INTO classrooms (id, name, building, location, status, capacity, facilities) VALUES
  (1, 'Lab Komputer 1', 'Gedung A', 'Gedung A Lt. 1', 'kosong', 40,
   JSON_ARRAY('40 Unit PC', 'Proyektor HD', 'AC Central', 'Gigabit LAN', 'Whiteboard')),
  (2, 'Ruang 204', 'Gedung B', 'Gedung B Lt. 2', 'digunakan', 35,
   JSON_ARRAY('Proyektor', 'AC', 'Whiteboard', 'Sound System')),
  (3, 'Auditorium Utama', 'Gedung Rektorat', 'Gedung Rektorat Lt. 1', 'upcoming', 150,
   JSON_ARRAY('Sound System 5000W', 'Dual Proyektor', 'Panggung', 'AC Central', 'Mic Wireless')),
  (4, 'Ruang 102', 'Gedung A', 'Gedung A Lt. 1', 'maintenance', 30,
   JSON_ARRAY('Smart TV 65-inch', 'AC', 'Whiteboard', 'WiFi 6'));
