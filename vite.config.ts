import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Keep large, stable SDKs cached independently of everyday UI changes.
        manualChunks(id) {
          const path = id.replace(/\\/g, '/');
          if (/\/node_modules\/(?:@firebase|firebase)\/firestore\//.test(path)) return 'firebase-firestore';
          if (/\/node_modules\/(?:@firebase|firebase)\/auth\//.test(path)) return 'firebase-auth';
          if (path.includes('/node_modules/@firebase/') || path.includes('/node_modules/firebase/')) return 'firebase-core';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
});
