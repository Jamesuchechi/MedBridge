import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

export const getSocket = (userId?: string) => {
  if (!socket && userId) {
    socket = io(SOCKET_URL, {
      query: { userId },
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("[SOCKET]: Connected to server");
    });

    socket.on("disconnect", () => {
      console.log("[SOCKET]: Disconnected from server");
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
