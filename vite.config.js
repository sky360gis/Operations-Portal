import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  experimental: {
    enableNativePlugin: false, // Add these lines here
  },
})