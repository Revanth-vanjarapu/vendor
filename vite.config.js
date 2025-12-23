
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Optional: dev server config for local development
  server: {
    host: true,              // 0.0.0.0 in dev (so you can test on LAN if needed)
    port: 5173,              // your local dev port
  },

  // Production preview server (used by `vite preview`)
  preview: {
    host: true,                                      // bind to 0.0.0.0
    port: parseInt(process.env.PORT) || 4173,        // use Render's PORT
    allowedHosts: [
      'shippzi-vendor.onrender.com',                 // your Render hostname
    ],
  },
});
