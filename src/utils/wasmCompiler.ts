export interface CompileResult {
  success: boolean
  wasm?: Uint8Array
  wat?: string
  error?: string
  stats: {
    rustLines: number
    watLines: number
    wasmBytes: number
    compileTime: number
  }
}

let wabtModule: any = null

async function loadWabt() {
  if (wabtModule) return wabtModule
  
  try {
    // Load wabt.js from CDN using script tag
    const wabtUrl = 'https://cdn.jsdelivr.net/npm/wabt@1.0.32/index.js'
    
    // @ts-ignore
    if (typeof window.WabtModule === 'undefined') {
      const script = document.createElement('script')
      script.src = wabtUrl
      document.head.appendChild(script)
      
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load wabt.js'))
      })
    }
    
    // @ts-ignore
    wabtModule = await window.WabtModule()
    return wabtModule
  } catch (e) {
    console.error('Failed to load wabt:', e)
    throw new Error(`Failed to load wabt.js: ${(e as Error).message}`)
  }
}

export async function compileRustToWasm(rustCode: string): Promise<CompileResult> {
  const startTime = performance.now()
  
  try {
    const { rustToWAT } = await import('./rustToWAT')
    
    console.log('[Compiler] Step 1: Converting Rust to WAT...')
    const wat = rustToWAT.convert(rustCode)
    console.log('[Compiler] WAT generated:', wat.split('\n').length, 'lines')
    
    console.log('[Compiler] Step 2: Compiling WAT to WASM...')
    const wasmBinary = await compileWatToWasm(wat)
    
    const compileTime = performance.now() - startTime
    
    return {
      success: true,
      wasm: wasmBinary,
      wat,
      stats: {
        rustLines: rustCode.split('\n').length,
        watLines: wat.split('\n').length,
        wasmBytes: wasmBinary.byteLength,
        compileTime
      }
    }
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      stats: {
        rustLines: rustCode.split('\n').length,
        watLines: 0,
        wasmBytes: 0,
        compileTime: performance.now() - startTime
      }
    }
  }
}

async function compileWatToWasm(wat: string): Promise<Uint8Array> {
  try {
    const wabtModule = await loadWabt()
    
    const features = {
      exceptions: false,
      mutable_globals: true,
      sat_float_to_int: false,
      sign_extension: true,
      simd: false,
      threads: false,
      multi_value: true,
      tail_call: false,
      bulk_memory: true,
      reference_types: true,
      gc: false
    }
    
    const module = wabtModule.parseWat('module.wat', wat, features)
    
    module.validate()
    
    const { buffer } = module.toBinary({
      log: false,
      canonicalize_lebs: true,
      relocatable: false,
      write_debug_names: false
    })
    
    return new Uint8Array(buffer)
  } catch (e) {
    throw new Error(`WAT compilation failed: ${(e as Error).message}`)
  }
}

export async function instantiateWasm(
  wasmBinary: Uint8Array,
  imports: WebAssembly.Imports = {}
): Promise<WebAssembly.Instance> {
  const defaultImports = {
    env: {
      memory: new WebAssembly.Memory({ initial: 1 }),
      log: (ptr: number, len: number) => {
        console.log(`[WASM log] ptr=${ptr}, len=${len}`)
      }
    }
  }
  
  const mergedImports = {
    ...defaultImports,
    ...imports
  }
  
  const { instance } = await WebAssembly.instantiate(wasmBinary, mergedImports)
  return instance
}

export async function runCompiledWasm(
  wasmBinary: Uint8Array,
  functionName: string = 'main',
  args: number[] = []
): Promise<any> {
  const instance = await instantiateWasm(wasmBinary)
  
  if (!(instance.exports as any)[functionName]) {
    throw new Error(`Function '${functionName}' not found in WASM exports`)
  }
  
  return (instance.exports as any)[functionName](...args)
}
