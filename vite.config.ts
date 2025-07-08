import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import path from 'path'
import dns from 'dns'

// Force IPv4 first for NordVPN compatibility
dns.setDefaultResultOrder('ipv4first')

export default defineConfig({
  plugins: [react(), UnoCSS()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: 'http://127.0.0.1:5173' // Use 127.0.0.1 for VPN compatibility
  }
})