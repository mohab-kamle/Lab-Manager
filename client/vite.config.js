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
  assetsInclude: ['**/*.lottie'],
  base: "/", // Ensures correct paths for assets
  build: {
    outDir: "dist", // Vercel looks for 'dist' by default
    rollupOptions: {
      output: {
        // Step 4: Long-term Asset Caching with hashed filenames
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
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
    // Bind to all interfaces so Docker port mapping works
    host: true,
    // Keep port explicit to match docker-compose
    port: 5173,
    // Enable polling so file changes on mounted volumes are detected in Docker on Windows/WSL2
    watch: {
      usePolling: true,
      interval: 100,
    },
    // Note: historyApiFallback is a webpack-dev-server option; Vite handles SPA routing internally.
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
