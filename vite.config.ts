import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const base = process.env.DEPLOY_TARGET === 'cloudflare' ? '/' : '/rust-wasm-web-ide/'

export default defineConfig({
  plugins: [vue()],
  base,
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'monaco-editor': resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor')
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    outDir: 'docs',
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['monaco-editor'],
    exclude: ['rust-interpreter']
  },
  worker: {
    format: 'es'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
