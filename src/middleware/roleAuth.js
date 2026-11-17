const pool = require('../config/database');

/**
 * Middleware untuk membatasi endpoint berdasarkan role JWT.
 * @param {string|string[]} roles - Role atau daftar role yang diizinkan (contoh: 'admin' atau ['mahasiswa'])
 */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: 'Sesi tidak valid. Informasi peran (role) tidak ditemukan',
      });
    }

    if (!allowed.includes(req.user.role)) {
      const roleMsg = allowed.length === 1 && allowed[0] === 'mahasiswa'
        ? 'Hanya mahasiswa yang dapat membuat laporan kerusakan'
        : 'Akses ditolak: Anda tidak memiliki izin untuk tindakan ini';

      return res.status(403).json({
        error: roleMsg,
      });
    }

    next();
  };
}

/**
 * Middleware untuk memastikan user adalah pemilik laporan atau Admin.
 */
async function requireOwnerOrAdmin(req, res, next) {
  const reportId = req.params.id;

  if (!reportId || isNaN(Number(reportId))) {
    return res.status(400).json({ error: 'ID laporan tidak valid' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.name as reporter_name, u.email as reporter_email
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?
       LIMIT 1`,
      [Number(reportId)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }

    const report = rows[0];

    // Cek hak akses: hanya pemilik laporan (user_id sama) atau user dengan role admin
    const isOwner = Number(req.user.userId) === Number(report.user_id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Akses ditolak: Anda tidak memiliki izin untuk melihat laporan ini',
      });
    }

    req.report = report;
    next();
  } catch (error) {
    console.error('Error in requireOwnerOrAdmin:', error.message);
    return res.status(500).json({ error: 'Terjadi kesalahan saat memeriksa hak akses laporan' });
  }
}

module.exports = {
  requireRole,
  requireOwnerOrAdmin,
};
