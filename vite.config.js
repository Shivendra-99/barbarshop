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
    // Same-origin API in dev: the app calls "/api/*" and Vite forwards it to the
    // local backend, mirroring the production Vercel proxy so the backend host
    // is never referenced by the browser. Override the target with VITE_DEV_API.
    proxy: {
      '/api': {
        // 127.0.0.1 (not localhost) to avoid Node resolving to ::1 (IPv6) while
        // the backend listens on IPv4 — the classic ECONNREFUSED in dev.
        target: process.env.VITE_DEV_API || 'http://127.0.0.1:4000',
        changeOrigin: true,
        // Clear message when the backend isn't running (instead of a raw 500).
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res.writeHead && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
            }
            res.end?.(
              JSON.stringify({
                error: 'Backend not reachable. Start it: cd server && npm run dev',
              }),
            )
          })
        },
      },
    },
  },
})
