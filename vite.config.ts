import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isCloudflare = mode === 'cloudflare'
  const base = isCloudflare ? '/' : '/rust-wasm-web-ide/'
  const outDir = isCloudflare ? 'docs-cloudflare' : 'docs-github'
  
  console.log(`Building for ${isCloudflare ? 'Cloudflare' : 'GitHub'}: base=${base}, outDir=${outDir}`)
  
  return {
    plugins: [vue()],
    base,
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      outDir,
      rollupOptions: {
        external: ['wabt'],
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
  }
})
