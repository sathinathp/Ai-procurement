import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/procurex/',
  server: {
    host: true,
    port: 1928,
    allowedHosts: true
  }
})

