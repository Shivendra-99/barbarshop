import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Honour PORT when the environment assigns one, otherwise use Vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    // Bind all interfaces and accept any hostname, so the app can be reached via
    // a real host (hosts-file alias, tunnel) — needed because MSG91's OTP widget
    // uses hCaptcha, which refuses to run on "localhost".
    host: true,
    allowedHosts: true,
  },
})
