const mongoose = require('mongoose');
const User = require('../models/User');

class FriendService {
	static async sendRequest(senderId, receiverId) {
		if (senderId === receiverId) throw new Error("Can't friend yourself.");

		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const [sender, receiver] = await Promise.all([
				User.findById(senderId).session(session),
				User.findById(receiverId).session(session),
			]);
			if (!sender || !receiver) throw new Error('User not found.');
			if (sender.friends.includes(receiverId)
				|| sender.sentRequests.includes(receiverId)
				|| receiver.friendRequests.includes(senderId)
			) {
				throw new Error('Already friends or request pending.');
			}

			sender.sentRequests.push(receiverId);
			receiver.friendRequests.push(senderId);
			await sender.save({ session });
			await receiver.save({ session });
			await session.commitTransaction();
			return;
		} catch (err) {
			await session.abortTransaction();
			throw err;
		} finally {
			session.endSession();
		}
	}

	static async acceptRequest(receiverId, senderId) {
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const [receiver, sender] = await Promise.all([
				User.findById(receiverId).session(session),
				User.findById(senderId).session(session),
			]);
			if (!receiver || !sender) throw new Error('User not found.');
			if (!receiver.friendRequests.includes(senderId)) {
				throw new Error('No such friend request.');
			}

			// add to friends
			receiver.friends.push(senderId);
			sender.friends.push(receiverId);

			// remove from pending
			receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);
			sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== receiverId);

			await receiver.save({ session });
			await sender.save({ session });
			await session.commitTransaction();
			return;
		} catch (err) {
			await session.abortTransaction();
			throw err;
		} finally {
			session.endSession();
		}
	}

	static async rejectRequest(receiverId, senderId) {
		// similar to acceptRequest but only removes pending request
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const [receiver, sender] = await Promise.all([
				User.findById(receiverId).session(session),
				User.findById(senderId).session(session),
			]);
			if (!receiver || !sender) throw new Error('User not found.');

			receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== senderId);
			sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== receiverId);

			await receiver.save({ session });
			await sender.save({ session });
			await session.commitTransaction();
			return;
		} catch (err) {
			await session.abortTransaction();
			throw err;
		} finally {
			session.endSession();
		}
	}
}

module.exports = FriendService;
