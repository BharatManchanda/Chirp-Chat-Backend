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

            // Persist read state when chat is opened/fetched (important on page refresh).
            if (!isGroup) {
                await Message.updateMany(
                    { senderId: targetId, receiverId: req.user._id },
                    { $set: { status: "read" } }
                );

                await Message.updateMany(
                    {
                        senderId: targetId,
                        receiverId: req.user._id,
                        "readBy.userId": { $ne: req.user._id }
                    },
                    { $push: { readBy: { userId: req.user._id, readAt: new Date() } } }
                );
            } else {
                await Message.updateMany(
                    {
                        group: targetId,
                        senderId: { $ne: req.user._id }
                    },
                    { $set: { "readBy.$[elem].readAt": new Date() } },
                    {
                        arrayFilters: [{ "elem.userId": req.user._id }]
                    }
                );

                await Message.updateMany(
                    {
                        group: targetId,
                        senderId: { $ne: req.user._id },
                        "readBy.userId": { $ne: req.user._id }
                    },
                    { $push: { readBy: { userId: req.user._id, readAt: new Date() } } }
                );
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
            const userId = req.user._id;

            // Find message first
            const message = await Message.findById(messageId);
            
            // Check if user already marked as read
            const alreadyRead = message.readBy.some( r => r.userId.toString() === userId.toString());

            if (alreadyRead) {
                return res.status(400).json({
                    status: false,
                    message: "Message already marked as read"
                });
            }

            // Prepare update
            const update = {
                $addToSet: {
                    readBy: {
                        userId,
                        readAt: new Date()
                    }
                }
            };

            // ONLY for one-to-one chat, set status
            if (!message.group) {
                update.$set = { status: "read" };
            }

            const updated = await Message.findByIdAndUpdate(
                messageId,
                update,
                { new: true }
            );

            res.json({
                status: true,
                message: "Message marked as read",
                data: updated
            });

        } catch (err) {
            res.status(422).json({
                status: false,
                message: err.message
            });
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

    // static async getUnreadMessage(data, flag = "receiverId") {
    //     try {
    //         const { senderId, receiverId, isGroup } = data;

    //         // Build match condition dynamically
    //         const matchCondition = {
    //             readAt: null,
    //         };

    //         if (!isGroup) {
    //             if (flag === "receiverId") {
    //             matchCondition.receiverId = new mongoose.Types.ObjectId(receiverId);
    //             } else if (flag === "senderId") {
    //                 matchCondition.senderId = new mongoose.Types.ObjectId(senderId);
    //             }
    //         } else {
    //             matchCondition.group = new mongoose.Types.ObjectId(receiverId);
    //         }

    //         const unreadMessages = await Message.aggregate([
    //             {
    //                 $match: matchCondition
    //             },
    //             {
    //                 $group: {
    //                     _id: isGroup ? "$group" : "$senderId",
    //                     unreadCount: { $sum: 1 }
    //                 }
    //             }
    //         ]);
    //         console.log(unreadMessages,"::unreadMessages");
            

    //         return unreadMessages;
    //     } catch (err) {
    //         throw new Error("Unread message Failed: " + err.message);
    //     }
    // }

    // static async getUnreadMessage(data, flag = "receiverId") {
    //     try {
    //         const { senderId, receiverId, isGroup } = data;

    //         if (!isGroup) {
    //             // Private chat: find messages sent to receiverId that they haven't read yet
    //             const unreadMessages = await Message.aggregate([
    //                 {
    //                     $match: {
    //                         receiverId: new mongoose.Types.ObjectId(receiverId),
    //                         senderId: new mongoose.Types.ObjectId(senderId),
    //                         "readBy.userId": { $ne: new mongoose.Types.ObjectId(receiverId) }, // receiver hasn't read
    //                     },
    //                 },
    //                 {
    //                     $group: {
    //                         _id: "$senderId",
    //                         unreadCount: { $sum: 1 },
    //                     },
    //                 },
    //             ]);
    //             return unreadMessages;
    //         } else {
    //             // Group chat: find messages in the group that this user hasn't read
    //             const unreadMessages = await Message.aggregate([
    //                 {
    //                     $match: {
    //                         group: new mongoose.Types.ObjectId(receiverId),
    //                         "readBy.userId": { $ne: new mongoose.Types.ObjectId(senderId) }, // user hasn't read
    //                     },
    //                 },
    //                 {
    //                     $group: {
    //                         _id: "$group",
    //                         unreadCount: { $sum: 1 },
    //                     },
    //                 },
    //             ]);
    //             return unreadMessages;
    //         }
    //     } catch (err) {
    //         throw new Error("Unread message Failed: " + err.message);
    //     }
    // }

    static async getUnreadMessage(data) {
    try {
        const { senderId, receiverId, isGroup, groupId } = data;

        if (!isGroup) {
            // PRIVATE CHAT (already correct mostly)
            return await Message.aggregate([
                {
                    $match: {
                        receiverId: new mongoose.Types.ObjectId(receiverId),
                        senderId: new mongoose.Types.ObjectId(senderId),
                        readBy: {
                            $not: {
                                $elemMatch: {
                                    userId: new mongoose.Types.ObjectId(receiverId)
                                }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$senderId",
                        unreadCount: { $sum: 1 }
                    }
                }
            ]);
        }

        // ✅ GROUP CHAT FIXED LOGIC
        return await Message.aggregate([
            {
                $match: {
                    group: new mongoose.Types.ObjectId(groupId),
                    senderId: { $ne: new mongoose.Types.ObjectId(receiverId) },

                    // USER HAS NOT READ
                    readBy: {
                        $not: {
                            $elemMatch: {
                                userId: new mongoose.Types.ObjectId(receiverId)
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$group",
                    unreadCount: { $sum: 1 }
                }
            }
        ]);

    } catch (err) {
        throw new Error("Unread message Failed: " + err.message);
    }
}

}

module.exports = MessageController;
