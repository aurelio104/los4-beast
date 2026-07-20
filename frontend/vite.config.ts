import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
        type: 'module'
      },
      includeAssets: [
        'favicon.png',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        'wallpapers/beach-poster.jpg',
        'wallpapers/celosia-dark-640.avif'
      ],
      workbox: {
        importScripts: ['push-handler.js'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigationPreload: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif,woff2,webmanifest}'],
        globIgnores: [
          '**/wallpapers/*.mp4',
          '**/audio/**',
          '**/logoR.png',
          '**/*Admin*.js',
          '**/qrcode-*.js',
          '**/WhatsAppAdmin*.js',
          '**/RedLightGame*.js',
          '**/r3f-*.js'
        ],
        maximumFileSizeToCacheInBytes: 512 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' || /\.(?:png|jpg|jpeg|webp|avif|svg|gif)$/i.test(request.url),
            handler: 'CacheFirst',
            options: {
              cacheName: 'reto-images',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith('.mp4') ||
              url.pathname.startsWith('/wallpapers/') ||
              url.pathname.startsWith('/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'reto-media',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'reto-pages',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 6 }
            }
          }
        ]
      },
      manifest: {
        id: '/',
        scope: '/',
        lang: 'es',
        name: 'Reto',
        short_name: 'Reto',
        description: 'Reto — 29 de agosto',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
        ],
        shortcuts: [
          { name: 'Arena', short_name: 'Arena', url: '/arena', icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Chat', short_name: 'Chat', url: '/chat', icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }] }
        ]
      }
    })
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('three') ||
              id.includes('@react-three') ||
              id.includes('three-stdlib') ||
              id.includes('maath') ||
              id.includes('troika') ||
              id.includes('meshline') ||
              id.includes('draco') ||
              id.includes('glsl-noise')
            ) {
              return 'r3f';
            }
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@simplewebauthn')) return 'webauthn';
            if (id.includes('qrcode')) return 'qrcode';
            if (id.includes('canvas-confetti')) return 'confetti';
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              /node_modules\/react\//.test(id) ||
              /node_modules\/\.pnpm\/react@/.test(id)
            ) {
              return 'vendor';
            }
          }
        }
      }
    }
  },
  server: {
    port: 3011,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true
      }
    }
  }
});
