const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/reports');

// Pastikan direktori uploads/reports selalu ada
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Konfigurasi disk storage untuk Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const tempName = `temp_${crypto.randomUUID()}${ext}`;
    cb(null, tempName);
  },
});

// Filter tipe file gambar
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Tipe file tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimal 5 MB
  },
  fileFilter,
});

// Middleware wrapper untuk menangani error multer secara ramah JSON
function handleUpload(fieldName) {
  const multerSingle = upload.single(fieldName);
  return (req, res, next) => {
    multerSingle(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Ukuran file terlalu besar. Maksimal 5MB',
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: err.message,
          });
        }
        return res.status(400).json({
          error: err.message || 'Gagal mengunggah foto',
        });
      }
      next();
    });
  };
}

/**
 * Menamai ulang file sementara ke nama file permanen berbasis ID laporan
 * @param {string} tempFilename - nama file atau path relatif sementara
 * @param {number|string} reportId - ID laporan
 * @param {'damage'|'evidence'} type - jenis foto
 * @returns {Promise<string>} path relatif file permanen (contoh: '/uploads/reports/damage_1_uuid.jpg')
 */
async function finalizePhoto(tempFilename, reportId, type = 'damage') {
  if (!tempFilename) return null;

  const baseTempName = path.basename(tempFilename);
  const oldPath = path.join(UPLOAD_DIR, baseTempName);

  if (!fs.existsSync(oldPath)) {
    return null;
  }

  const ext = path.extname(baseTempName) || '.jpg';
  const finalName = `${type}_${reportId}_${crypto.randomUUID()}${ext}`;
  const newPath = path.join(UPLOAD_DIR, finalName);

  await fs.promises.rename(oldPath, newPath);
  return `/uploads/reports/${finalName}`;
}

/**
 * Menghapus file secara aman dari disk
 * @param {string} filepath - path absolut atau relatif ke file
 */
async function cleanupFile(filepath) {
  if (!filepath) return;
  try {
    const fullPath = path.isAbsolute(filepath)
      ? filepath
      : path.join(__dirname, '../../', filepath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (err) {
    console.error('Gagal membersihkan file:', err.message);
  }
}

module.exports = {
  UPLOAD_DIR,
  uploadReportPhoto: handleUpload('photo'),
  uploadEvidencePhoto: handleUpload('photo'),
  finalizePhoto,
  cleanupFile,
};
