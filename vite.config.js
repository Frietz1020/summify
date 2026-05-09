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
        theme_color: "#8D7C66",
        background_color: "#F7F8FC",
        display: "standalone",
        icons: [
          {
            src: "pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});