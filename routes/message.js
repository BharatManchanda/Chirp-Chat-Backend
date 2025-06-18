const express = require('express');
const MessageController = require('../controllers/messageController');
const router = express.Router();

router.get('/:friendId/get-message', MessageController.getMessages);

module.exports = router;