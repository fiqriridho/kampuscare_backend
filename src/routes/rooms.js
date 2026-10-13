const express = require('express');
const { getAllRooms } = require('../data/rooms');

const router = express.Router();

// GET /api/rooms
router.get('/', (req, res) => {
  const rooms = getAllRooms();
  return res.json(rooms);
});

module.exports = router;
