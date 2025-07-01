const express = require('express');
const MessageController = require('../controllers/messageController');
const router = express.Router();

router.get('/:friendId/get-message', MessageController.getMessages);
router.post('/:friendId/clear-chat', MessageController.clearMessage);
router.post('/delete-messages', MessageController.deleteMessage);

module.exports = router;