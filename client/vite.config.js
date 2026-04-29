import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import removeConsole from 'vite-plugin-remove-console';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import critical from 'rollup-plugin-critical';

export default defineConfig({
  envDir: '../', // Forces Vite to pull from the root directory
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
      criticalBase: 'dist/',
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
  assetsInclude: ['**/*.lottie'],
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
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['bootstrap', 'react-bootstrap', 'lucide-react', 'react-toastify', 'react-hot-toast'],
          utils: ['axios', 'luxon', 'formik', 'yup', 'date-fns'],
          pdf: ['@react-pdf/renderer', 'jspdf', 'html2canvas', 'pdfmake', 'jspdf-autotable', 'jspdf-font', 'react-pdf'],
          excel: ['exceljs', 'file-saver'],
          charts: ['recharts'],
          animations: ['lottie-react', '@lottiefiles/dotlottie-react'],
          editor: ['react-quill', 'dompurify']
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
    host: "0.0.0.0",
    port: 5173,
    hmr: {
      // In Docker, the browser connects from the host via localhost
      clientPort: 5173,
    },
    watch: {
      // Use polling for Docker bind mounts on Windows
      usePolling: true,
      interval: 1000,
    },
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
