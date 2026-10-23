import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Numo';
const base = process.env.GITHUB_ACTIONS ? `/${repositoryName}/` : '/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/numo.svg'],
      manifest: {
        name: 'NUMO — חשבון בכיף',
        short_name: 'NUMO',
        lang: 'he',
        dir: 'rtl',
        start_url: './',
        scope: './',
        theme_color: '#1677f2',
        background_color: '#f8faff',
        display: 'standalone',
        icons: [
          { src: 'icons/numo-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/numo-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] },
    }),
  ],
});
