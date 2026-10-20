const redis = require('../config/redis');

/**
 * Menyimpan jti ke blacklist Redis dengan TTL (exp - waktu sekarang).
 * Jika TTL <= 0, token tidak disimpan.
 * @param {string} jti - ID unik token JWT
 * @param {number} exp - Waktu kedaluwarsa token dalam format Unix timestamp (detik)
 */
async function addToBlacklist(jti, exp) {
  if (!jti || typeof exp !== 'number') return;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const ttl = exp - nowInSeconds;

  // Jika TTL <= 0, token sudah kedaluwarsa secara alami sehingga tidak perlu disimpan
  if (ttl <= 0) {
    return;
  }

  await redis.set(`blacklist:${jti}`, 'true', 'EX', ttl);
}

/**
 * Memeriksa apakah jti token terdaftar di blacklist Redis.
 * @param {string} jti - ID unik token JWT
 * @returns {Promise<boolean>}
 */
async function isBlacklisted(jti) {
  if (!jti) return false;

  const exists = await redis.exists(`blacklist:${jti}`);
  return exists === 1;
}

/**
 * Menghapus hanya key yang berawalan 'blacklist:' menggunakan SCAN (bukan FLUSHALL).
 */
async function clearBlacklist() {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      'blacklist:*',
      'COUNT',
      100
    );
    cursor = nextCursor;
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

module.exports = {
  addToBlacklist,
  isBlacklisted,
  clearBlacklist,
};
