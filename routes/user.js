const express = require("express");
const UserController = require("../controllers/UserController");
const router = express.Router();

router.post('/block', UserController.blockUser);
router.post('/unblock', UserController.unblockUser);

module.exports = router;