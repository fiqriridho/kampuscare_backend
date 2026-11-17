-- ============================================
-- Rollback 001: Remove photo columns and optional admin seed rollback
-- File: db/migrations/001_add_report_photos.rollback.sql
-- WARNING: Data foto kerusakan dan bukti perbaikan akan dihapus!
-- ============================================

USE kampus_care;

-- 1. Hapus kolom foto dari tabel reports
ALTER TABLE reports DROP COLUMN evidence_photo_url;
ALTER TABLE reports DROP COLUMN photo_url;

-- 2. Hapus akun admin seed jika diperlukan
-- DELETE FROM users WHERE email = 'admin@kampuscare.ac.id';
