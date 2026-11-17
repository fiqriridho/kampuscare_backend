# 🏫 KampusCare Backend API

Backend REST API untuk aplikasi **KampusCare** (aplikasi pelaporan fasilitas dan status ruangan kampus), dibangun dengan **Node.js** dan **Express**. Project ini mengimplementasikan autentikasi berbasis **JSON Web Token (JWT)** dan proteksi endpoint sesuai rubrik evaluasi **Sprint 04**.

---

## 📌 Fitur Utama

- **Autentikasi JWT**: Endpoint login yang menghasilkan token JWT terenkripsi dengan masa berlaku (expiry).
- **Proteksi Endpoint API**: Middleware autentikasi yang memverifikasi header `Authorization: Bearer <token>`.
- **Stateless Session Management**: Client-side session management dengan endpoint konfirmasi logout.
- **Data Ruangan Sesuai Kontrak**: Endpoint `/api/rooms` dengan struktur data identik dengan kontrak Beeceptor.
- **Keamanan Password**: Password di-hash menggunakan algoritma `bcryptjs` (salt rounds 10).
- **Seed Data Demo**: Akun demo dan 4 ruangan dimuat dari `db/schema_and_seed.sql` (password disimpan sebagai hash bcrypt).

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

#### Generate `JWT_SECRET` Sendiri

Buka terminal di folder backend `kampus-care-backend`, lalu jalankan perintah berikut untuk membuat secret acak yang kuat (32 bytes / 64 karakter hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salin hasil output string tersebut ke dalam file `.env`:

```env
PORT=3000
JWT_SECRET=hasil_secret_yang_dihasilkan
JWT_EXPIRES_IN=1h
REDIS_URL=redis://localhost:6379
```

#### Penjelasan Environment Variables

| Variable | Wajib | Deskripsi | Default / Contoh |
| :--- | :---: | :--- | :--- |
| `PORT` | Tidak | Port listener server Express | `3000` |
| `JWT_SECRET` | **Wajib** | Kunci rahasia untuk menandatangani (sign) dan memverifikasi token JWT | String acak dari perintah `crypto` di atas |
| `JWT_EXPIRES_IN` | Tidak | Masa berlaku token JWT sebelum kedaluwarsa | `1h` (1 jam) atau `10s` untuk testing |
| `REDIS_URL` | Opsional | URL koneksi ke Redis untuk token blacklist | `redis://localhost:6379` *(jika Redis offline, otomatis fallback ke in-memory)* |

> [!WARNING]
> **Peringatan Keamanan Penting**:
> - **Wajib generate secret sendiri**: Jangan pernah menggunakan nilai contoh atau placeholder sebagai secret di environment sebenarnya.
> - **Jangan commit `.env` ke GitHub/Git**: Pastikan file `.env` selalu tercantum dalam `.gitignore` agar kredensial dan secret tidak bocor ke publik.
> - **Restart backend setelah mengubah konfigurasi**: Perubahan apa pun pada file `.env` memerlukan restart server agar konfigurasi baru terbaca dan diterapkan.

---

### 4. Siapkan Database (MySQL / Laragon)

Jalankan dari folder `kampus-care-backend`:

```bash
mysql -u root -p < db/schema_and_seed.sql
```

Script ini bersifat **destruktif**: menghapus lalu membuat ulang tabel `users`, `classrooms`, `reports`, dan `report_history` di database `kampus_care`, lalu mengisi 1 akun demo + 4 ruangan.

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
| `POST` | `/api/auth/register` | ❌ Publik   | Registrasi akun baru (nama, NIM, jurusan, email, password) → `201` + token JWT. Email/NIM duplikat → `409` |
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
| **Nama**     | Fiqri Ridho F _(seed)_           |
| **NIM**      | `202410370110167` _(seed)_       |
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
