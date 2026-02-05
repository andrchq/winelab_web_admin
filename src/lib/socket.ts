"use client";

import { io, Socket } from "socket.io-client";

// Initialize socket connection
// Use the same URL as the API but without /api suffix if needed, or just the base URL
// Since API_URL is http://host:port/api, we need http://host:port
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const SOCKET_URL = API_URL.replace('/api', '');

const isBrowser = typeof window !== 'undefined';

// Initialize socket only in browser context
export const socket: Socket = isBrowser ? io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    autoConnect: false, // Explicitly false, we connect in AuthProvider
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
}) : ({
    on: () => { },
    off: () => { },
    emit: () => { },
    connect: () => { },
    disconnect: () => { }
} as any);

if (isBrowser) {
    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected");
    });

    socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
    });
}
