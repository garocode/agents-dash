import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devServer from '@hono/vite-dev-server'
import { nodeAdapter } from '@hono/vite-dev-server/node'
import build from '@hono/vite-build/node'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      build: {
        rollupOptions: {
          input: './src/entry-client.tsx',
          output: {
            entryFileNames: 'static/client.js',
            chunkFileNames: 'static/assets/[name]-[hash].js',
            assetFileNames: 'static/assets/[name].[ext]'
          }
        },
        emptyOutDir: false,
        copyPublicDir: false
      }
    }
  }

  return {
    server: {
      port: 3456
    },
    plugins: [
      react(),
      devServer({
        entry: 'src/server.tsx',
        adapter: nodeAdapter
      }),
      build({
        entry: './src/server.tsx'
      })
    ]
  }
})
