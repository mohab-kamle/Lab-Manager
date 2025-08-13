import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import removeConsole from 'vite-plugin-remove-console';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import critical from 'rollup-plugin-critical';

export default defineConfig({
  plugins: [
    react(),
    removeConsole(),
    // Step 1: Optimize Images Automatically
    ViteImageOptimizer({
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      webp: {
        quality: 80,
      },
      // Convert images to WebP format
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] },
    }),
    // Step 3: Critical CSS Inlining
    critical({
      criticalUrl: '',
      criticalBase: './',
      criticalPages: [
        { uri: '', template: 'index' },
      ],
      criticalConfig: {
        // Inline critical CSS for faster FCP
        minify: true,
        extract: true,
        dimensions: [
          { height: 900, width: 1300 },
          { height: 900, width: 900 },
        ],
      }
    })
  ],
  base: "/", // Ensures correct paths for assets
  build: {
    outDir: "dist", // Vercel looks for 'dist' by default
    rollupOptions: {
      output: {
        // Step 4: Long-term Asset Caching with hashed filenames
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: {
          // Step 2: Lazy-load Heavy Libraries - Separate chunks for better loading
          vendor: ['react', 'react-dom'],
          // PDF libraries separated for lazy loading
          pdf: ['@react-pdf/renderer', 'react-pdf', 'jspdf', 'html2canvas'],
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
