interface InterpretResult {
  output: string
  error: string | null
  execution_time: number
}

interface RustInterpreter {
  interpret_rust_code(code: string): InterpretResult
  format_rust_code(code: string): string
}

let wasmModule: RustInterpreter | null = null

export async function initRustInterpreter(): Promise<void> {
  if (wasmModule) return
  
  try {
    const wasmPath = '/rust-interpreter/pkg/rust_interpreter.js'
    const module = await import(wasmPath)
    await module.default()
    wasmModule = module as RustInterpreter
  } catch (e) {
    console.error('Failed to load Rust interpreter:', e)
    throw e
  }
}

export function interpretRustCode(code: string): InterpretResult {
  if (!wasmModule) {
    return {
      output: '',
      error: 'Rust interpreter not initialized. Please wait...',
      execution_time: 0
    }
  }
  
  try {
    return wasmModule.interpret_rust_code(code)
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
