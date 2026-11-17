const db = require("../config/database");

async function findUserByEmail(email) {
  if (!email || typeof email !== "string") {
    return null;
  }

  const normalized = email.trim().toLowerCase();

  const [rows] = await db.execute(
    `SELECT id, name, nim, email, password_hash, major, avatar_url
     FROM users
     WHERE LOWER(email) = ?
     LIMIT 1`,
    [normalized],
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    profile: {
      name: user.name,
      nim: user.nim,
      major: user.major,
      email: user.email,
      avatar: user.avatar_url,
    },
  };
}

async function emailOrNimExists(email, nim) {
  const [rows] = await db.execute(
    `SELECT id FROM users WHERE LOWER(email) = ? OR nim = ? LIMIT 1`,
    [email, nim],
  );

  return rows.length > 0;
}

async function createUser({ name, nim, email, passwordHash, major, avatarUrl }) {
  const [result] = await db.execute(
    `INSERT INTO users (name, nim, email, password_hash, major, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, nim, email, passwordHash, major, avatarUrl],
  );

  return {
    id: result.insertId,
    profile: {
      name,
      nim,
      major,
      email,
      avatar: avatarUrl,
    },
  };
}

module.exports = {
  findUserByEmail,
  emailOrNimExists,
  createUser,
};
