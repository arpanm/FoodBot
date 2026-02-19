/**
 * Production Vite Configuration for Restaurant App
 *
 * Optimizations:
 * - Code splitting and lazy loading
 * - Tree shaking
 * - Asset optimization
 * - PWA support with service worker
 * - Brotli/Gzip compression
 * - Bundle analysis
 *
 * @version 1.0.0
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react({
      // Fast Refresh
      fastRefresh: true,
      // Babel plugins for production
      babel: {
        plugins: [
          // Remove console.log in production
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    }),

    // PWA Support
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'FoodBot Restaurant Portal',
        short_name: 'FoodBot Restaurant',
        description: 'Restaurant management portal for FoodBot',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.foodbot\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),

    // Gzip compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 10KB
      algorithm: 'gzip',
      ext: '.gz',
    }),

    // Brotli compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 10KB
      algorithm: 'brotliCompress',
      ext: '.br',
    }),

    // Bundle analyzer
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },

  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false, // No source maps in production
    minify: 'terser',
    target: 'es2015',
    cssCodeSplit: true,

    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },

    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunk splitting
        manualChunks: {
          // React vendor chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI library chunk
          'ui-vendor': [
            '@headlessui/react',
            '@heroicons/react',
            'framer-motion',
          ],

          // State management chunk
          'state-vendor': ['@tanstack/react-query', 'zustand'],

          // Form handling chunk
          'form-vendor': ['react-hook-form', 'zod'],

          // Utility chunk
          'utils-vendor': ['date-fns', 'lodash-es', 'axios'],
        },

        // Asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          let extType = info?.[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
            extType = 'images';
          } else if (/woff|woff2|eot|ttf|otf/i.test(extType ?? '')) {
            extType = 'fonts';
          }

          return `assets/${extType}/[name]-[hash][extname]`;
        },

        // Chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // Chunk size warning limit
    chunkSizeWarningLimit: 1000, // 1MB

    // Asset inlining threshold
    assetsInlineLimit: 4096, // 4KB
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },

  // Preview server configuration
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },

  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
