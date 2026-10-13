const bcrypt = require('bcryptjs');

const USERS = [
  {
    id: 1,
    email: 'mahasiswa@kampuscare.ac.id',
    password: bcrypt.hashSync('password123', 10),
    profile: {
      name: 'Budi Santoso',
      nim: '2024103701100XX',
      major: 'Teknik Informatika',
      email: 'mahasiswa@kampuscare.ac.id',
      avatar: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=4F46E5&color=fff&size=200',
    },
  },
];

function findUserByEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  const normalized = email.trim().toLowerCase();
  return USERS.find((user) => user.email.toLowerCase() === normalized) || null;
}

module.exports = {
  findUserByEmail,
};
