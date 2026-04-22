import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import jsconfigPaths from "vite-jsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Xác định đang ở mode dev hay build
  const isDev = command === "serve" || mode === "development";

  // Trong dev: luôn base = "/" để tránh lỗi react-refresh
  // Trong production: dùng biến env nếu có (cho deploy subpath)
  const base = isDev ? "/" : (env.VITE_APP_BASE_NAME || env.VITE_BASE_URL || "/");

  const PORT = 3001;

  return {
    base,  // ← sửa quan trọng nhất ở đây

    server: {
      open: true,
      port: PORT,
      host: true,
      https: false,          // ← tắt https để tránh mixed content nếu bạn mở http
    },

    preview: {
      open: true,
      host: true,
    },

    define: {
      global: "window",
    },

    resolve: {
      alias: [],
    },

    plugins: [
      react({
        // fastRefresh: false,  // ← nếu vẫn lỗi sau khi set base, uncomment tạm để tắt Fast Refresh
      }),
      jsconfigPaths(),
      tailwindcss(),
    ],
  };
});