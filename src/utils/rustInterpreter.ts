import { DOMAINS } from './multiDomainLoader'

interface InterpretResult {
  output: string
  error: string | null
  execution_time: number
}

let wasmModule: any = null
let isLoading: boolean = false

export async function initRustInterpreter(): Promise<void> {
  if (wasmModule) return
  if (isLoading) {
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return
  }
  
  isLoading = true
  
  try {
    console.log('[RustInterpreter] Loading Rust interpreter...')
    const startTime = performance.now()
    
    const isGitHub = window.location.hostname.includes('github.io')
    const wasmPath = isGitHub 
      ? '/rust-wasm-web-ide/wasm/rust_interpreter.js'
      : '/wasm/rust_interpreter.js'
    
    const module = await import(/* @vite-ignore */ wasmPath)
    await module.default()
    wasmModule = module
    
    const loadTime = performance.now() - startTime
    console.log(`[RustInterpreter] ✓ Loaded in ${(loadTime / 1000).toFixed(2)}s`)
  } catch (e) {
    console.error('[RustInterpreter] Failed to load:', e)
    throw e
  } finally {
    isLoading = false
  }
}

export async function interpretRustCode(code: string): Promise<InterpretResult> {
  if (!wasmModule) {
    await initRustInterpreter()
  }
  
  if (!wasmModule) {
    return {
      output: '',
      error: 'Rust interpreter not initialized. Please wait...',
      execution_time: 0
    }
  }
  
  try {
    const result = await wasmModule.interpret_rust_code(code)
    return result as InterpretResult
  } catch (e) {
    return {
      output: '',
      error: `Execution failed: ${(e as Error).message}`,
      execution_time: 0
    }
  }
}

export function formatRustCode(code: string): string {
  if (!wasmModule) {
    return code
  }
  
  try {
    return wasmModule.format_rust_code(code)
  } catch (e) {
    console.error('Formatting failed:', e)
    return code
  }
}
