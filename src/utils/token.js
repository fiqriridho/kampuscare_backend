const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

function generateToken(payload) {
  const payloadWithRole = {
    ...payload,
    role: payload.role || 'mahasiswa',
    jti: crypto.randomUUID(),
  };
  return jwt.sign(
    payloadWithRole,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
};