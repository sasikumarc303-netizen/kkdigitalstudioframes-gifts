import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// API_URL configures the dev/preview proxy; VITE_API_URL configures production browser requests in src/services/api.js.
const API = process.env.API_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API, changeOrigin: false },
      '/uploads': { target: API, changeOrigin: false },
      '/sitemap.xml': { target: API, changeOrigin: false },
      '/robots.txt': { target: API, changeOrigin: false },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': { target: API, changeOrigin: false },
      '/uploads': { target: API, changeOrigin: false },
      '/sitemap.xml': { target: API, changeOrigin: false },
      '/robots.txt': { target: API, changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
