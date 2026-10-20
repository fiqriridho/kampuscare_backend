const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

module.exports = {
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REDIS_URL,
};
