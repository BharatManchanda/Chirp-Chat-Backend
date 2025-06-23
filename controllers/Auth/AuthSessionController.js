const User = require('../../models/User')
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
require('dotenv').config()

class AuthSessionController {
    static async login (req, res) {
        try {
            const {email, password} = req.body;
            const user = await User.findOne({email});
            if (!user) throw new Error("Invalid credentials.");

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) throw new Error("Invalid credentials.");
            const {_id, username} = user;
            const token = jwt.sign({ _id, username }, process.env.SECRET_KEY, { expiresIn: '60d' });

            user.tokens.push({token, issueAt: new Date()});
            await user.save();

            return res.json({
                status: true,
                message: "User login successfully.",
                data: user.toObject(),
                token,
            });
        } catch (error) {
            return res.status(422).json({
                status: false,
                message: error.message
            })
        }
    }

    static async logout (req, res) {
        try {
            const token = req.headers.authorization;
            if (!token) {
                return req.status(401).json({ message: "Token not provided." });
            }
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            const user = await User.findOne({_id: decoded._id})
            user.tokens = user.tokens.filter(t => t.token != token)
            await user.save();
            return res.status(200).json({
                status: true,
                message: "User logout successfully.",
            });
        } catch (error) {
            return res.status(422).json({
                status: false,
                message: error.message
            });
        }
    }

    static async register (req, res) {
        try {
            const {username, email, password} = req.body;
            const user = new User({
                email,
                password,
                username,
            });
            await user.save();

            const { _id } = user;
            const token = jwt.sign({ _id, username }, process.env.SECRET_KEY, { expiresIn: '60d' });

            user.tokens.push({ token, issueAt: new Date() });
            await user.save();
            
            return res.json({
                status: true,
                message: "User register successfully.",
                data: user.toObject(),
                token,
            })
        } catch (error) {
            return res.status(422).json({
                status: false,
                message: error.message
            })
        }
    }

    static async getMe (req, res) {
        try {
            const decoded = jwt.verify(req.headers.authorization, process.env.SECRET_KEY);
            const user = await User.findOne({_id: decoded._id}).populate('files');
            
            return res.json({
                status: true,
                message: "User detail fetched successfully.",
                data: user.toObject()
            });
        } catch (error) {
            return res.status(422).json({
                "status": false,
                "message": error.message,
            });
        }
    }

    static async updateMe(req, res) {
        try {
            const { username, email, status } = req.body;
            const user = await User.findByIdAndUpdate(req.user._id,{
                username,
                email,
                status,
            }, {
                new: true,
                runValidators: true,
            });

            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: 'User not found'
                });
            }
            return res.json({
                status: true,
                message: "Profile updated successfully.",
                data: user
            })
        } catch (error) {
            return res.status(422).json({
                status: false,
                message: error.message,
            });
        }
    }

    static async saveSubscribe(req, res) {
        try {
            const {endpoint} = req.body.subscription;
            await User.findByIdAndUpdate(req.user._id, {
                subscription:{
                    ...req.body.subscription
                }
            });
            res.json({
                status: true,
                message: 'User subscribe successfully.'
            });
        } catch (error) {
            res.json({
                status: false,
                message: error.message
            })
        }
    }
}

module.exports = AuthSessionController;