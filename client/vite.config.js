import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const sharpShimPlugin = {
  name: 'sharp-browser-shim',
  enforce: 'pre',
  resolveId(id) {
    if (
      id === 'sharp' ||
      id === 'sharp/lib/index.js' ||
      id === '/node_modules/sharp/lib/index.js' ||
      id.startsWith('/node_modules/sharp/lib/index.js?')
    ) {
      return '\0sharp-browser-shim'
    }
    return null
  },
  load(id) {
    if (id === '\0sharp-browser-shim') {
      return 'const emptyModule = {}; export default emptyModule;'
    }
    return null
  }
}

export default defineConfig({
  plugins: [sharpShimPlugin, react()],
  resolve: {
    alias: {
      '@huggingface/transformers': fileURLToPath(new URL('./node_modules/@huggingface/transformers/dist/transformers.web.js', import.meta.url)),
      sharp: fileURLToPath(new URL('./src/shims/emptyModule.js', import.meta.url)),
      'sharp/lib/index.js': fileURLToPath(new URL('./src/shims/emptyModule.js', import.meta.url)),
      long: fileURLToPath(new URL('./node_modules/long/index.js', import.meta.url))
    },
    conditions: ['browser', 'import', 'module', 'default']
  },
  server: {
    port: 5173,
    // Required headers for WebAssembly multi-threading (Transformers.js / CLIP model)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  optimizeDeps: {
    exclude: [
      '@tensorflow/tfjs',
      '@tensorflow-models/mobilenet',
      '@tensorflow-models/coco-ssd',
      '@huggingface/transformers',
    ],
    include: []
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})
