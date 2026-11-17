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

module.exports = {
  findUserByEmail,
};
