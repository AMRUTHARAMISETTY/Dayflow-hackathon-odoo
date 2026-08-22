import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/webauthn': 'http://localhost:8080',
      '/login': 'http://localhost:8080',
    },
  },
})
