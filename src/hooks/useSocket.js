import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socketInstance = null;

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketInstance) {
      const token = localStorage.getItem("token");

      socketInstance = io(import.meta.env.VITE_API_BASE_URL, {
        transports: ["websocket"],
        auth: {
          token, // backend decodes this and sets socket.user
        },
      });

      socketInstance.on("connect", () => {
        console.log("🟢 Socket connected", socketInstance.id);

        // Optional: backend supports this
        socketInstance.emit("vendor:ping");
      });

      socketInstance.on("vendor:pong", (data) => {
        console.log("🏪 Vendor pong:", data.message);
      });

      socketInstance.on("disconnect", () => {
        console.log("🔴 Socket disconnected");
      });

      socketInstance.on("connect_error", (err) => {
        console.error("❌ Socket error:", err.message);
      });
    }

    socketRef.current = socketInstance;
  }, []);

  return socketRef.current;
}
