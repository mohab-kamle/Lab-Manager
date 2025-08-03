import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig({
  plugins: [react(),removeConsole()],
  base: "/", // Ensures correct paths for assets
  build: {
    outDir: "dist", // Vercel looks for 'dist' by default
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks to improve caching
          vendor: ['react', 'react-dom'],
          pdf: ['@react-pdf/renderer', 'react-pdf', 'jspdf'],
          ui: ['bootstrap', 'react-bootstrap', 'lucide-react'],
          utils: ['axios', 'luxon', 'formik', 'yup']
        }
      }
    },
    // Enable compression and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000
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
