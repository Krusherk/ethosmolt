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
    port: 5173
  }
})
