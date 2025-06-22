const User = require("../models/User");

class PeopleController {
    static async getList(req, res) {
        try {
            const userId = req.user._id; // Assumes req.user is set by authentication middleware
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;

            // Get IDs of friends
            const friendIds = req.user.friends;

            // Exclude self and friends
            const excludeIds = [...friendIds, userId];

            // Query users who are not friends and not self
            const users = await User.find({ _id: { $nin: excludeIds } })
                .skip(skip)
                .limit(limit)
                .select('-password -__v'); // Exclude sensitive fields

            // Get total count for pagination
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