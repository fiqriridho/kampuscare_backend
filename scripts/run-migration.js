const pool = require('../src/config/database');

async function runMigration() {
  console.log('Checking database schema...');

  // Check if columns exist
  const [cols] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reports'
  `);
  const existingCols = cols.map(c => c.COLUMN_NAME.toLowerCase());

  if (!existingCols.includes('photo_url')) {
    console.log('Adding column photo_url to reports...');
    await pool.query('ALTER TABLE reports ADD COLUMN photo_url VARCHAR(500) NULL AFTER status');
    console.log('Column photo_url added.');
  } else {
    console.log('Column photo_url already exists.');
  }

  if (!existingCols.includes('evidence_photo_url')) {
    console.log('Adding column evidence_photo_url to reports...');
    await pool.query('ALTER TABLE reports ADD COLUMN evidence_photo_url VARCHAR(500) NULL AFTER photo_url');
    console.log('Column evidence_photo_url added.');
  } else {
    console.log('Column evidence_photo_url already exists.');
  }

  // Update existing mahasiswa account password hash to verified password123 hash
  await pool.execute(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    ['$2b$10$3SEb9tTbvEd90Y9ik/ZchOrinKUdcVhyB7fQ/44eoQXyN/qjmIBF2', 'mahasiswa@kampuscare.ac.id']
  );
  console.log('Mahasiswa password hash verified and updated.');

  // Seed admin account
  await pool.execute(
    `INSERT IGNORE INTO users (name, nim, email, password_hash, major, avatar_url, role)
     VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    [
      'Admin KampusCare',
      'admin@kampuscare.ac.id',
      '$2b$10$A3KCFU.iG2q9m5kN3VPpi.UiVeRhLc84VSvfq.UQIRJk3xqSk8M.a',
      'Administrator',
      'https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff',
      'admin'
    ]
  );
  console.log('Admin user seeded (if not exists).');

  const [finalCols] = await pool.query('DESCRIBE reports');
  console.log('Final reports columns:', finalCols.map(c => c.Field));

  const [users] = await pool.query('SELECT id, name, email, role FROM users');
  console.log('Final users list in DB:', users);

  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
