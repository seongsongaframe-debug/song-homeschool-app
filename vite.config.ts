import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 는 /<repo>/ 하위 경로로 서빙되므로 base path 필수.
// 커스텀 도메인으로 바뀌면 base: "/" 로 되돌리면 됨.
export default defineConfig({
  plugins: [react()],
  base: "/song-homeschool-app/",
  server: { host: true, port: 5173 },
});
