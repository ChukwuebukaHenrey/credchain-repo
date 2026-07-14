import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Pin the dev port so it matches the backend CORS allow-list (5173).
      port: 5173,
      strictPort: true,
      // Dev proxy: forward /api -> backend so browser calls are same-origin
      // (sidesteps CORS entirely in development). In production, VITE_API_BASE_URL
      // points cc-v2 at the deployed backend instead.
      proxy: {
        '/api': {
          target: process.env.VITE_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
