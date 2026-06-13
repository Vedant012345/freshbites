import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Local dev proxy: forwards /api/* to Django on localhost
    // In production (Vercel), VITE_API_URL is used directly instead
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // Make VITE_API_URL available during build
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
  },
  // ─── Chunk Optimization Settings ───────────────────────────────────────────
  build: {
    chunkSizeWarningLimit: 1000, // Raises the warning ceiling to 1MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // If the dependency comes from node_modules, break it up
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('qrcode')) {
              return 'vendor-qrcode';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
            // Everything else goes to a default vendor core file
            return 'vendor-core';
          }
        },
      },
    },
  },
})