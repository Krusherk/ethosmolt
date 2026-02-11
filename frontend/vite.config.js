import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: true,
    port: process.env.PORT || 3000,
    allowedHosts: ['ethosmolt-production-3afb.up.railway.app', 'moltethos-frontend-production.up.railway.app', '.railway.app']
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/8004scan': {
        target: 'https://www.8004scan.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/8004scan/, '/api/v1')
      }
    }
  }
})
