import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    allowedHosts: true, // Barcha tarmoqlardan kirish uchun
    port: 5173, // Portni aniq belgilash
    strictPort: true,
    https: false, // Https o‘chirib qo‘yish (Ngrok o‘zi SSL qo‘shadi)
    headers: {
      'Cache-Control': 'no-store'
    },
  
  },
  base: "/"
})
