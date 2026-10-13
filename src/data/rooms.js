const ROOMS = [
  {
    id: 1,
    name: 'Ruang 401',
    status: 'empty',
    capacity: 40,
    location: 'Gedung Kuliah Bersama Lt. 4',
    facilities: ['Proyektor', 'AC', 'Whiteboard'],
  },
  {
    id: 2,
    name: 'Ruang 402',
    status: 'occupied',
    capacity: 35,
    location: 'Gedung Kuliah Bersama Lt. 4',
    facilities: ['Proyektor', 'AC', 'Whiteboard'],
  },
  {
    id: 3,
    name: 'Ruang 316',
    status: 'upcoming',
    capacity: 30,
    location: 'Gedung Kuliah Bersama Lt. 3',
    facilities: ['Proyektor', 'AC'],
  },
  {
    id: 4,
    name: 'Ruang 610',
    status: 'maintenance',
    capacity: 45,
    location: 'Gedung Kuliah Bersama Lt. 6',
    facilities: ['Proyektor', 'AC', 'Whiteboard', 'Speaker'],
  },
];

function getAllRooms() {
  return ROOMS;
}

module.exports = {
  getAllRooms,
};
