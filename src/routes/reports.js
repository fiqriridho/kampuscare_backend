const express = require('express');
const path = require('path');
const fs = require('fs');
const reportsData = require('../data/reports');
const authMiddleware = require('../middleware/auth');
const { requireRole, requireOwnerOrAdmin } = require('../middleware/roleAuth');
const { uploadReportPhoto, uploadEvidencePhoto, finalizePhoto, cleanupFile } = require('../middleware/upload');

const router = express.Router();

// ============================================================================
// 1. GET /api/reports - Mengambil daftar laporan (Admin: semua, Mahasiswa: own)
// ============================================================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await reportsData.getAllReports(req.query, req.user);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error GET /api/reports:', error.message);
    return res.status(500).json({ error: 'Gagal mengambil daftar laporan' });
  }
});

// ============================================================================
// 2. GET /api/reports/:id - Mengambil detail satu laporan (Owner / Admin)
// ============================================================================
router.get('/:id', authMiddleware, requireOwnerOrAdmin, async (req, res) => {
  try {
    const report = await reportsData.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }
    return res.status(200).json({ data: report });
  } catch (error) {
    console.error('Error GET /api/reports/:id:', error.message);
    return res.status(500).json({ error: 'Gagal mengambil detail laporan' });
  }
});

// ============================================================================
// 3. POST /api/reports - Membuat laporan kerusakan (Khusus Mahasiswa)
// ============================================================================
router.post(
  '/',
  authMiddleware,
  requireRole('mahasiswa'),
  uploadReportPhoto,
  async (req, res) => {
    const { title, description, location_detail, classroom_id } = req.body || {};

    // Validasi input
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      if (req.file) await cleanupFile(req.file.path);
      return res.status(400).json({
        error: 'Judul laporan wajib diisi (minimal 3 karakter)',
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      if (req.file) await cleanupFile(req.file.path);
      return res.status(400).json({
        error: 'Deskripsi kerusakan wajib diisi (minimal 10 karakter)',
      });
    }

    if (description.trim().length > 1000) {
      if (req.file) await cleanupFile(req.file.path);
      return res.status(400).json({
        error: 'Deskripsi kerusakan maksimal 1000 karakter',
      });
    }

    let createdReport = null;

    try {
      // 1. Simpan data laporan ke database
      createdReport = await reportsData.createReport(
        {
          title: title.trim(),
          description: description.trim(),
          location_detail: location_detail ? location_detail.trim() : null,
          classroom_id: classroom_id ? Number(classroom_id) : null,
          photo_url: null,
        },
        req.user.userId
      );

      // 2. Jika ada file foto, finalisasi file dan hubungkan ke ID laporan
      if (req.file) {
        const finalPhotoUrl = await finalizePhoto(req.file.filename, createdReport.id, 'damage');
        if (finalPhotoUrl) {
          await reportsData.updatePhotoUrl(createdReport.id, finalPhotoUrl);
          createdReport.photo_url = finalPhotoUrl;
        }
      }

      return res.status(201).json({
        message: 'Laporan kerusakan berhasil dibuat',
        data: createdReport,
      });
    } catch (error) {
      console.error('Error POST /api/reports:', error.message);
      // Bersihkan file sementara jika terjadi kegagalan database
      if (req.file) {
        await cleanupFile(req.file.path);
      }
      return res.status(500).json({
        error: 'Terjadi kesalahan pada server saat membuat laporan',
      });
    }
  }
);

// ============================================================================
// 4. PATCH /api/reports/:id - Memperbarui status laporan (Khusus Admin)
// ============================================================================
router.patch(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    const { status, note } = req.body || {};

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        error: 'Status perbaikan wajib disertakan (contoh: diproses, selesai)',
      });
    }

    const normalizedStatus = status.toLowerCase().trim();

    if (!['diproses', 'selesai'].includes(normalizedStatus)) {
      return res.status(400).json({
        error: "Status hanya dapat diubah ke 'diproses' atau 'selesai'",
      });
    }

    try {
      const updatedReport = await reportsData.updateStatus(
        req.params.id,
        normalizedStatus,
        note,
        req.user.userId
      );

      return res.status(200).json({
        message: `Status laporan berhasil diperbarui menjadi ${normalizedStatus}`,
        data: updatedReport,
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ error: error.message });
      }
      if (error.status === 409) {
        return res.status(409).json({ error: error.message });
      }
      console.error('Error PATCH /api/reports/:id:', error.message);
      return res.status(500).json({
        error: 'Terjadi kesalahan saat memperbarui status laporan',
      });
    }
  }
);

// ============================================================================
// 5. POST /api/reports/:id/evidence-photo - Mengunggah foto bukti perbaikan (Admin)
// ============================================================================
router.post(
  '/:id/evidence-photo',
  authMiddleware,
  requireRole('admin'),
  uploadEvidencePhoto,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'File foto bukti perbaikan wajib dilampirkan',
      });
    }

    try {
      const report = await reportsData.getReportById(req.params.id);

      if (!report) {
        await cleanupFile(req.file.path);
        return res.status(404).json({ error: 'Laporan tidak ditemukan' });
      }

      if (report.status !== 'diproses') {
        await cleanupFile(req.file.path);
        return res.status(400).json({
          error: 'Foto bukti perbaikan hanya dapat diunggah saat status laporan sedang diproses',
        });
      }

      // Finalisasi foto bukti
      const finalEvidenceUrl = await finalizePhoto(req.file.filename, req.params.id, 'evidence');

      if (!finalEvidenceUrl) {
        await cleanupFile(req.file.path);
        return res.status(500).json({ error: 'Gagal memproses file foto bukti' });
      }

      // Hapus foto bukti lama dari disk jika ada penggantian
      if (report.evidence_photo_url && report.evidence_photo_url !== finalEvidenceUrl) {
        await cleanupFile(report.evidence_photo_url);
      }

      await reportsData.updateEvidencePhoto(req.params.id, finalEvidenceUrl);

      return res.status(200).json({
        message: 'Foto bukti perbaikan berhasil diunggah',
        evidence_photo_url: finalEvidenceUrl,
      });
    } catch (error) {
      console.error('Error POST /api/reports/:id/evidence-photo:', error.message);
      if (req.file) await cleanupFile(req.file.path);
      return res.status(500).json({
        error: 'Terjadi kesalahan saat mengunggah foto bukti perbaikan',
      });
    }
  }
);

// ============================================================================
// 6. GET /api/reports/:id/photo - Mengakses stream foto kerusakan (Owner / Admin)
// ============================================================================
router.get('/:id/photo', authMiddleware, requireOwnerOrAdmin, (req, res) => {
  const photoUrl = req.report.photo_url;

  if (!photoUrl) {
    return res.status(404).json({ error: 'Laporan ini tidak memiliki foto kerusakan' });
  }

  const relativePath = photoUrl.replace(/^\//, '');
  const absolutePath = path.join(__dirname, '../../', relativePath);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'File foto kerusakan tidak ditemukan pada server' });
  }

  return res.sendFile(absolutePath);
});

// ============================================================================
// 7. GET /api/reports/:id/evidence-photo - Mengakses stream foto bukti (Owner / Admin)
// ============================================================================
router.get('/:id/evidence-photo', authMiddleware, requireOwnerOrAdmin, (req, res) => {
  const evidenceUrl = req.report.evidence_photo_url;

  if (!evidenceUrl) {
    return res.status(404).json({ error: 'Laporan ini belum memiliki foto bukti perbaikan' });
  }

  const relativePath = evidenceUrl.replace(/^\//, '');
  const absolutePath = path.join(__dirname, '../../', relativePath);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'File foto bukti tidak ditemukan pada server' });
  }

  return res.sendFile(absolutePath);
});

// ============================================================================
// 8. GET /api/reports/:id/history - Mengambil riwayat status (Owner / Admin)
// ============================================================================
router.get('/:id/history', authMiddleware, requireOwnerOrAdmin, async (req, res) => {
  try {
    const history = await reportsData.getHistory(req.params.id);
    return res.status(200).json({ data: history });
  } catch (error) {
    console.error('Error GET /api/reports/:id/history:', error.message);
    return res.status(500).json({ error: 'Gagal mengambil riwayat status laporan' });
  }
});

module.exports = router;
