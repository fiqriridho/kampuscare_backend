const pool = require('../config/database');

/**
 * Mengambil daftar laporan dengan filter role dan status
 */
async function getAllReports({ status, page = 1, limit = 20, mine = false } = {}, user) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  // Jika mahasiswa atau ada parameter mine=true, hanya ambil laporan milik user tersebut
  if (user.role === 'mahasiswa' || mine) {
    conditions.push('r.user_id = ?');
    params.push(user.userId);
  }

  // Filter status jika diberikan
  if (status && ['menunggu', 'diproses', 'selesai'].includes(status.toLowerCase())) {
    conditions.push('r.status = ?');
    params.push(status.toLowerCase());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Hitung total data
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM reports r ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  // Query data laporan lengkap dengan nama pelapor dan ruangan
  const query = `
    SELECT 
      r.id,
      r.user_id,
      r.classroom_id,
      r.title,
      r.description,
      r.location_detail,
      r.status,
      r.photo_url,
      r.evidence_photo_url,
      r.created_at,
      r.updated_at,
      u.name AS reporter_name,
      u.nim AS reporter_nim,
      c.name AS classroom_name,
      c.location AS classroom_location
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN classrooms c ON r.classroom_id = c.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [...params, limitNum, offset]);

  return {
    data: rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Mengambil detail satu laporan berdasarkan ID
 */
async function getReportById(id) {
  const [rows] = await pool.query(
    `SELECT 
      r.id,
      r.user_id,
      r.classroom_id,
      r.title,
      r.description,
      r.location_detail,
      r.status,
      r.photo_url,
      r.evidence_photo_url,
      r.created_at,
      r.updated_at,
      u.name AS reporter_name,
      u.nim AS reporter_nim,
      u.email AS reporter_email,
      c.name AS classroom_name,
      c.location AS classroom_location
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN classrooms c ON r.classroom_id = c.id
    WHERE r.id = ?
    LIMIT 1`,
    [Number(id)]
  );

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Membuat laporan kerusakan baru oleh Mahasiswa
 */
async function createReport({ title, description, location_detail, classroom_id, photo_url }, userId) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO reports (user_id, classroom_id, title, description, location_detail, status, photo_url)
       VALUES (?, ?, ?, ?, ?, 'menunggu', ?)`,
      [
        userId,
        classroom_id ? Number(classroom_id) : null,
        title.trim(),
        description ? description.trim() : null,
        location_detail ? location_detail.trim() : null,
        photo_url || null,
      ]
    );

    const reportId = result.insertId;

    // Catat riwayat awal status menunggu
    await conn.execute(
      `INSERT INTO report_history (report_id, changed_by, old_status, new_status, note)
       VALUES (?, ?, NULL, 'menunggu', 'Laporan kerusakan fasilitas berhasil dibuat')`,
      [reportId, userId]
    );

    await conn.commit();

    return {
      id: reportId,
      user_id: userId,
      classroom_id: classroom_id ? Number(classroom_id) : null,
      title: title.trim(),
      description: description ? description.trim() : null,
      location_detail: location_detail ? location_detail.trim() : null,
      status: 'menunggu',
      photo_url: photo_url || null,
      evidence_photo_url: null,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Memperbarui URL foto kerusakan
 */
async function updatePhotoUrl(id, photoUrl) {
  await pool.execute(
    `UPDATE reports SET photo_url = ? WHERE id = ?`,
    [photoUrl, Number(id)]
  );
}

/**
 * Menyimpan foto bukti perbaikan dari Admin
 */
async function updateEvidencePhoto(id, evidencePhotoUrl) {
  await pool.execute(
    `UPDATE reports SET evidence_photo_url = ? WHERE id = ?`,
    [evidencePhotoUrl, Number(id)]
  );
}

/**
 * Mengubah status laporan dengan transisi strict & pencatatan report_history
 */
async function updateStatus(id, newStatus, note, adminId) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Kunci baris dengan FOR UPDATE agar konkurensi aman
    const [rows] = await conn.query(
      `SELECT id, status, evidence_photo_url FROM reports WHERE id = ? FOR UPDATE`,
      [Number(id)]
    );

    if (rows.length === 0) {
      const err = new Error('Laporan tidak ditemukan');
      err.status = 404;
      throw err;
    }

    const currentReport = rows[0];
    const currentStatus = currentReport.status;
    const targetStatus = newStatus.toLowerCase().trim();

    // Validasi transisi status strict
    // 1. menunggu -> diproses
    // 2. diproses -> selesai (WAJIB ADA evidence_photo_url)
    if (currentStatus === 'menunggu' && targetStatus === 'diproses') {
      // Valid transition
    } else if (currentStatus === 'diproses' && targetStatus === 'selesai') {
      if (!currentReport.evidence_photo_url) {
        const err = new Error('Foto bukti perbaikan wajib diunggah sebelum status diselesaikan');
        err.status = 409;
        throw err;
      }
    } else {
      const err = new Error(
        `Transisi status tidak valid dari '${currentStatus}' ke '${targetStatus}'`
      );
      err.status = 409;
      throw err;
    }

    // Update status laporan
    await conn.execute(
      `UPDATE reports SET status = ? WHERE id = ?`,
      [targetStatus, Number(id)]
    );

    // Insert ke report_history
    await conn.execute(
      `INSERT INTO report_history (report_id, changed_by, old_status, new_status, note)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(id),
        adminId,
        currentStatus,
        targetStatus,
        note ? note.trim() : `Status diperbarui menjadi ${targetStatus}`,
      ]
    );

    await conn.commit();

    // Return laporan terbaru
    const updated = await getReportById(id);
    return updated;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Mengambil riwayat audit status laporan
 */
async function getHistory(reportId) {
  const [rows] = await pool.query(
    `SELECT 
      rh.id,
      rh.report_id,
      rh.changed_by,
      rh.old_status,
      rh.new_status,
      rh.note,
      rh.created_at,
      u.name AS changed_by_name,
      u.role AS changed_by_role
    FROM report_history rh
    LEFT JOIN users u ON rh.changed_by = u.id
    WHERE rh.report_id = ?
    ORDER BY rh.created_at ASC`,
    [Number(reportId)]
  );

  return rows;
}

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updatePhotoUrl,
  updateEvidencePhoto,
  updateStatus,
  getHistory,
};
