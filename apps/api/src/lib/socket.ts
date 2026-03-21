import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketServer | null = null;

export const initSocket = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;
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

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: unknown) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
    console.log(`[SOCKET]: Emitted ${event} to user:${userId}`);
  }
};
