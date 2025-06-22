const User = require("../models/User");

class PeopleController {
    static async getList(req, res) {
        try {
            const userId = req.user._id; // Assumes req.user is set by authentication middleware
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;

            const friendIds = req.user.friends;
            const excludeIds = [...friendIds, userId];

            let users = await User.find({ _id: { $nin: excludeIds } })
                .skip(skip)
                .limit(limit)
                .select('-password -__v'); // Exclude sensitive fields

            users = users.map((user) => {
                let status = "none"
                if (user.friendRequests.includes(req.user._id)) {
                    status = "sent";
                } else if (user.sentRequests.includes(req.user._id)) {
                    status = "received";
                }
                return {
                    ...user.toObject(),
                    friendRequestStatus: status
                }
            })

            const total = await User.countDocuments({ _id: { $nin: excludeIds } });

            res.json({
                status: true,
                data: users,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (err) {
            res.status(400).json({
                status: false,
                message: err.message
            });
        }
    }
}

module.exports = PeopleController;