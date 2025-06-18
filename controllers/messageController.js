const Message = require("../models/Message");

class MessageController {
    /**
     * Send a new message
     */
    static async sendMessage(data) {
        try {
            const { senderId, receiverId, message } = data;
            const newMessage = await Message.create({
                senderId,
                receiverId,
                message,
            });
            const savedMessage = await newMessage.save();
            return savedMessage;
        } catch (err) {
            console.log(err.message,":message");
            
            throw new Error("Message saving failed: " + err.message);
        }
    }

    /**
     * Get all messages between two users
     */
    static async getMessages(req, res) {
        try {
            const page = parseInt(req.query.page) || 1; // default to page 1
            const limit = parseInt(req.params.limit) || 50;
            const skip = (page - 1) * limit;

            const messages = await Message.find({
                $or: [
                    { senderId: req.user._id, receiverId: req.params.friendId },
                    { senderId: req.params.friendId, receiverId: req.user._id }
                ]
            }).sort({ createdAt: -1 })
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

    /**
     * Mark message as read
     */
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

    /**
     * Soft delete message for a specific user
     */
    static async deleteMessage(req, res) {
        try {
            const { messageId, userId } = req.body;

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ status: false, message: "Message not found" });
            }

            if (String(message.senderId) === userId) {
                message.deletedForSender = true;
            }
            if (String(message.receiverId) === userId) {
                message.deletedForReceiver = true;
            }

            await message.save();
            res.json({ status: true, message: "Message deleted for user", data: message });
        } catch (err) {
            res.status(500).json({ status: false, message: err.message });
        }
    }
}

module.exports = MessageController;
