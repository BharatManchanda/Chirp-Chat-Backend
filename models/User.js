const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const TokenSchema = mongoose.Schema({
    token: String,
    issueAt: Date,
})

const UserSchema = mongoose.Schema({
    username: String,
    email: String,
    password:String,
    role: {
        type: String,
        default: "client",
    },
    profileImg: {
        type: String,
        default: null,
    },
    tokens: {
        type: [TokenSchema],
    },
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    friendRequests: [
        { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    sentRequests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    isOnline: {
        type: Boolean,
        default: 0,
    },
    subscription: {
        type: Schema.Types.Mixed,
        default: null,
    },
    status: {
        type: String,
        default: "",
    }
}, {
    timestamps:true,
})

UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    }
});

UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', UserSchema)

module.exports = User;