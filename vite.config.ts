import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The app is served from https://<user>.github.io/shualingo/ on GitHub Pages.
const base = process.env.BASE_PATH ?? '/shualingo/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'שועלינגו',
        short_name: 'שועלינגו',
        description: 'לימוד לטינית מאפס, עם שועלה קוסמת שבונה מחנה ביער בעזרת לחשים.',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#141a2e',
        theme_color: '#141a2e',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,json}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
