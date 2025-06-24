const User = require('../models/User');

class UserController {
    static async blockUser (req, res) {
        try {
            const { targetUserId } = req.body;
            const userId = req.user._id;

            const user = await User.findByIdAndUpdate(userId, {
                $addToSet: { blockedUsers: targetUserId }
            }, { new: true });

            res.json({
                status: true,
                message: "User blocked successfully.",
                data: user,
            });
        } catch (err) {
            res.status(422).json({
                status: false,
                message: err.message
            });
        }
    }

    static async unblockUser (req, res) {
        try {
            const { targetUserId } = req.body;
            const userId = req.user._id;

            const user = await User.findByIdAndUpdate(userId, {
                $pull: {
                    blockedUsers: targetUserId
                }
            }, { new: true });

            res.json({
                status: true,
                message: "User blocked successfully.",
                data: user,
            });
        } catch (err) {
            res.status(422).json({
                status: false,
                message: err.message
            });
        }
    }
}

module.exports = PeopleController;