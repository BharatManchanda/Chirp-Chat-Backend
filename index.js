const express = require("express");
require("dotenv").config();

const app = express();
const http = require("http");
const cors = require("cors");
const webPush = require("web-push");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRouter = require("./routes/auth");
const friendRouter = require("./routes/friend");
const messageRouter = require("./routes/message");
const peopleRouter = require("./routes/people");
const userRouter = require("./routes/user");
const groupRouter = require("./routes/group");

const MessageController = require("./controllers/messageController");
const User = require("./models/User");
const Message = require("./models/Message");
const Group = require("./models/Group");

// ================== SERVER ==================
const server = http.createServer(app);

// ================== SOCKET.IO ==================
const io = new Server(server, {
	cors: { origin: "*" },
});

// ================== MIDDLEWARE ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE"],
	credentials: true,
}));

// ================== ROUTES ==================
app.get("/", (req, res) => {
	res.send("Server running");
});

app.use("/api", authRouter);
app.use("/api", friendRouter);
app.use("/api", messageRouter);
app.use("/api", peopleRouter);
app.use("/api", userRouter);
app.use("/api", groupRouter);

webPush.setVapidDetails(
	"mailto:bharatmanchanda13@gmail.com",
	process.env.VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);

const onlineUsers = new Map();

io.on("connection", (socket) => {
	socket.on("join", (userId) => {
		onlineUsers.set(userId, socket.id);
		socket.join(userId);
		io.emit("user-online", [...onlineUsers.keys()]);
	});

	socket.on("disconnect", () => {
		for (const [userId, sockId] of onlineUsers.entries()) {
			if (sockId === socket.id) {
				onlineUsers.delete(userId);
				break;
			}
		}
		io.emit("user-online", [...onlineUsers.keys()]);
	});

	socket.on("chat-message", async (data) => {
		try {
			const savedMessage = await MessageController.sendMessage(data);
			if (!data.isGroup) {
				io.to(data.receiverId).emit("chat-message", {...savedMessage, isGroup: false});
				io.to(data.senderId).emit("chat-message", {...savedMessage, isGroup: false});
	
				const unreadMessage = await MessageController.getUnreadMessage(data);
				io.to(data.receiverId).emit("unread-message-count", unreadMessage.map(unMsg => ({...unMsg, isGroup: false})));
	
				const user = await User.findById(data.receiverId);
				// if (user?.subscription) {
				// 	await webPush.sendNotification(
				// 		user.subscription,
				// 		JSON.stringify({
				// 			title: "New Message",
				// 			body: savedMessage.message,
				// 		})
				// 	);
				// }
			} else {
				const group = await Group.findById(data.receiverId);
				if (!group) return;
				const users = await User.find({_id: { $in: group.members}})
				// users.map(async (user) => {
				// 	io.to(String(user._id)).emit("chat-message", {...savedMessage, isGroup: true});
				// 	const unreadMessage = await MessageController.getUnreadMessage(data);
				// 	io.to(String(user._id)).emit("unread-message-count", {...unreadMessage, isGroup:true});
				// if (user?.subscription) {
				// 	await webPush.sendNotification(
				// 		user.subscription,
				// 		JSON.stringify({
				// 			title: "New Message",
				// 			body: savedMessage.message,
				// 		})
				// 	);
				// }
				// });

				for (const user of users) {
					io.to(String(user._id)).emit("chat-message", { ...savedMessage, isGroup: true });

					let unreadMessage = await MessageController.getUnreadMessage({
						...data,
						groupId: data.receiverId,
						receiverId: user._id,
					});
					unreadMessage = unreadMessage.map((unMsg) => ({...unMsg, isGroup: true}))
					io.to(String(user._id)).emit("unread-message-count", unreadMessage);
					// if (user?.subscription) {
					// 	await webPush.sendNotification(
					// 		user.subscription,
					// 		JSON.stringify({
					// 			title: "New Message",
					// 			body: savedMessage.message,
					// 		})
					// 	);
					// }
				}
			}
		} catch (err) {
			console.error(err.message);
		}
	});

	socket.on("mark-as-read", async (data) => {
		try {
			const { senderId, receiverId, isGroup, groupId, userId } = data;

			if (isGroup) {
				const currentUserId = userId || receiverId;
				const currentGroupId = groupId || receiverId;

				if (!currentUserId || !currentGroupId) return;

				await Message.updateMany(
					{
						group: currentGroupId,
						senderId: { $ne: currentUserId }
					},
					{ $set: { "readBy.$[elem].readAt": new Date() } },
					{
						arrayFilters: [{ "elem.userId": currentUserId }],
						multi: true,
						upsert: false
					}
				);

				await Message.updateMany(
					{
						group: currentGroupId,
						senderId: { $ne: currentUserId },
						"readBy.userId": { $ne: currentUserId }
					},
					{ $push: { readBy: { userId: currentUserId, readAt: new Date() } } }
				);

				return;
			}

			await Message.updateMany(
				{ senderId, receiverId },
				{ $set: { status: "read" } }
			);

			await Message.updateMany(
				{
					senderId,
					receiverId,
					"readBy.userId": { $ne: receiverId }
				},
				{ $push: { readBy: { userId: receiverId, readAt: new Date() } } }
			);

			io.to(senderId).emit("mark-as-read", { receiverId, isGroup: false });

		} catch (err) {
			console.error("Error in mark-as-read socket:", err.message);
		}
	});

	// ===== CALL EVENTS =====
	socket.on("call-user", (data) => {
		io.to(data.to).emit("incoming-call", {
			from: socket.id,
			offer: data.offer,
		});
	});

	socket.on("answer-call", (data) => {
		io.to(data.to).emit("call-answered", {
			from: socket.id,
			answer: data.answer,
		});
	});

	socket.on("ice-candidate", (data) => {
		io.to(data.to).emit("ice-candidate", {
			from: socket.id,
			candidate: data.candidate,
		});
	});

	socket.on("end-call", (data) => {
		io.to(data.to).emit("end-call", { from: socket.id });
	});

	socket.on("get-socket-id", (userId) => {
		const socketId = onlineUsers.get(userId);
		if (socketId) {
			socket.emit("socket-id-response", { socketId });
		}
	});
});

// ================== START ==================
server.listen(process.env.PORT, async () => {
	await connectDB();
	console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});
