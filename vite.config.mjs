import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const isDev = command === 'serve' || mode === 'development';

  const DEV_PORT = Number(env.VITE_DEV_PORT || 3001);
  const DEV_HOST = env.VITE_DEV_HOST || '0.0.0.0';

  const BACKEND_TARGET =
    env.VITE_BACKEND_TARGET || 'https://10.232.100.68:8081';

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

  let sslConfig = undefined;

  // Chỉ đọc cert khi chạy dev bằng npm start / npm run dev
  // Khi docker build thì không đọc cert, vì Nginx sẽ dùng cert lúc docker run
  if (isDev) {
    const CERT_DIR =
      env.VITE_SSL_CERT_DIR ||
      path.join(process.env.USERPROFILE || '', 'Documents', 'portal', 'cert');

    sslConfig = {
      key: fs.readFileSync(path.join(CERT_DIR, 'homepage.key')),
      cert: fs.readFileSync(path.join(CERT_DIR, 'homepage.crt')),
    };
  }

  return {
    base,

    server: {
      open: true,
      port: DEV_PORT,
      host: DEV_HOST,
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