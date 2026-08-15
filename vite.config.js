import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Honour PORT when the environment assigns one, otherwise use Vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
})
