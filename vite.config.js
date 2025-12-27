import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // 🔴 REQUIRED for /vendor deployment
  base: "/vendor/",

  plugins: [react()],
});
