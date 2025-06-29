const User = require('../models/User');

class UserController {
    static async blockUser (req, res) {
        try {
            const { targetUserId } = req.body;
            const userId = req.user._id;

            const user = await User.findByIdAndUpdate(userId, {
                $addToSet: { blockedUsers: targetUserId }
            }, { new: true });

            const blockedUser = await User.findById(targetUserId);

            res.json({
                status: true,
                message: "User blocked successfully.",
                data: blockedUser,
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

            const unblockedUser = await User.findById(targetUserId);

            res.json({
                status: true,
                message: "User blocked successfully.",
                data: unblockedUser,
            });
        } catch (err) {
            res.status(422).json({
                status: false,
                message: err.message
            });
        }
    }
}

module.exports = UserController;