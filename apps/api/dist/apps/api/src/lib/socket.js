"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"],
        },
    });
    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId) {
            socket.join(`user:${userId}`);
            console.log(`[SOCKET]: User ${userId} connected`);
        }
        socket.on("disconnect", () => {
            console.log(`[SOCKET]: Socket ${socket.id} disconnected`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};
exports.getIO = getIO;
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
        console.log(`[SOCKET]: Emitted ${event} to user:${userId}`);
    }
};
exports.emitToUser = emitToUser;
