const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { JWT_SECRET } = require('../src/config/env');

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

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failedCount++;
    }
  }

  let validToken = '';

  try {
    // T01: Server aktif
    assert(server.listening, 'T01: Server berjalan dan mendengarkan koneksi');

    // T02: GET /api/health
    const resHealth = await fetch(`${baseUrl}/api/health`);
    const dataHealth = await resHealth.json();
    assert(
      resHealth.status === 200 && dataHealth.status === 'ok' && dataHealth.service === 'kampuscare-backend',
      'T02: GET /api/health mengembalikan 200 dengan status "ok"',
      JSON.stringify(dataHealth)
    );

    // T03: POST /api/auth/login sukses
    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mahasiswa@kampuscare.ac.id',
        password: 'password123',
      }),
    });
    const dataLogin = await resLogin.json();
    validToken = dataLogin.token;
    assert(
      resLogin.status === 200 &&
        dataLogin.message === 'Login berhasil' &&
        typeof dataLogin.token === 'string' &&
        dataLogin.token.length > 20 &&
        dataLogin.user &&
        dataLogin.user.email === 'mahasiswa@kampuscare.ac.id',
      'T03: POST /api/auth/login dengan kredensial benar mengembalikan 200 + token + user',
      JSON.stringify(dataLogin)
    );

    // T04: POST /api/auth/login email salah
    const resBadEmail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'salah@kampuscare.ac.id',
        password: 'password123',
      }),
    });
    const dataBadEmail = await resBadEmail.json();
    assert(
      resBadEmail.status === 401 && dataBadEmail.error === 'Email atau password salah',
      'T04: POST /api/auth/login dengan email salah mengembalikan 401',
      JSON.stringify(dataBadEmail)
    );

    // T05: POST /api/auth/login password salah
    const resBadPass = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mahasiswa@kampuscare.ac.id',
        password: 'passwordsalah',
      }),
    });
    const dataBadPass = await resBadPass.json();
    assert(
      resBadPass.status === 401 && dataBadPass.error === 'Email atau password salah',
      'T05: POST /api/auth/login dengan password salah mengembalikan 401',
      JSON.stringify(dataBadPass)
    );

    // T06: POST /api/auth/login tanpa body / body kosong
    const resEmptyBody = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const dataEmptyBody = await resEmptyBody.json();
    assert(
      resEmptyBody.status === 400 && dataEmptyBody.error === 'Email dan password wajib diisi',
      'T06: POST /api/auth/login tanpa body mengembalikan 400',
      JSON.stringify(dataEmptyBody)
    );

    // T07: GET /api/rooms dengan token valid
    const resRooms = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const dataRooms = await resRooms.json();
    assert(
      resRooms.status === 200 && Array.isArray(dataRooms) && dataRooms.length === 4,
      'T07: GET /api/rooms dengan token valid mengembalikan 200 + array 4 ruangan',
      `Status: ${resRooms.status}, Total items: ${dataRooms.length}`
    );

    // T08: GET /api/rooms tanpa header Authorization
    const resRoomsNoAuth = await fetch(`${baseUrl}/api/rooms`);
    const dataRoomsNoAuth = await resRoomsNoAuth.json();
    assert(
      resRoomsNoAuth.status === 401 && dataRoomsNoAuth.error,
      'T08: GET /api/rooms tanpa header Authorization mengembalikan 401',
      JSON.stringify(dataRoomsNoAuth)
    );

    // T09: GET /api/rooms dengan token random/invalid
    const resRoomsBadToken = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: 'Bearer random_invalid_token_xyz' },
    });
    const dataRoomsBadToken = await resRoomsBadToken.json();
    assert(
      resRoomsBadToken.status === 401 && dataRoomsBadToken.error === 'Token tidak valid',
      'T09: GET /api/rooms dengan token random mengembalikan 401 "Token tidak valid"',
      JSON.stringify(dataRoomsBadToken)
    );

    // T10: GET /api/rooms dengan token expired
    const expiredToken = jwt.sign({ userId: 1, email: 'mahasiswa@kampuscare.ac.id' }, JWT_SECRET, {
      expiresIn: -1,
    });
    const resRoomsExpired = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const dataRoomsExpired = await resRoomsExpired.json();
    assert(
      resRoomsExpired.status === 401 &&
        dataRoomsExpired.error === 'Token sudah kedaluwarsa. Silakan login kembali',
      'T10: GET /api/rooms dengan token expired mengembalikan 401 "Token sudah kedaluwarsa. Silakan login kembali"',
      JSON.stringify(dataRoomsExpired)
    );

    // T11: GET /api/auth/me dengan token valid
    const resMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const dataMe = await resMe.json();
    assert(
      resMe.status === 200 && dataMe.user && dataMe.user.email === 'mahasiswa@kampuscare.ac.id',
      'T11: GET /api/auth/me dengan token valid mengembalikan 200 + user profile',
      JSON.stringify(dataMe)
    );

    // T12: POST /api/auth/logout dengan token valid
    const resLogout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const dataLogout = await resLogout.json();
    assert(
      resLogout.status === 200 && dataLogout.message === 'Logout berhasil',
      'T12: POST /api/auth/logout dengan token valid mengembalikan 200 + message "Logout berhasil"',
      JSON.stringify(dataLogout)
    );

    // T13: Data rooms memiliki field lengkap
    const requiredRoomFields = ['id', 'name', 'status', 'capacity', 'location', 'facilities'];
    const hasAllFields =
      Array.isArray(dataRooms) &&
      dataRooms.every((room) => requiredRoomFields.every((f) => f in room && room[f] !== undefined));
    assert(
      hasAllFields,
      'T13: Semua item rooms memiliki field: id, name, status, capacity, location, facilities'
    );

    // T14: Status rooms memiliki semua nilai: empty, occupied, upcoming, maintenance
    const statuses = new Set(dataRooms.map((r) => r.status));
    const allStatusesPresent = ['empty', 'occupied', 'upcoming', 'maintenance'].every((s) =>
      statuses.has(s)
    );
    assert(
      allStatusesPresent,
      'T14: Status rooms mencakup ke-4 nilai: empty, occupied, upcoming, maintenance',
      `Found: ${[...statuses].join(', ')}`
    );

    // T15: Password tidak terekspos di data login/user
    const passwordNotExposed =
      !dataLogin.user.password &&
      !dataMe.user.password &&
      !JSON.stringify(dataLogin).includes('password123');
    assert(
      passwordNotExposed,
      'T15: Password tidak terekspos pada response JSON'
    );

    // T16: Token tidak bocor di endpoint publik health check
    assert(
      !JSON.stringify(dataHealth).includes('token'),
      'T16: Endpoint publik tidak mengekspos token'
    );

    // T17: Profil user menggunakan data dummy
    const isDummyData =
      dataLogin.user.name === 'Budi Santoso' &&
      dataLogin.user.nim === '2024103701100XX' &&
      dataLogin.user.avatar.includes('ui-avatars.com');
    assert(
      isDummyData,
      'T17: Profil user menggunakan data dummy (Budi Santoso / 2024103701100XX / UI Avatars)',
      JSON.stringify(dataLogin.user)
    );
  } catch (err) {
    console.error('Error saat menjalankan test:', err);
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
