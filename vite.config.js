import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'E-Pikpor',
        short_name: 'E-Pikpor',
        description: 'Sistem Pelaporan Piket Operasional Digital — Unit Gakkum Satlantas Polrestabes Bandung',
        theme_color: '#0B1424',
        background_color: '#0B1424',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Antrean luring laporan ditangani manual di src/lib/offlineQueue.js (IndexedDB),
        // bukan lewat Workbox — Workbox di sini hanya untuk shell aplikasi (JS/CSS) supaya
        // bisa dibuka lagi tanpa sinyal, bukan untuk menyimpan data laporan.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Tanpa dua opsi ini, service worker versi baru cuma "menunggu" sampai
        // SELURUH tab aplikasi ditutup — akibatnya personel yang tabnya tidak
        // pernah benar-benar ditutup (kasus lazim di HP) tetap dilayani berkas
        // lama dari cache setelah aplikasi diperbarui, dan mengira perbaikannya
        // tidak pernah sampai. Dengan ini, versi baru langsung mengambil alih.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
