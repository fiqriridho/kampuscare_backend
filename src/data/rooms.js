const db = require("../config/database");

async function getAllRooms() {
  const [rooms] = await db.query(
    `SELECT id, name, building, status, capacity
     FROM classrooms
     ORDER BY id ASC`,
  );

  return rooms;
}

module.exports = {
  getAllRooms,
};
