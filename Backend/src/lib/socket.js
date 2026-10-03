import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, { cors: { origin: [allowedOrigin] } });

// userId -> Set of socket ids (one user can have several tabs/devices open)
const userSocketMap = new Map();

function getReceiverSocketIds(userId) {
  return [...(userSocketMap.get(String(userId)) ?? [])];
}

function onlineUserIds() {
  return [...userSocketMap.keys()];
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    const key = String(userId);
    if (!userSocketMap.has(key)) userSocketMap.set(key, new Set());
    userSocketMap.get(key).add(socket.id);
  }

  // io.emit() sends events to everyone
  io.emit("getOnlineUsers", onlineUserIds());

  socket.on("disconnect", () => {
    if (userId) {
      const key = String(userId);
      const sockets = userSocketMap.get(key);
      sockets?.delete(socket.id);
      // only mark offline when their LAST tab/device is gone
      if (sockets && sockets.size === 0) userSocketMap.delete(key);
    }
    io.emit("getOnlineUsers", onlineUserIds());
  });
});

export { app, server, io, getReceiverSocketIds };
