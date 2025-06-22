const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const MessageSchema = mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
    readAt: {
        type: Date,
        default: null,
    },
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