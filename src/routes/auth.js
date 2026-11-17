const express = require("express");
const bcrypt = require("bcryptjs");
const { findUserByEmail, emailOrNimExists, createUser } = require("../data/users");
const { generateToken } = require("../utils/token");
const { addToBlacklist } = require("../data/blacklist");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, nim, major, email, password } = req.body || {};

  if (
    [name, nim, major, email, password].some(
      (value) => typeof value !== "string" || value.trim() === "",
    )
  ) {
    return res.status(400).json({
      error: "Nama, NIM, jurusan, email, dan password wajib diisi",
    });
  }

  const data = {
    name: name.trim(),
    nim: nim.trim(),
    major: major.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 150) {
    return res.status(400).json({ error: "Format email tidak valid" });
  }

  if (!/^\d{6,30}$/.test(data.nim)) {
    return res.status(400).json({ error: "NIM harus berupa 6-30 digit angka" });
  }

  if (data.name.length > 100 || data.major.length > 100) {
    return res.status(400).json({ error: "Nama dan jurusan maksimal 100 karakter" });
  }

  if (data.password.length < 6 || data.password.length > 72) {
    return res.status(400).json({ error: "Password harus 6-72 karakter" });
  }

  try {
    if (await emailOrNimExists(data.email, data.nim)) {
      return res.status(409).json({ error: "Email atau NIM sudah terdaftar" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0D8ABC&color=fff`;
    const user = await createUser({ ...data, passwordHash, avatarUrl });
    const token = generateToken({ userId: user.id, email: data.email });

    return res.status(201).json({
      message: "Registrasi berhasil",
      token,
      user: user.profile,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email atau NIM sudah terdaftar" });
    }

    console.error("Register error:", error.message);

    return res.status(500).json({
      error: "Terjadi kesalahan saat registrasi",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      error: "Email dan password wajib diisi",
    });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: "Email atau password salah",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        error: "Email atau password salah",
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return res.status(200).json({
      message: "Login berhasil",
      token,
      user: user.profile,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      error: "Terjadi kesalahan saat login",
    });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({
        error: "User tidak ditemukan",
      });
    }

    return res.status(200).json({
      user: user.profile,
    });
  } catch (error) {
    console.error("Auth me error:", error.message);

    return res.status(500).json({
      error: "Terjadi kesalahan saat mengambil profil pengguna",
    });
  }
});

// POST /api/auth/logout
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    await addToBlacklist(req.user.jti, req.tokenExp);

    return res.status(200).json({
      message: "Logout berhasil",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses logout",
    });
  }
});

module.exports = router;
