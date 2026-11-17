const http = require("http");
const jwt = require("jsonwebtoken");
const app = require("../server");
const { JWT_SECRET } = require("../src/config/env");

async function runTestSuite() {
  const PORT = 3001;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\n========================================`);
  console.log(`Menjalankan Test Suite Backend KampusCare di port ${PORT}`);
  console.log(`========================================\n`);

  const baseUrl = `http://localhost:${PORT}`;
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failedCount++;
    }
  }

  let validToken = "";

  try {
    // T01: Server aktif
    assert(server.listening, "T01: Server berjalan dan mendengarkan koneksi");

    // T02: GET /api/health
    const resHealth = await fetch(`${baseUrl}/api/health`);
    const dataHealth = await resHealth.json();
    assert(resHealth.status === 200 && dataHealth.status === "ok" && dataHealth.service === "kampuscare-backend", 'T02: GET /api/health mengembalikan 200 dengan status "ok"', JSON.stringify(dataHealth));

    // T03: POST /api/auth/login sukses
    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "mahasiswa@kampuscare.ac.id",
        password: "password123",
      }),
    });
    const dataLogin = await resLogin.json();
    validToken = dataLogin.token;
    assert(resLogin.status === 200 && dataLogin.message === "Login berhasil" && typeof dataLogin.token === "string" && dataLogin.token.length > 20 && dataLogin.user && dataLogin.user.email === "mahasiswa@kampuscare.ac.id", "T03: POST /api/auth/login dengan kredensial benar mengembalikan 200 + token + user", JSON.stringify(dataLogin));

    // T04: POST /api/auth/login email salah
    const resBadEmail = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "salah@kampuscare.ac.id",
        password: "password123",
      }),
    });
    const dataBadEmail = await resBadEmail.json();
    assert(resBadEmail.status === 401 && dataBadEmail.error === "Email atau password salah", "T04: POST /api/auth/login dengan email salah mengembalikan 401", JSON.stringify(dataBadEmail));

    // T05: POST /api/auth/login password salah
    const resBadPass = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "mahasiswa@kampuscare.ac.id",
        password: "passwordsalah",
      }),
    });
    const dataBadPass = await resBadPass.json();
    assert(resBadPass.status === 401 && dataBadPass.error === "Email atau password salah", "T05: POST /api/auth/login dengan password salah mengembalikan 401", JSON.stringify(dataBadPass));

    // T06: POST /api/auth/login tanpa body / body kosong
    const resEmptyBody = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const dataEmptyBody = await resEmptyBody.json();
    assert(resEmptyBody.status === 400 && dataEmptyBody.error === "Email dan password wajib diisi", "T06: POST /api/auth/login tanpa body mengembalikan 400", JSON.stringify(dataEmptyBody));

    // T07: GET /api/rooms dengan token valid
    const resRooms = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const dataRooms = await resRooms.json();
    assert(resRooms.status === 200 && Array.isArray(dataRooms) && dataRooms.length === 4, "T07: GET /api/rooms dengan token valid mengembalikan 200 + array 4 ruangan", `Status: ${resRooms.status}, Total items: ${dataRooms.length}`);

    // T08: GET /api/rooms tanpa header Authorization
    const resRoomsNoAuth = await fetch(`${baseUrl}/api/rooms`);
    const dataRoomsNoAuth = await resRoomsNoAuth.json();
    assert(resRoomsNoAuth.status === 401 && dataRoomsNoAuth.error, "T08: GET /api/rooms tanpa header Authorization mengembalikan 401", JSON.stringify(dataRoomsNoAuth));

    // T09: GET /api/rooms dengan token random/invalid
    const resRoomsBadToken = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: "Bearer random_invalid_token_xyz" },
    });
    const dataRoomsBadToken = await resRoomsBadToken.json();
    assert(resRoomsBadToken.status === 401 && dataRoomsBadToken.error === "Token tidak valid", 'T09: GET /api/rooms dengan token random mengembalikan 401 "Token tidak valid"', JSON.stringify(dataRoomsBadToken));

    // T10: GET /api/rooms dengan token expired
    const expiredToken = jwt.sign({ userId: 1, email: "mahasiswa@kampuscare.ac.id", jti: "expired-jti" }, JWT_SECRET, {
      expiresIn: -1,
    });
    const resRoomsExpired = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const dataRoomsExpired = await resRoomsExpired.json();
    assert(resRoomsExpired.status === 401 && dataRoomsExpired.error === "Token sudah kedaluwarsa. Silakan login kembali", 'T10: GET /api/rooms dengan token expired mengembalikan 401 "Token sudah kedaluwarsa. Silakan login kembali"', JSON.stringify(dataRoomsExpired));

    // T11: GET /api/auth/me dengan token valid
    const resMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const dataMe = await resMe.json();
    assert(resMe.status === 200 && dataMe.user && dataMe.user.email === "mahasiswa@kampuscare.ac.id", "T11: GET /api/auth/me dengan token valid mengembalikan 200 + user profile", JSON.stringify(dataMe));

    // T12: POST /api/auth/logout dengan token valid
    const resLogout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const dataLogout = await resLogout.json();
    assert(resLogout.status === 200 && dataLogout.message === "Logout berhasil", 'T12: POST /api/auth/logout dengan token valid mengembalikan 200 + message "Logout berhasil"', JSON.stringify(dataLogout));

    // T13: Data rooms memiliki field lengkap
    const requiredRoomFields = ["id", "name", "status", "capacity", "location", "facilities"];
    const hasAllFields = Array.isArray(dataRooms) && dataRooms.every((room) => requiredRoomFields.every((f) => f in room && room[f] !== undefined));
    assert(hasAllFields, "T13: Semua item rooms memiliki field: id, name, status, capacity, location, facilities");

    // T14: Status rooms memiliki semua nilai: empty, occupied, upcoming, maintenance
    const statuses = new Set(dataRooms.map((r) => r.status));
    const allStatusesPresent = ["empty", "occupied", "upcoming", "maintenance"].every((s) => statuses.has(s));
    assert(allStatusesPresent, "T14: Status rooms mencakup ke-4 nilai: empty, occupied, upcoming, maintenance", `Found: ${[...statuses].join(", ")}`);

    // T15: Password tidak terekspos di data login/user
    const passwordNotExposed = !dataLogin.user.password && !dataMe.user.password && !JSON.stringify(dataLogin).includes("password123");
    assert(passwordNotExposed, "T15: Password tidak terekspos pada response JSON");

    // T16: Token tidak bocor di endpoint publik health check
    assert(!JSON.stringify(dataHealth).includes("token"), "T16: Endpoint publik tidak mengekspos token");

    // T17: Profil user lengkap dan sesuai seed demo
    const { name, nim, major, email, avatar } = dataLogin.user;
    const isSeedProfile =
      name === "Fiqri Ridho F" &&
      nim === "202410370110167" &&
      major === "Teknik Informatika" &&
      email === "mahasiswa@kampuscare.ac.id" &&
      typeof avatar === "string" &&
      avatar.length > 0;
    assert(isSeedProfile, "T17: Profil user memuat data seed demo lengkap (nama, NIM, jurusan, email, avatar)", JSON.stringify(dataLogin.user));

    // T18: Token ditolak (401) setelah logout (Blacklist)
    // 1. Login dan simpan token baru
    const resLoginT18 = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "mahasiswa@kampuscare.ac.id",
        password: "password123",
      }),
    });
    const dataLoginT18 = await resLoginT18.json();
    const tokenT18 = dataLoginT18.token;

    // 2. Pastikan GET /api/rooms dengan token tersebut menghasilkan 200
    const resRoomsBeforeLogout = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${tokenT18}` },
    });

    // 3. Panggil POST /api/auth/logout dengan token yang sama
    const resLogoutT18 = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenT18}` },
    });

    // 4. Panggil kembali GET /api/rooms dengan token yang sama
    const resRoomsAfterLogout = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${tokenT18}` },
    });
    const dataRoomsAfterLogout = await resRoomsAfterLogout.json();

    // 5. Verifikasi apakah token ditolak (401)
    assert(resRoomsBeforeLogout.status === 200 && resLogoutT18.status === 200 && resRoomsAfterLogout.status === 401 && dataRoomsAfterLogout.error === "Token tidak valid", "T18: Token ditolak (401) setelah logout", `Status actual setelah logout: ${resRoomsAfterLogout.status} (diharapkan 401). Response: ${JSON.stringify(dataRoomsAfterLogout)}`);

    // ========================================================================
    // TEST SUITE REPORTS & TUGAS PERBAIKAN FASILITAS (R19 - R36)
    // ========================================================================

    // R19: GET /api/reports tanpa token -> 401
    const resRepNoAuth = await fetch(`${baseUrl}/api/reports`);
    assert(resRepNoAuth.status === 401, "R19: GET /api/reports tanpa token mengembalikan 401");

    // Login Mahasiswa untuk token aktif baru
    const resLogMhs = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "mahasiswa@kampuscare.ac.id", password: "password123" }),
    });
    const dataLogMhs = await resLogMhs.json();
    const mhsToken = dataLogMhs.token;

    // R20: Login Admin sukses + role === 'admin'
    const resLogAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@kampuscare.ac.id", password: "admin123" }),
    });
    const dataLogAdmin = await resLogAdmin.json();
    const adminToken = dataLogAdmin.token;
    assert(
      resLogAdmin.status === 200 && dataLogAdmin.user && dataLogAdmin.user.role === "admin",
      "R20: POST /api/auth/login admin mengembalikan 200 dan role: admin",
      JSON.stringify(dataLogAdmin)
    );

    // R21: POST /api/reports oleh Admin -> 403 Forbidden (Hanya mahasiswa yang boleh lapor)
    const fdAdmin = new FormData();
    fdAdmin.append("title", "Laporan Admin Coba Buat");
    fdAdmin.append("description", "Ini deskripsi perbaikan yang dibuat admin");
    const resPostAdmin = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: fdAdmin,
    });
    assert(resPostAdmin.status === 403, "R21: POST /api/reports oleh Admin ditolak 403 Forbidden");

    // R22: POST /api/reports oleh Mahasiswa tanpa body / data tidak lengkap -> 400
    const fdEmpty = new FormData();
    const resPostEmpty = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mhsToken}` },
      body: fdEmpty,
    });
    assert(resPostEmpty.status === 400, "R22: POST /api/reports tanpa judul mengembalikan 400");

    // R23: POST /api/reports deskripsi < 10 karakter -> 400
    const fdShort = new FormData();
    fdShort.append("title", "Proyektor Rusak");
    fdShort.append("description", "pendek");
    const resPostShort = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mhsToken}` },
      body: fdShort,
    });
    assert(resPostShort.status === 400, "R23: POST /api/reports deskripsi < 10 karakter mengembalikan 400");

    // R24: POST /api/reports valid oleh Mahasiswa dengan file foto -> 201 + status menunggu
    const fdValid = new FormData();
    fdValid.append("title", "AC Ruang 204 Mati Total");
    fdValid.append("description", "Pendingin ruangan tidak menyala dan mengeluarkan dengungan");
    fdValid.append("location_detail", "Gedung B Lt. 2");
    const dummyImageBlob = new Blob(["fake-image-bytes-content"], { type: "image/jpeg" });
    fdValid.append("photo", dummyImageBlob, "damage_test.jpg");

    const resPostValid = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mhsToken}` },
      body: fdValid,
    });
    const dataPostValid = await resPostValid.json();
    const createdReportId = dataPostValid.data?.id;
    assert(
      resPostValid.status === 201 &&
        dataPostValid.data &&
        dataPostValid.data.status === "menunggu" &&
        typeof dataPostValid.data.photo_url === "string",
      "R24: POST /api/reports valid dengan foto mengembalikan 201 dan status: menunggu",
      JSON.stringify(dataPostValid)
    );

    // R25: GET /api/reports oleh Mahasiswa -> 200 + hanya own reports
    const resRepMhs = await fetch(`${baseUrl}/api/reports`, {
      headers: { Authorization: `Bearer ${mhsToken}` },
    });
    const dataRepMhs = await resRepMhs.json();
    assert(
      resRepMhs.status === 200 &&
        Array.isArray(dataRepMhs.data) &&
        dataRepMhs.data.every((r) => r.user_id === dataLogMhs.user.id),
      "R25: GET /api/reports oleh Mahasiswa hanya mengembalikan laporan milik sendiri"
    );

    // R26: GET /api/reports oleh Admin -> 200 + melihat semua laporan
    const resRepAdmin = await fetch(`${baseUrl}/api/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataRepAdmin = await resRepAdmin.json();
    assert(
      resRepAdmin.status === 200 &&
        Array.isArray(dataRepAdmin.data) &&
        dataRepAdmin.data.some((r) => r.id === createdReportId),
      "R26: GET /api/reports oleh Admin dapat melihat seluruh laporan"
    );

    // R27: GET /api/reports?status=menunggu terfilter
    const resRepFilter = await fetch(`${baseUrl}/api/reports?status=menunggu`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataRepFilter = await resRepFilter.json();
    assert(
      resRepFilter.status === 200 &&
        dataRepFilter.data.every((r) => r.status === "menunggu"),
      "R27: GET /api/reports?status=menunggu berhasil memfilter data berstatus menunggu"
    );

    // R28: PATCH /api/reports/:id oleh Mahasiswa -> 403 Forbidden
    const resPatchMhs = await fetch(`${baseUrl}/api/reports/${createdReportId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${mhsToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "diproses" }),
    });
    assert(resPatchMhs.status === 403, "R28: PATCH /api/reports/:id oleh Mahasiswa ditolak 403");

    // R29: PATCH /api/reports/:id transisi invalid ('selesai' langsung dari 'menunggu') -> 409 Conflict
    const resPatchInvalid = await fetch(`${baseUrl}/api/reports/${createdReportId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "selesai" }),
    });
    assert(
      resPatchInvalid.status === 409,
      "R29: PATCH status langsung dari 'menunggu' ke 'selesai' ditolak 409 Conflict"
    );

    // R30: PATCH /api/reports/:id oleh Admin 'menunggu' -> 'diproses' -> 200
    const resPatchDiproses = await fetch(`${baseUrl}/api/reports/${createdReportId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "diproses", note: "Teknisi sedang menuju lokasi" }),
    });
    const dataPatchDiproses = await resPatchDiproses.json();
    assert(
      resPatchDiproses.status === 200 && dataPatchDiproses.data?.status === "diproses",
      "R30: PATCH status 'menunggu' -> 'diproses' oleh Admin berhasil (200)"
    );

    // R31: PATCH 'diproses' -> 'selesai' TANPA foto bukti -> 409 Conflict
    const resPatchNoPhoto = await fetch(`${baseUrl}/api/reports/${createdReportId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "selesai" }),
    });
    assert(
      resPatchNoPhoto.status === 409,
      "R31: PATCH status ke 'selesai' tanpa foto bukti perbaikan ditolak 409 Conflict"
    );

    // R32: POST /api/reports/:id/evidence-photo oleh Mahasiswa -> 403 Forbidden
    const fdEvMhs = new FormData();
    fdEvMhs.append("photo", dummyImageBlob, "evidence_mhs.jpg");
    const resEvMhs = await fetch(`${baseUrl}/api/reports/${createdReportId}/evidence-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mhsToken}` },
      body: fdEvMhs,
    });
    assert(resEvMhs.status === 403, "R32: POST evidence-photo oleh Mahasiswa ditolak 403 Forbidden");

    // R33: POST /api/reports/:id/evidence-photo oleh Admin -> 200 + evidence_photo_url
    const fdEvAdmin = new FormData();
    fdEvAdmin.append("photo", dummyImageBlob, "evidence_admin.jpg");
    const resEvAdmin = await fetch(`${baseUrl}/api/reports/${createdReportId}/evidence-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: fdEvAdmin,
    });
    const dataEvAdmin = await resEvAdmin.json();
    assert(
      resEvAdmin.status === 200 && typeof dataEvAdmin.evidence_photo_url === "string",
      "R33: POST evidence-photo oleh Admin berhasil mengunggah foto bukti (200)"
    );

    // R34: PATCH 'diproses' -> 'selesai' SETELAH foto bukti tersedia -> 200
    const resPatchSelesai = await fetch(`${baseUrl}/api/reports/${createdReportId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "selesai", note: "AC telah diganti kompresor baru" }),
    });
    const dataPatchSelesai = await resPatchSelesai.json();
    assert(
      resPatchSelesai.status === 200 && dataPatchSelesai.data?.status === "selesai",
      "R34: PATCH status 'diproses' -> 'selesai' setelah ada foto bukti berhasil (200)"
    );

    // R35: GET /api/reports/:id/history -> 200 + audit trail lengkap
    const resHistory = await fetch(`${baseUrl}/api/reports/${createdReportId}/history`, {
      headers: { Authorization: `Bearer ${mhsToken}` },
    });
    const dataHistory = await resHistory.json();
    assert(
      resHistory.status === 200 &&
        Array.isArray(dataHistory.data) &&
        dataHistory.data.length >= 3,
      "R35: GET /api/reports/:id/history mengembalikan riwayat audit status lengkap (menunggu, diproses, selesai)"
    );

    // R36: GET /api/reports/:id/photo -> 200 stream gambar
    const resGetPhoto = await fetch(`${baseUrl}/api/reports/${createdReportId}/photo`, {
      headers: { Authorization: `Bearer ${mhsToken}` },
    });
    assert(
      resGetPhoto.status === 200,
      "R36: GET /api/reports/:id/photo dengan otorisasi mengembalikan 200 file stream"
    );
  } catch (err) {
    console.error("Error saat menjalankan test:", err);
    failedCount++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Hasil Test: ${passedCount} LULUS, ${failedCount} GAGAL`);
    console.log(`========================================\n`);
    process.exit(failedCount === 0 ? 0 : 1);
  }
}

runTestSuite();
