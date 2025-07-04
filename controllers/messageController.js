const Message = require("../models/Message");

class MessageController {
    static async sendMessage(data) {
        try {
            const { senderId, receiverId, message, replyToMessageId } = data;
            const newMessage = await Message.create({
                senderId,
                receiverId,
                message,
                replyToMessageId,
            });
            const savedMessage = await Message.findById(newMessage._id)
                .populate('replyToMessageId');
            return savedMessage;
        } catch (err) {
            console.log(err.message,":message");
            
            throw new Error("Message saving failed: " + err.message);
        }
    }

    static async getMessages(req, res) {
        try {
            const page = parseInt(req.query.page) || 1; // default to page 1
            const limit = parseInt(req.params.limit) || 50;
            const skip = (page - 1) * limit;

            const messages = await Message.find({
                $or: [
                    { senderId: req.user._id, receiverId: req.params.friendId, deletedForSender: { $ne: true } },
                    { senderId: req.params.friendId, receiverId: req.user._id, deletedForReceiver: { $ne: true } }
                ]
            }).populate('replyToMessageId').sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

            const totalMessages = await Message.countDocuments({
                $or: [
                    { senderId: req.user._id, receiverId: req.params.friendId },
                    { senderId: req.params.friendId, receiverId: req.user._id }
                ]
            });

            res.json({
                status: true,
                data: messages.reverse(),
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
}

module.exports = MessageController;
