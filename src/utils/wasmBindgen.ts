export type JsValue = number | string | boolean | null | undefined | object | JsArray | JsObject

export interface JsArray extends Array<JsValue> {}

export interface JsObject {
  [key: string]: JsValue
}

export interface WasmBindgen {
  ptr: number
  __wbg_ptr: number
}

export class WasmBindgenInterop {
  private memory: WebAssembly.Memory | null = null
  private functions: Map<string, Function> = new Map()
  private objects: Map<number, JsValue> = new Map()
  private nextObjectId: number = 1
  
  constructor() {
    this.initBuiltinFunctions()
  }
  
  setMemory(memory: WebAssembly.Memory) {
    this.memory = memory
  }
  
  private initBuiltinFunctions() {
    this.functions.set('console_log', (...args: JsValue[]) => {
      console.log(...args)
    })
    
    this.functions.set('console_warn', (...args: JsValue[]) => {
      console.warn(...args)
    })
    
    this.functions.set('console_error', (...args: JsValue[]) => {
      console.error(...args)
    })
    
    this.functions.set('Math_random', () => {
      return Math.random()
    })
    
    this.functions.set('Math_floor', (x: number) => {
      return Math.floor(x)
    })
    
    this.functions.set('Math_ceil', (x: number) => {
      return Math.ceil(x)
    })
    
    this.functions.set('Math_round', (x: number) => {
      return Math.round(x)
    })
    
    this.functions.set('Math_abs', (x: number) => {
      return Math.abs(x)
    })
    
    this.functions.set('Math_sqrt', (x: number) => {
      return Math.sqrt(x)
    })
    
    this.functions.set('Math_pow', (base: number, exp: number) => {
      return Math.pow(base, exp)
    })
    
    this.functions.set('Date_now', () => {
      return Date.now()
    })
    
    this.functions.set('JSON_parse', (str: string) => {
      return JSON.parse(str)
    })
    
    this.functions.set('JSON_stringify', (obj: JsValue) => {
      return JSON.stringify(obj)
    })
    
    this.functions.set('setTimeout', (callback: number, delay: number) => {
      const fn = this.objects.get(callback)
      if (typeof fn === 'function') {
        return setTimeout(() => fn(), delay)
      }
      return 0
    })
    
    this.functions.set('clearTimeout', (id: number) => {
      clearTimeout(id)
    })
    
    this.functions.set('setInterval', (callback: number, delay: number) => {
      const fn = this.objects.get(callback)
      if (typeof fn === 'function') {
        return setInterval(() => fn(), delay)
      }
      return 0
    })
    
    this.functions.set('clearInterval', (id: number) => {
      clearInterval(id)
    })
    
    this.functions.set('performance_now', () => {
      return performance.now()
    })
    
    this.functions.set('encodeURI', (str: string) => {
      return encodeURI(str)
    })
    
    this.functions.set('decodeURI', (str: string) => {
      return decodeURI(str)
    })
    
    this.functions.set('encodeURIComponent', (str: string) => {
      return encodeURIComponent(str)
    })
    
    this.functions.set('decodeURIComponent', (str: string) => {
      return decodeURIComponent(str)
    })
  }
  
  registerFunction(name: string, fn: Function) {
    this.functions.set(name, fn)
  }
  
  callFunction(name: string, ...args: JsValue[]): JsValue {
    const fn = this.functions.get(name)
    if (fn) {
      return fn(...args)
    }
    throw new Error(`Function not found: ${name}`)
  }
  
  allocObject(obj: JsValue): number {
    const id = this.nextObjectId++
    this.objects.set(id, obj)
    return id
  }
  
  getObject(id: number): JsValue | undefined {
    return this.objects.get(id)
  }
  
  freeObject(id: number) {
    this.objects.delete(id)
  }
  
  readMemory(ptr: number, len: number): Uint8Array {
    if (!this.memory) {
      throw new Error('Memory not initialized')
    }
    const buf = new Uint8Array(this.memory.buffer)
    return buf.slice(ptr, ptr + len)
  }
  
  writeMemory(ptr: number, data: Uint8Array) {
    if (!this.memory) {
      throw new Error('Memory not initialized')
    }
    const buf = new Uint8Array(this.memory.buffer)
    buf.set(data, ptr)
  }
  
  readString(ptr: number, len: number): string {
    const bytes = this.readMemory(ptr, len)
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(bytes)
  }
  
  writeString(str: string): { ptr: number; len: number } {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    const ptr = this.alloc(bytes.length)
    this.writeMemory(ptr, bytes)
    return { ptr, len: bytes.length }
  }
  
  alloc(size: number): number {
    if (!this.memory) {
      throw new Error('Memory not initialized')
    }
    const buf = new Uint8Array(this.memory.buffer)
    const ptr = buf.length
    const newBuf = new Uint8Array(this.memory.buffer, 0, ptr + size)
    return ptr
  }
  
  generateImports(): WebAssembly.Imports {
    const imports: WebAssembly.Imports = {
      wbg: {
        memory: this.memory || new WebAssembly.Memory({ initial: 256, maximum: 16384 }),
      }
    }
    
    this.functions.forEach((fn, name) => {
      (imports.wbg as any)[name] = fn
    })
    
    return imports
  }
}

export const wasmBindgen = new WasmBindgenInterop()

export function __wbindgen_object_drop_ref(idx: number) {
  wasmBindgen.freeObject(idx)
}

export function __wbindgen_string_new(ptr: number, len: number): number {
  const str = wasmBindgen.readString(ptr, len)
  return wasmBindgen.allocObject(str)
}

export function __wbindgen_string_get(idx: number, ptr: number, len: number): number {
  const obj = wasmBindgen.getObject(idx)
  if (typeof obj === 'string') {
    const { ptr: strPtr, len: strLen } = wasmBindgen.writeString(obj)
    return strLen
  }
  return 0
}

export function __wbindgen_number_new(val: number): number {
  return wasmBindgen.allocObject(val)
}

export function __wbindgen_number_get(idx: number): number {
  const obj = wasmBindgen.getObject(idx)
  return typeof obj === 'number' ? obj : 0
}

export function __wbindgen_boolean_new(val: boolean): number {
  return wasmBindgen.allocObject(val)
}

export function __wbindgen_boolean_get(idx: number): boolean {
  const obj = wasmBindgen.getObject(idx)
  return typeof obj === 'boolean' ? obj : false
}

export function __wbindgen_json_parse(ptr: number, len: number): number {
  const str = wasmBindgen.readString(ptr, len)
  const obj = JSON.parse(str)
  return wasmBindgen.allocObject(obj)
}

export function __wbindgen_json_serialize(idx: number): { ptr: number; len: number } {
  const obj = wasmBindgen.getObject(idx)
  const str = JSON.stringify(obj)
  return wasmBindgen.writeString(str)
}

export function __wbindgen_throw(ptr: number, len: number): never {
  const msg = wasmBindgen.readString(ptr, len)
  throw new Error(msg)
}

export function __wbindgen_cb_drop(idx: number) {
  wasmBindgen.freeObject(idx)
}

export function __wbindgen_closure_recapture(idx: number): number {
  return idx
}
