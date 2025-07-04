const express = require("express");
require('dotenv').config()
const app = express();
const authRouter = require("./routes/auth");
const friendRouter = require("./routes/friend");
const messageRouter = require("./routes/message");
const peopleRouter = require("./routes/people");
const userRouter = require("./routes/user");

const connectDB = require("./config/db");
const cors = require('cors');
const http = require("http");
const webPush = require("web-push");

const { Server, Socket } = require("socket.io");
const MessageController = require("./controllers/messageController");
const User = require("./models/User");
const Message = require("./models/Message");

const server = http.createServer(app);

webPush.setVapidDetails(
	"mailto: <bharatmanchanda13@gmail.com>",
	"BITOHp0JJvF78B8B8joIJLuCxPSejD_Ta3vuScJjro2NjO-LpNjkqhxGM8Y5Vbtl9_QKgLZl1HhqTkUznRVQHt8",
	"i2QNVgbRH0eEDQc4i14Cw-CB97O1L8c-vhfTqNfLmAA"
);

const io = new Server(server, {
	cors: {
		origin: '*', // Use your frontend origin
	},
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors({
	origin: '*', // your Next.js frontend
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	credentials: true, // if you're using cookies or HTTP authentication
}));

app.get("/", function (req, res) {
	res.send("running")
})

app.use("/api", authRouter)
app.use("/api", friendRouter)
app.use("/api", messageRouter)
app.use("/api", peopleRouter)
app.use("/api", userRouter)

const onlineUsers = new Map();

io.on("connection", (socket) => {
	socket.on("disconnect", () => {
		for (let [userId, sockId] of onlineUsers.entries()) {
			if (sockId === socket.id) {
				onlineUsers.delete(userId);
				break;
			}
		}
		io.emit("user-online", Array.from(onlineUsers.keys())); // Broadcast new list
	});

	socket.on("join", (userId) => {
		onlineUsers.set(userId, socket.id);
		socket.join(userId);
		io.emit("user-online", Array.from(onlineUsers.keys()));
	});

	socket.on("chat-message", async (data) => {
		try {
			let savedMessage = await MessageController.sendMessage(data)
			io.to(data.receiverId).emit("chat-message", savedMessage);
			io.to(data.senderId).emit("chat-message", savedMessage);
			const user = await User.findById(data.receiverId);

			if (user.subscription) {
				const payload = JSON.stringify({
					title: "New Message",
					body: savedMessage.message,
				});
				webPush.sendNotification(user.subscription, payload).catch(err => {
					console.error("Push error:", err);
				})
			}
		} catch (err) {
			console.log("Error: ", err.message)
		}
	});

	socket.on('mark-as-read', async ({ senderId, receiverId }) => {
		try {
			await Message.updateMany({
				senderId,
				receiverId,
			}, {
				$set: {
					readAt: new Date(),
					status: "read"
				}
			});

			// Optional: notify sender
			io.to(senderId).emit('mark-as-read', { receiverId });
		} catch(err) {
			console.log("Error: ", err.message)
		}
	});

	// Calling Socket

	socket.on('call-user', (data) => {
		io.to(data.to).emit('incoming-call', {
			from: socket.id,
			offer: data.offer,
		});
	});

	socket.on('end-call', (data) => {
		console.log(data, socket?.id,"socket?.id","::data");
		
		io.to(data.to).emit('end-call', {
			from: socket?.id,
		});
	});

	socket.on('answer-call', (data) => {
		io.to(data.to).emit('call-answered', {
			from: socket.id,
			answer: data.answer,
		});
	});

	socket.on('ice-candidate', (data) => {
		io.to(data.to).emit('ice-candidate', {
			from: socket.id,
			candidate: data.candidate,
		});
	});

	socket.on("get-socket-id", (Id) => {
		const socketId = onlineUsers.get(Id);
		if (socketId) {
			socket.emit("socket-id-response", { socketId });
		}
	});


});

server.listen(process.env.PORT, () => {
	connectDB();
	console.log(`App running on http://localhost:${process.env.PORT}`);
});

