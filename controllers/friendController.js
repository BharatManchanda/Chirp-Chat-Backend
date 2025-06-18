const Message = require("../models/Message");
const User = require("../models/User");
const FriendService = require("../services/friend.service");

class FriendController {
    static async sendRequest(req, res) {
        try {
            await FriendService.sendRequest(req.body.senderId, req.body.receiverId);
            res.json({
                status: true,
                message: 'Request sent.'
            });
        } catch (err) {
            res.status(400).json({
                status: false,
                message: err.message
            });
        }
    }

    static async acceptRequest(req, res) {
        try {
            await FriendService.acceptRequest(req.body.receiverId, req.body.senderId);
            res.json({
                status: true,
                message: 'Friend request accepted.'
            });
        } catch (err) {
            res.status(422).json({
                status: false,
                message: err.message
            });
        }
    }

    static async rejectRequest(req, res) {
        try {
            await FriendService.rejectRequest(req.body.receiverId, req.body.senderId);
            res.json({
                status: true,
                message: 'Friend request rejected.'
            });
        } catch (err) {
            res.status(422).json({
                status: false,
                message: err.message
            });
        }
    }

    static async getRequests(req, res) {
        try {
            const user = await User.findById(req.params.userId).populate('friendRequests', 'name email');
            if (!user) return res.status(404).json({ error: 'User not found.' });
            res.json({
                status: true,
                data: user.friendRequests
            });
        } catch (err) {
            res.status(422).json({
                status: false,
                error: err.message
            });
        }
    }

    static async getFriends(req, res) {
        try {
            const userId = req.user._id
            const user = await User.findById(req.user._id).select('friends').populate('friends', 'username email');

            const friends = await Promise.all(
                user.friends.map(async(friend) => {
                    const lastMessage = await Message.findOne({
                        $or: [
                            { senderId: userId, receiverId: friend._id },
                            { senderId: friend._id, receiverId: userId }
                        ]
                    }).sort({ createdAt: -1 });

                    const unreadCount = await Message.countDocuments({
                        senderId: friend._id,
                        receiverId: userId,
                        readAt: null
                    });

                    return {
                        _id: friend._id,
                        username: friend.username,
                        email: friend.email,
                        profileImg: friend.profileImg,
                        lastMessage,
                        unreadCount
                    };
                })
            )

            res.json({
                status: true,
                data: friends
            });
        } catch (err) {
            res.status(422).json({
                status: false,
                error: err.message
            });
        }
    }
}

module.exports = FriendController;