import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API runs separately in development; in production Express serves the built client and the API from one origin.
const LOCAL_API = 'http://127.0.0.1:5000';
const API = process.env.API_URL || LOCAL_API;

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
      '/api': { target: LOCAL_API, changeOrigin: false },
      '/uploads': { target: LOCAL_API, changeOrigin: false },
      '/sitemap.xml': { target: LOCAL_API, changeOrigin: false },
      '/robots.txt': { target: LOCAL_API, changeOrigin: false },
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
