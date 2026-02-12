import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// sade kurulum; proxy olmadan doğrudan VITE_API_BASE kullanıyoruz
export default defineConfig({
  plugins: [react()],
  define: {
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || "http://localhost:3000"),
  },
  build: { sourcemap: true }
});