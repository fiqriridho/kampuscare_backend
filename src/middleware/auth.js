const { verifyToken } = require('../utils/token');

function authMiddleware(req, res, next) {
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

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
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
}

module.exports = authMiddleware;
