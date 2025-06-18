const jwt = require("jsonwebtoken");
const User = require("../models/User");
require('dotenv').config()

// const role = async (...roles)  => {
//     return async (req, res, next) => {
//         try {
//             const token = req.headers.authorization;
//             if (!token) {
//                 return res.status(401).json({
//                     status: false,
//                     message: "Authorization token is missing.",
//                 });
//             }

//             const decoded = jwt.verify(token, process.env.SECRET_KEY);
//             const user = await User.findOne({_id:decoded._id})
//             if (roles.includes(user.role)) {
//                 next()
//             } else {
//                 return res.status(403).json({
//                     error: "Forbidden",
//                 })
//             }
//         } catch (error) {
//             return res.status(404).json({
//                 message: error.message || "Authentication failed",
//             });
//         }
//     }
// }

// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// require('dotenv').config();

const role = (roles) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization;
            if (!token) {
                return res.status(401).json({
                    status: false,
                    message: "Authorization token is missing.",
                });
            }

            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            const user = await User.findOne({ _id: decoded._id });

            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "User not found",
                });
            }

            if (roles.includes(user.role)) {
                req.user = user; // optionally attach user to req
                next();
            } else {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Insufficient role",
                });
            }
        } catch (error) {
            return res.status(401).json({
                status: false,
                message: error.message || "Authentication failed",
            });
        }
    };
};

module.exports = role;