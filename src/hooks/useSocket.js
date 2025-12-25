// src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socketInstance = null;

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketInstance) {
      const token = localStorage.getItem("token");

      socketInstance = io(import.meta.env.VITE_SOCKET_URL, {
        transports: ["websocket"],
        auth: { token },
      });

      socketInstance.on("connect", () => {
        console.log("🟢 Vendor socket connected:", socketInstance.id);
      });

      socketInstance.on("disconnect", () => {
        console.log("🔴 Vendor socket disconnected");
      });

      socketInstance.on("connect_error", (err) => {
        console.error("❌ Socket error:", err.message);
      });
    }

    socketRef.current = socketInstance;
  }, []);

  return socketRef.current;
}
