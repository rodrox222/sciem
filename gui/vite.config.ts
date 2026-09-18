import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Permite que Docker exponga el puerto
    port: 5173,
    watch: {
      usePolling: true, // Crucial para que detecte cambios de código en Windows/WSL2
    },
  },
})
