import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const isDev = command === 'serve' || mode === 'development';

  const DEV_PORT = Number(env.VITE_DEV_PORT || 3001);
  const DEV_HOST = env.VITE_DEV_HOST || '0.0.0.0';

  // Backend HTTPS đang chạy port 8081
  const BACKEND_TARGET =
    env.VITE_BACKEND_TARGET || 'https://homepage.youngone.com.vn:8081';

  const allowedHosts = String(env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  const base = isDev
    ? '/'
    : env.VITE_APP_BASE_NAME || env.VITE_BASE_URL || '/';

  const proxyConfig = {
    target: BACKEND_TARGET,
    changeOrigin: true,
    secure: false,
  };

  const sslConfig = {
    key: fs.readFileSync(
      'D:/Project internal/portal_be/src/main/resources/keystore/homepage.key'
    ),
    cert: fs.readFileSync(
      'D:/Project internal/portal_be/src/main/resources/keystore/homepage.crt'
    ),
  };

  return {
    base,

    server: {
      open: true,
      port: DEV_PORT,
      host: DEV_HOST,

      // Dùng cert thật của mình, không dùng basicSsl()
      https: sslConfig,

      allowedHosts,

      proxy: {
        '/api': proxyConfig,
        '/files': proxyConfig,
        '/uploads': proxyConfig,
        '/ws': {
          ...proxyConfig,
          ws: true,
        },

        // Swagger nếu muốn mở qua port 3001
        '/swagger-ui': proxyConfig,
        '/v3/api-docs': proxyConfig,
        '/swagger-resources': proxyConfig,
        '/webjars': proxyConfig,
      },
    },

    preview: {
      open: true,
      host: DEV_HOST,
      port: DEV_PORT,
      https: sslConfig,
      allowedHosts,
    },

    define: {
      global: 'window',
    },

    resolve: {
      alias: [],
    },

    plugins: [
      react(),
      jsconfigPaths(),
      tailwindcss(),
    ],
  };
});