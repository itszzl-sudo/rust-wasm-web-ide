import { copyFileSync, mkdirSync, existsSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = join(__dirname, '..')

const ensureDir = (dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

console.log('Copying Cloudflare assets...')

ensureDir(join(root, 'docs-cloudflare/wasm'))
cpSync(join(root, 'public/wasm'), join(root, 'docs-cloudflare/wasm'), { recursive: true })
console.log('✓ Copied WASM files')

ensureDir(join(root, 'docs-cloudflare/type-checker'))
cpSync(join(root, 'public/type-checker'), join(root, 'docs-cloudflare/type-checker'), { recursive: true })
console.log('✓ Copied type-checker files')

copyFileSync(
  join(root, 'node_modules/monaco-editor/min/vs/base/worker/workerMain.js'),
  join(root, 'docs-cloudflare/editor.worker.js')
)
console.log('✓ Copied Monaco worker')

ensureDir(join(root, 'docs-cloudflare/vs/base/common/worker'))
copyFileSync(
  join(root, 'node_modules/monaco-editor/min/vs/base/common/worker/simpleWorker.nls.js'),
  join(root, 'docs-cloudflare/vs/base/common/worker/simpleWorker.nls.js')
)
console.log('✓ Copied simpleWorker.nls.js')

console.log('All assets copied successfully!')
