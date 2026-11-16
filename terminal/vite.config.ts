import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'

// Serves api/*.js (the Vercel functions) from the dev and preview servers, so
// the app runs against the same live endpoints locally as in production.
function localApi(): Plugin {
  const handle: Connect.NextHandleFunction = async (req, res, next) => {
    const name = /^\/api\/([\w-]+)(?:\?|$)/.exec(req.url ?? '')?.[1]
    const file = name && path.resolve(import.meta.dirname, 'api', `${name}.js`)
    if (!file || !fs.existsSync(file)) return next()
    try {
      const mod = await import(`${pathToFileURL(file).href}?t=${fs.statSync(file).mtimeMs}`)
      await mod.default(req, res)
    } catch (err) {
      res.statusCode = 500
      res.end(String(err))
    }
  }
  return {
    name: 'local-api',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
})
