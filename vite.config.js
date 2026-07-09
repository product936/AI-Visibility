import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Load .env.local for dev so the /api handler picks up ANTHROPIC_API_KEY
import 'dotenv/config'

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/check', async (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('content-type', 'application/json')
          return res.end(JSON.stringify({ ok: true, endpoint: '/api/check', method: 'POST (multipart)' }))
        }
        try {
          const mod = await server.ssrLoadModule('/api/check.js')
          return mod.default(req, res)
        } catch (e) {
          server.config.logger.error(`/api/check dev handler failed: ${e.stack || e.message}`)
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e.message || e) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiDevMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
  },
})
