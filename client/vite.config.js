import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: "/", // Ensures correct paths for assets
  build: {
    outDir: "dist", // Vercel looks for 'dist' by default
  },
  server: {
    historyApiFallback: true, // Fixes 404 errors on page refresh
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true
      }
    }
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});
