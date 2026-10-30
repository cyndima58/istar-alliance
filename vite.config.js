import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 推播通知的處理程式（public/push-sw.js）載入到 PWA 的 service worker
      workbox: { importScripts: ['push-sw.js'], navigateFallbackDenylist: [/^\/api\//, /^\/guide\//] },
      includeAssets: ['favicon.ico', 'favicon.svg', 'app-apple-touch-icon.png', 'app-icon-192.png', 'app-icon-512.png', 'app-maskable-512.png', 'logo-mark.svg'],
      manifest: {
        name: 'iSTAR Alliance 星辰聯盟',
        short_name: 'iSTAR',
        description: '星辰聯盟學員成長平台',
        theme_color: '#FAFAF7',
        background_color: '#FAFAF7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'app-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
