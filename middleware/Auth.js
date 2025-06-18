const jwt = require("jsonwebtoken");
const User = require("../models/User");
require('dotenv').config()

const auth = async (req, res, next)  => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({
                status: false,
                message: "Authorization token is missing.",
            });
        }
        
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findOne({_id:decoded._id})
        
        if (!user) {
            return res.status(401).json({
                status: false,
                message: "User not found.",
            });
        } else {
            req.user = user;
            await User.findByIdAndUpdate(req.user._id, {
                lastActive: new Date(),
            });
        }
        const tokenExists = user.tokens.some((t) => t.token === token);
        if (!tokenExists) {
            return res.status(401).json({
                status: false,
                message: "Token doesn't exist.",
            });
        }
        next();
    } catch (error) {
        return res.status(404).json({
            message: error.message || "Authentication failed",
        });
    }
}

module.exports = auth;