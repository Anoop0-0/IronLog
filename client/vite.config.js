import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // reuse the existing public/manifest.json + icons (already linked
      // from index.html) instead of generating a second one
      manifest: false,
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        // app-shell + static asset caching so the installed PWA still
        // opens offline — API calls still need the network and will
        // surface the existing "failed to load" error banners when offline
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'ironlog-images' },
          },
        ],
      },
    }),
  ],
})
