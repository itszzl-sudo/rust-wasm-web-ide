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
    console.log('[RustInterpreter] Loading with multi-domain acceleration...')
    const startTime = performance.now()
    
    const wasmPath = '/wasm/rust_interpreter.js'
    const results = await Promise.allSettled(
      DOMAINS.slice(0, 6).map(async (domain) => {
        const url = `https://${domain}${wasmPath}`
        try {
          const module = await import(/* @vite-ignore */ url)
          await module.default()
          return { module, domain, success: true }
        } catch (e) {
          return { module: null, domain, success: false, error: e }
        }
      })
    )
    
    const successResult = results.find(
      (r): r is PromiseFulfilledResult<{ module: any; domain: string; success: boolean }> => 
        r.status === 'fulfilled' && r.value.success && r.value.module
    )
    
    if (successResult) {
      wasmModule = successResult.value.module
      const loadTime = performance.now() - startTime
      console.log(`[RustInterpreter] Loaded from ${successResult.value.domain} in ${(loadTime / 1000).toFixed(2)}s`)
    } else {
      const fallbackUrl = '/rust-wasm-web-ide/wasm/rust_interpreter.js'
      console.log('[RustInterpreter] Falling back to GitHub Pages...')
      const module = await import(/* @vite-ignore */ fallbackUrl)
      await module.default()
      wasmModule = module
    }
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
