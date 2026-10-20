const { verifyToken } = require('../utils/token');
const { isBlacklisted } = require('../data/blacklist');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token tidak tersedia. Silakan login terlebih dahulu',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
    return res.status(401).json({
      error: 'Format token tidak valid',
    });
  }

  const token = parts[1].trim();

  // 1. Panggil verifyToken DULU
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token sudah kedaluwarsa. Silakan login kembali',
      });
    }

    return res.status(401).json({
      error: 'Token tidak valid',
    });
  }

  // 2. Baru cek isBlacklisted(decoded.jti)
  try {
    const blacklisted = await isBlacklisted(decoded.jti);
    if (blacklisted) {
      return res.status(401).json({
        error: 'Token tidak valid',
      });
    }

    // 3. Set req.user, req.token, dan req.tokenExp = decoded.exp
    req.user = decoded;
    req.token = token;
    req.tokenExp = decoded.exp;
    next();
  } catch (err) {
    // 8. Jika Redis tidak tersedia saat cek blacklist, kembalikan 503 (fail closed)
    return res.status(503).json({
      error: 'Layanan autentikasi sementara tidak tersedia',
    });
  }
}

module.exports = authMiddleware;
