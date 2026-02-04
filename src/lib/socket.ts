"use client";

import { io, Socket } from "socket.io-client";

// Initialize socket connection
// Use the same URL as the API but without /api suffix if needed, or just the base URL
// Since API_URL is http://host:port/api, we need http://host:port
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const SOCKET_URL = API_URL.replace('/api', '');

export const socket: Socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Socket disconnected");
});

socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err);
});
