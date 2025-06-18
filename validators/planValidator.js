const { body, param } = require('express-validator');
const Plan = require('../models/Plan');

const planCreateOrEditValidator = [
    body('contact_view_limit')
        .notEmpty().withMessage('Contact view limit is required.')
        .isString().withMessage('Contact view limit must be a string.'),

    body('type')
        .notEmpty().withMessage('Type is required.')
        .isString().withMessage('Type must be a string.'),

    body('symbol')
        .notEmpty().withMessage('Symbol is required.')
        .isString().withMessage('Symbol must be a string.'),

    body('price')
        .notEmpty().withMessage('Price is required.')
        .isNumeric().withMessage('Price must be a number.'),
    
    body('mrp')
        .notEmpty().withMessage('MRP is required.')
        .isNumeric().withMessage('MRP must be a number.')
        .custom((mrp, { req }) => {
            const price = req.body.price;
            if (price !== undefined && Number(mrp) <= Number(price)) {
                return Promise.reject('MRP must be greater than price.');
            }
        }),

    body('messages')
        .notEmpty().withMessage('Messages are required.')
        .isArray().withMessage('Messages must be an array.'),

    body('valid_till')
        .notEmpty().withMessage('Valid till is required.')
        .isNumeric().withMessage('Valid till must be a number.'),

    body('status')
        .optional()
        .isBoolean().withMessage('Status must be a boolean.'),

    body('_id')
        .optional()
        .isMongoId().withMessage('ID must be a valid Mongo ID.')
        .custom(async (_id, { req }) => {
            const plan = await Plan.findById(_id);
            if (!plan) {
                return Promise.reject('Plan not found.');
            }
        }),
];

const planDeleteValidator = [
    param('_id')
        .isMongoId().withMessage('Invalid plan ID')
        .custom(async (_id, { req }) => {
            const plan = await Plan.findById(_id);
            if (!plan) {
                return Promise.reject('Plan not found.');
            }
        }),
]

module.exports = { planCreateOrEditValidator, planDeleteValidator };
