const Message = require("../models/Message");
const mongoose = require("mongoose");

class MessageController {
    static async sendMessage(data) {
        try {
            const { senderId, receiverId, message, replyToMessageId, isGroup } = data;
            let newData = {
                senderId,
                message,
                replyToMessageId,
            };
            newData.receiverId = isGroup ? null : receiverId;
            newData.group = isGroup ? receiverId : null;
            const newMessage = await Message.create(newData);
            const savedMessage = await Message.findById(newMessage._id)
                .populate('replyToMessageId');
            return savedMessage.toObject();
        } catch (err) {
            throw new Error("Message saving failed: " + err.message);
        }
    }

    static async getMessages(req, res) {
        try {
            const page = parseInt(req.query.page) || 1; // default page 1
            const limit = parseInt(req.params.limit) || 50;
            const skip = (page - 1) * limit;

            const isGroup = req.query.isGroup === 'true'; // ensure boolean
            const targetId = req.params.friendId; // friendId or groupId

            let condition = [];

            if (!isGroup) {
                // 1-to-1 chat
                condition = [
                    {
                        senderId: req.user._id,
                        receiverId: targetId,
                        deletedForSender: { $ne: true }
                    },
                    {
                        senderId: targetId,
                        receiverId: req.user._id,
                        deletedForReceiver: { $ne: true }
                    }
                ];
            } else {
                // Group chat
                condition = [
                    {
                        group: targetId,
                        deletedForSender: { $ne: true }
                    },
                    {
                        group: targetId,
                        deletedForReceiver: { $ne: true }
                    }
                ];
            }

            // Fetch messages
            const messages = await Message.find({ $or: condition })
                .populate('replyToMessageId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Count total messages for pagination
            let totalMessages = 0;
            if (!isGroup) {
                totalMessages = await Message.countDocuments({
                    $or: [
                        { senderId: req.user._id, receiverId: targetId },
                        { senderId: targetId, receiverId: req.user._id }
                    ]
                });
            } else {
                totalMessages = await Message.countDocuments({ group: targetId });
            }

            res.json({
                status: true,
                data: messages.reverse(), // oldest first
                pagination: {
                    total: totalMessages,
                    page,
                    limit,
                    totalPages: Math.ceil(totalMessages / limit)
                }
            });
        } catch (err) {
            res.status(422).json({
                status: false,
                message: err.message
            });
        }
    }


    static async markAsRead(req, res) {
        try {
            const { messageId } = req.params;

            const updated = await Message.findByIdAndUpdate(
                messageId,
                { readAt: new Date(), status: 'read' },
                { new: true }
            );

            if (!updated) {
                return res.status(404).json({ status: false, message: "Message not found" });
            }

            res.json({ status: true, message: "Message marked as read", data: updated });
        } catch (err) {
            res.status(500).json({ status: false, message: err.message });
        }
    }

    static async deleteMessage(req, res) {
        try {
            const userId = req.user._id;
            const { messageIds, deleteFor } = req.body;

            // Normalize to array
            const ids = Array.isArray(messageIds) ? messageIds : [messageIds];

            const updatedMessages = [];

            for (const messageId of ids) {
                const message = await Message.findById(messageId);
                if (!message) continue;

                if (deleteFor === "everyone" && message.senderId.toString() === userId.toString()) {
                    message.deletedForSender = true;
                    message.deletedForReceiver = true;
                } else if (deleteFor === "me") {
                    if (message.senderId.toString() === userId.toString()) {
                        message.deletedForSender = true;
                    } else if (message.receiverId.toString() === userId.toString()) {
                        message.deletedForReceiver = true;
                    }
                }

                await message.save();
                updatedMessages.push(message);
            }

            if (updatedMessages.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "No messages found or updated"
                });
            }

            res.json({
                status: true,
                message: `Deleted ${updatedMessages.length} message(s) for ${deleteFor}`,
                data: updatedMessages
            });

        } catch (err) {
            res.status(422).json({
                status: false,
                message: err.message
            });
        }
    }

    static async clearMessage(req, res) {
        try {
            const friendId = req.params.friendId;
            const userId = req.user._id;

            await Message.updateMany(
                {
                    senderId: userId,
                    receiverId: friendId
                },
                { $set: { deletedForSender: true } }
            );

            await Message.updateMany(
                {
                    senderId: friendId,
                    receiverId: userId
                },
                { $set: { deletedForReceiver: true } }
            );

            res.json({
                status: true,
                message: "Clear message successfully."
            });
        } catch (error) {
            res.status(422).json({
                status: false,
                message: err.message
            });
        }
    }

    static async getUnreadMessage(data, flag = "receiverId") {
        try {
            const { senderId, receiverId, isGroup } = data;

            // Build match condition dynamically
            const matchCondition = {
                readAt: null,
            };

            if (!isGroup) {
                if (flag === "receiverId") {
                    matchCondition.receiverId = new mongoose.Types.ObjectId(receiverId);
                } else if (flag === "senderId") {
                    matchCondition.senderId = new mongoose.Types.ObjectId(senderId);
                }
            } else {
                matchCondition.group = new mongoose.Types.ObjectId(receiverId);
            }

            const unreadMessages = await Message.aggregate([
                {
                    $match: matchCondition
                },
                {
                    $group: {
                        _id: isGroup ? "$group" : "$senderId",
                        unreadCount: { $sum: 1 }
                    }
                }
            ]);
            console.log(unreadMessages,"::unreadMessages");
            

            return unreadMessages;
        } catch (err) {
            throw new Error("Unread message Failed: " + err.message);
        }
    }

}

module.exports = MessageController;
