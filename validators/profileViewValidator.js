const { body } = require('express-validator');
const User = require('../models/User');
const mongoose = require("mongoose");
const ProfileView = require('../models/ProfileView');

const profileViewMarkValidator = [
    body('userId')
        .notEmpty().withMessage('User Id is required')
        .custom(async (userId, { req }) => {
            // 1. Mongoose ID validation
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return Promise.reject('Invalid User ID format.');
            }

            // 2. Check if user exists
            const user = await User.find({ _id: userId });
            if (!user) {
                return Promise.reject('User does not exist.');
            }

            // 3. Check if profile view already exists 
            profileView = await ProfileView.findOne({ user_id: userId, viewer_id: req.user._id });
            if (profileView) {
                return Promise.reject('Profile view already exists.');
            }
        })
];

module.exports = { profileViewMarkValidator };