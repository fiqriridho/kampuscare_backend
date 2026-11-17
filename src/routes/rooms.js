const express = require("express");
const { getAllRooms } = require("../data/rooms");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const rooms = await getAllRooms();
    return res.json(rooms);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
