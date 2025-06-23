const express = require('express');
const FriendController = require('../controllers/friendController');
const router = express.Router();

router.post('/send-request', FriendController.sendRequest);
router.post('/accept-request', FriendController.acceptRequest);
router.post('/cancel-request', FriendController.cancelRequest);
router.get('/requests/:userId', FriendController.getRequests);
router.get('/get-friends', FriendController.getFriends);

module.exports = router;