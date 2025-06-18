const { body } = require('express-validator');
const User = require('../models/User');

exports.loginValidator = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email must be valid'),
    body('password')
        .notEmpty().withMessage('Password is required'),
];


exports.registerValidator = [
     body("username")
        .notEmpty().withMessage("Username is required"),
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email must be valid')
        .custom(async (email) => {
            const user = await User.findOne({ email });
            if (user) {
                return Promise.reject('Email already in use');
            }
            return true;
        }),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];