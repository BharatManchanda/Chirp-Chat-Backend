const mongoose = require("mongoose");

const schema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    admins: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    groupImg: {
        type: String,
        default: null,
    },
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message', // You can create a Message model separately
        }
    ],
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
})

const Group = mongoose.model('Group', schema);
module.exports = Group;