"use client";

import { io, Socket } from "socket.io-client";

function resolveSocketUrl() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
    return apiUrl.replace(/\/api\/?$/, "");
}

const SOCKET_URL = resolveSocketUrl();

const isBrowser = typeof window !== 'undefined';

// Initialize socket only in browser context to avoid build errors
export const socket: Socket = isBrowser
    ? io(SOCKET_URL, {
        transports: ["polling", "websocket"],
        autoConnect: false, // Explicitly false, we connect in AuthProvider
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000,
    })
    : ({
        on: () => { },
        off: () => { },
        emit: () => { },
        connect: () => { },
        disconnect: () => { },
        connected: false
    } as any);

if (isBrowser) {
    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("disconnect", () => console.log("Socket disconnected"));
    socket.on("connect_error", (err) => {
        console.warn("Socket connect warning:", err.message);
    });
}
