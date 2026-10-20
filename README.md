# 🏫 KampusCare Backend API

Backend REST API untuk aplikasi **KampusCare** (aplikasi pelaporan fasilitas dan status ruangan kampus), dibangun dengan **Node.js** dan **Express**. Project ini mengimplementasikan autentikasi berbasis **JSON Web Token (JWT)** dan proteksi endpoint sesuai rubrik evaluasi **Sprint 04**.

---

## 📌 Fitur Utama

- **Autentikasi JWT**: Endpoint login yang menghasilkan token JWT terenkripsi dengan masa berlaku (expiry).
- **Proteksi Endpoint API**: Middleware autentikasi yang memverifikasi header `Authorization: Bearer <token>`.
- **Stateless Session Management**: Client-side session management dengan endpoint konfirmasi logout.
- **Data Ruangan Sesuai Kontrak**: Endpoint `/api/rooms` dengan struktur data identik dengan kontrak Beeceptor.
- **Keamanan Password**: Password di-hash menggunakan algoritma `bcryptjs` (salt rounds 10).
- **Data Dummy Privasi**: Profil user menggunakan data dummy fiktif untuk melindungi data pribadi asli.

---

## 🛠️ Prasyarat (Prerequisites)

- **Node.js**: Versi `>= 18.0.0`
- **npm**: Versi `>= 9.0.0`

---

## 🚀 Panduan Setup & Instalasi

### 1. Masuk ke Direktori Project

```bash
cd d:\02_Projects\kampus-care-backend
```

### 2. Pasang Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment Variables

Salin template `.env.example` ke `.env`:

```bash
cp .env.example .env
```

_(Di Windows PowerShell: `Copy-Item .env.example .env`)_

Isi file `.env`:

```env
PORT=3000
JWT_SECRET=c8f74a9e2d1b5e3f8a0c4e7d2b9a1f5e8c3b7a1d5e9f2a4b8c0d3e7f1a5b9c2d
JWT_EXPIRES_IN=1h
```

---

## ▶️ Menjalankan Server

### Mode Development (Auto-reload dengan Nodemon)

```bash
npm run dev
```

### Mode Production

```bash
npm start
```

Server akan aktif di `http://localhost:3000`.

---

## 📚 Daftar Endpoint API

| Method | Endpoint           | Auth          | Deskripsi                                                                |
| ------ | ------------------ | ------------- | ------------------------------------------------------------------------ |
| `GET`  | `/api/health`      | ❌ Publik     | Health check status server                                               |
| `POST` | `/api/auth/login`  | ❌ Publik     | Login pengguna dengan email & password, mengembalikan token JWT & profil |
| `GET`  | `/api/auth/me`     | ✅ Bearer JWT | Mendapatkan profil user yang sedang login                                |
| `POST` | `/api/auth/logout` | ✅ Bearer JWT | Konfirmasi logout sisi server                                            |
| `GET`  | `/api/rooms`       | ✅ Bearer JWT | Mengambil daftar ruangan kampus (dilindungi token)                       |

---

## 👤 Akun Demo

| Field        | Nilai Demo                       |
| ------------ | -------------------------------- |
| **Email**    | `mahasiswa@kampuscare.ac.id`     |
| **Password** | `password123`                    |
| **Nama**     | Budi Santoso _(Data dummy)_      |
| **NIM**      | `2024103701100XX` _(Data dummy)_ |
| **Jurusan**  | Teknik Informatika               |

---

## 🔒 Catatan Logout & Token Blacklist

> [!NOTE]
> **Endpoint `POST /api/auth/logout` mencabut (revoke) penggunaan token di sisi server menggunakan Redis Blacklist (dengan in-memory fallback).**
>
> Mekanisme logout yang diimplementasikan:
>
> 1. Server memvalidasi token yang dikirim saat logout.
> 2. Token dicatat ke dalam **Redis Blacklist** (`src/data/blacklist.js`) dengan TTL sesuai sisa masa berlaku token. Jika server Redis lokal belum aktif, sistem secara cerdas beralih ke in-memory storage otomatis tanpa error.
> 3. Server merespons dengan `{ "message": "Logout berhasil" }`.
> 4. Jika token yang sama digunakan kembali untuk mengakses protected endpoint (seperti `GET /api/rooms`), `authMiddleware` menolaknya dengan status `401 Unauthorized`.
> 5. **Catatan Validitas**: Token sebenarnya tetap memiliki masa berlaku JWT (belum kedaluwarsa secara kriptografis), namun backend secara aktif menolak penggunaannya setelah token dimasukkan ke dalam blacklist.
> 6. Aplikasi frontend juga menghapus token dari penyimpanan lokal (`SecureStore` atau `AsyncStorage`).

---

## 🧪 Pengujian (Testing)

### 1. Menjalankan Automated Test Suite

Project ini dilengkapi dengan test runner otomatis yang menguji seluruh skenario (T01 - T18):

```bash
npm test
```

### 2. Pengujian Manual via REST Client

Gunakan ekstensi **REST Client** pada VS Code / Antigravity IDE dengan membuka file:

```
tests/api.test.http
```

### 3. Cara Menguji Token Expired

Untuk mendemonstrasikan penolakan token yang telah kedaluwarsa:

1. Ubah sementara nilai di `.env`:
   ```env
   JWT_EXPIRES_IN=10s
   ```
2. Restart server.
3. Login melalui endpoint `POST /api/auth/login` dan catat tokennya.
4. Tunggu lebih dari 10 detik.
5. Akses `GET /api/rooms` menggunakan token tersebut.
6. Server akan menolak dengan status `401` dan pesan:
   ```json
   { "error": "Token sudah kedaluwarsa. Silakan login kembali" }
   ```
7. Kembalikan `JWT_EXPIRES_IN=1h` setelah pengujian selesai.

---

## 🛡️ Keamanan

- Password user demo di-hash menggunakan **bcryptjs** (tidak ada plaintext password di codebase).
- Rahasia token (`JWT_SECRET`) dikelola melalui environment variables dan tidak di-commit ke Git (`.gitignore`).
- Semua response error login menggunakan pesan seragam (`Email atau password salah`) untuk mencegah _user enumeration_.
- Response user dan rooms tidak mengekspos token, password, atau credential sensitif ke log server.
