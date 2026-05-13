import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Summify",
        short_name: "Summify",
        description: "AI-powered document summarization and key-term graph visualization",
        theme_color: "#6c9a9e",
        background_color: "#0f1520",
        display: "standalone",
        icons: [
          { src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],

  server: {
    headers: {
      // Allow Firebase signInWithPopup to communicate back to the opener.
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },

  build: {
    // Slightly higher limit before warning (pdfjs-dist is large by design)
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Code-split heavy vendor libs into separate chunks for better caching
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/firestore"],
          "vendor-pdf":      ["pdfjs-dist"],
          "vendor-docx":     ["mammoth"],
        },
      },
    },
  },
});