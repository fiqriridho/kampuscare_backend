const db = require("../config/database");

function parseFacilities(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const STATUS_MAP = {
  kosong: "empty",
  digunakan: "occupied",
  akan_digunakan: "upcoming",
  upcoming: "upcoming",
  maintenance: "maintenance",
};

async function getAllRooms() {
  const [rooms] = await db.query(
    `SELECT id, name, building, location, status, capacity, facilities
     FROM classrooms
     ORDER BY id ASC`
  );

  return rooms.map((room) => {
    const rawStatus = (room.status || "").toLowerCase();

    return {
      id: room.id,
      name: room.name,
      building: room.building,
      location: room.location || room.building || "Kampus Utama",
      status: STATUS_MAP[rawStatus] || rawStatus,
      capacity: Number(room.capacity) || 0,
      facilities: parseFacilities(room.facilities),
    };
  });
}

module.exports = {
  getAllRooms,
};
