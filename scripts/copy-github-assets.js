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

console.log('Copying GitHub assets...')

ensureDir(join(root, 'docs-github/wasm'))
cpSync(join(root, 'public/wasm'), join(root, 'docs-github/wasm'), { recursive: true })
console.log('✓ Copied WASM files')

copyFileSync(
  join(root, 'node_modules/monaco-editor/min/vs/base/worker/workerMain.js'),
  join(root, 'docs-github/editor.worker.js')
)
console.log('✓ Copied Monaco worker')

ensureDir(join(root, 'docs-github/vs/base/common/worker'))
copyFileSync(
  join(root, 'node_modules/monaco-editor/min/vs/base/common/worker/simpleWorker.nls.js'),
  join(root, 'docs-github/vs/base/common/worker/simpleWorker.nls.js')
)
console.log('✓ Copied simpleWorker.nls.js')

console.log('All assets copied successfully!')
