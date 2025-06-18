const { body } = require('express-validator');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const mongoose = require("mongoose");

exports.friendRequestSendValidator = [
    body('receiverId')
        .notEmpty().withMessage('Receiver ID is required')
        .custom(async (receiverId, { req }) => {

            if (!mongoose.Types.ObjectId.isValid(receiverId)) {
                return Promise.reject('Invalid Receiver ID format.');
            }

            // 1. Check if receiver user exists
            const user = await User.find({_id:receiverId});
            
            if (!user) {
                return Promise.reject('Receiver user does not exist.');
            }

            // 2. Prevent self-req
            if (req.user._id.toString() === receiverId.toString()) {
                return Promise.reject('You cannot send a friend req to yourself.');
            }

            // 3. Check for existing friend req in either direction
            const existingRequest = await FriendRequest.findOne({
                $or: [
                    { senderId: req.user._id, receiverId },
                    { senderId: receiverId, receiverId: req.user._id }
                ]
            });

            if (existingRequest) {
                return Promise.reject('Friend request already exists.');
            }
            return true;
        })
];

exports.friendRequestAcceptValidator = [
    body('senderId')
        .notEmpty().withMessage('Sender ID is required.')
        .custom(async (senderId, { req }) => {
            // 1. Mongoose ID validation
            if (!mongoose.Types.ObjectId.isValid(senderId)) {
                return Promise.reject('Invalid Sender ID format.');
            }

            // 2. Update the friend req
            const updatedRequest = await FriendRequest.findOneAndUpdate({
                senderId: senderId,
                status: "pending",
            });
            if (!updatedRequest) {
                return Promise.reject('Friend reqest not found.');
            }
        })
];

exports.friendRequestDeclineValidator = [
    body('senderId')
        .notEmpty().withMessage('Sender ID is required.')
        .custom(async (senderId, { req }) => {
            // 1. Mongoose ID validation
            if (!mongoose.Types.ObjectId.isValid(senderId)) {
                return Promise.reject('Invalid Sender ID format.');
            }

            // 2. Update the friend req
            const updatedRequest = await FriendRequest.findOneAndUpdate({
                senderId: senderId,
                status: "pending",
            });
            
            if (!updatedRequest) {
                return Promise.reject('Friend req not found.');
            }
        })
];