interface InterpretResult {
  output: string
  error: string | null
  execution_time: number
}

let wasmModule: any = null

export async function initRustInterpreter(): Promise<void> {
  if (wasmModule) return
  
  try {
    const wasmPath = '/wasm/rust_interpreter.js'
    const module = await import(/* @vite-ignore */ wasmPath)
    await module.default()
    wasmModule = module
  } catch (e) {
    console.error('Failed to load Rust interpreter:', e)
    throw e
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
