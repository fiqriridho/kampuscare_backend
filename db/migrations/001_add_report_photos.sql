-- ============================================
-- Migration 001: Add photo columns and seed admin account
-- File: db/migrations/001_add_report_photos.sql
-- Compatible with MySQL 8.0
-- ============================================

USE kampus_care;

-- 1. Tambah kolom photo_url (foto kerusakan awal oleh mahasiswa)
ALTER TABLE reports ADD COLUMN photo_url VARCHAR(500) NULL AFTER status;

-- 2. Tambah kolom evidence_photo_url (foto bukti perbaikan oleh admin)
ALTER TABLE reports ADD COLUMN evidence_photo_url VARCHAR(500) NULL AFTER photo_url;

-- 3. Seed akun admin jika belum ada
INSERT IGNORE INTO users (name, nim, email, password_hash, major, avatar_url, role)
VALUES (
  'Admin KampusCare',
  NULL,
  'admin@kampuscare.ac.id',
  '$2b$10$A3KCFU.iG2q9m5kN3VPpi.UiVeRhLc84VSvfq.UQIRJk3xqSk8M.a',
  'Administrator',
  'https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff',
  'admin'
);
