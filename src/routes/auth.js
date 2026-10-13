const express = require('express');
const bcrypt = require('bcryptjs');
const { findUserByEmail } = require('../data/users');
const { generateToken } = require('../utils/token');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Email dan password wajib diisi',
    });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({
      error: 'Email atau password salah',
    });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      error: 'Email atau password salah',
    });
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  return res.status(200).json({
    message: 'Login berhasil',
    token,
    user: user.profile,
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = findUserByEmail(req.user.email);
  if (!user) {
    return res.status(404).json({
      error: 'User tidak ditemukan',
    });
  }

  return res.status(200).json({
    user: user.profile,
  });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  return res.status(200).json({
    message: 'Logout berhasil',
  });
});

module.exports = router;
