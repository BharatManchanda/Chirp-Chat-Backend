const Plan = require("../models/Plan");
const { body,  param } = require('express-validator');
const mongoose = require("mongoose");
const User = require("../models/User");
const IgnoredUser = require("../models/IgnoredUser");

const userPlanSetValidator = [
    body('plan_id')
        .notEmpty().withMessage('Plan Id is required')
        .custom(async (plan_id) => {
            // 1. Mongoose ID validation
            if (!mongoose.Types.ObjectId.isValid(plan_id)) {
                return Promise.reject('Invalid Plan ID format.');
            }

            // 2. Check if plan is exists with active status
            const plan = await Plan.find({ _id: plan_id, status: true });
            if (!plan) {
                return Promise.reject('Plan does not exist.');
            }
        })
];


const contactNumberView = [
    body('userId')
        .notEmpty().withMessage('User Id is required')
        .custom(async (userId, {req}) => {
            // 1. Mongoose ID validation
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return Promise.reject('Invalid User ID format.');
            }

            // 2. Check if user exists
            const viewer = await User.findById(userId).select('contactViewsRemaining planExpiredAt');
            if (!viewer) {
                return Promise.reject('Viewer does not exist.');
            }

            // 3. Check it plan expire or not
            const user = await User.findById(req.user._id).select('contactViewsRemaining planExpiredAt');
            const now = new Date();
            if (user.planExpiredAt && now > user.planExpiredAt) {
                return Promise.reject('Your plan has expired. Please renew to continue.');
            }

            // 4. Limit check contact view remaining
            if (user.contactViewsRemaining <= 0) {
                return Promise.reject('You have reached your contact view limit.');
            }
        })
];

const userDetailValidator = [
    param('userId')
        .notEmpty().withMessage('User Id is required')
        .custom(async (userId) => {
            // 1. Mongoose ID validation
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return Promise.reject('Invalid User ID format.');
            }

            // 2. Check if user exists
            const user = await User.find({ _id: userId });
            if (!user) {
                return Promise.reject('User does not exist.');
            }
        })
]

const userIgnoredValidator = [
    param('userId')
        .notEmpty().withMessage('User Id is required')
        .custom(async (userId, { req }) => {
            // Check if the userId is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return Promise.reject('Invalid User ID format.');
            }

            // Prevent user from ignoring themselves
            if (req.user && req.user._id === userId) {
                return Promise.reject('You cannot ignore yourself.');
            }

            // Check if the user exists
            const user = await User.findById(userId);
            if (!user) {
                return Promise.reject('User does not exist.');
            }

            // Check user is already ignored
            const ignoredUser = IgnoredUser.findOne({
                userId: req.user._id,
                ignoredUserId: userId,
            });

            if (ignoredUser) {
                return Promise.reject('User is already in ignored list.');
            }
        })
  ];

module.exports = { contactNumberView, userPlanSetValidator, userDetailValidator, userIgnoredValidator };