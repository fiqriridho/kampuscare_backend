const express = require("express");
const bcrypt = require("bcryptjs");
const { findUserByEmail } = require("../data/users");
const { generateToken } = require("../utils/token");
const { addToBlacklist } = require("../data/blacklist");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

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
