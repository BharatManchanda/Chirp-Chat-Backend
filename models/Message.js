const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    type:{
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file'],
        default: "text"
    },
    message: {
        type: String,
        default: "client",
    },
    replyToMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    readBy: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            readAt: {
                type: Date,
                default: Date.now,
            }
        }
    ],
    // readAt: {
    //     type: Date,
    //     default: null,
    // },
    status: {
        type: String,
        default: 'sent', // sent delivered read
    },
    deletedForSender: {
        type: Boolean,
        default: false,
    },
    deletedForReceiver: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps:true,
})

const Message = mongoose.model('Message', MessageSchema)

module.exports = Message;
