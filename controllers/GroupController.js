const Group = require("../models/Group");
const User = require("../models/User");

class GroupController {
    static async save(req, res) {
        try {
            const { name, memberIds, description } = req.body;
            const group = await Group.create({
                name,
                owner: req.user._id,
                members: [req.user._id, ...memberIds],
                admins: [req.user._id],
                description,
            });

            await User.updateMany({
                _id: {$in: [req.user._id, ...memberIds]}
            }, { $push: { groups: group._id } });

            return res.json({
                status: true,
                message: "Group created successfully.",
                data: group.toObject(),
            })
        } catch (error) {
            return res.json({
                status: false,
                message: error.message
            });
        }
    }

    static async update(req, res) {

    }

    static async get(req, res) {
        try {
            const user = await User.findOne(req.user._id);
            
            const groups = await Group.find({
                _id: {$in: user.groups}
            })
            .populate("owner", "username email profileImg")
            .populate("admins", "username email profileImg")
            .populate("members", "username email profileImg")
            .sort({ createdAt: -1 });

            return res.json({
                status: true,
                message: "Fetched group successfully.",
                data: groups
            });
        } catch (error) {
            return res.json({
                status: false,
                message: error.message
            });
        }
    }
}

module.exports = GroupController