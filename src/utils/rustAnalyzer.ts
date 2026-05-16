import { TypeSystem, Diagnostic as TSDiagnostic } from './typeSystemBasic'

interface RustAnalyzer {
  check(code: string): Promise<TypeCheckResult>
  complete(code: string, position: Position): Promise<CompletionItem[]>
  hover(code: string, position: Position): Promise<HoverInfo>
}

interface TypeCheckResult {
  diagnostics: Diagnostic[]
  errors: number
  warnings: number
}

interface Diagnostic {
  severity: 'error' | 'warning' | 'info'
  message: string
  range: {
    start: Position
    end: Position
  }
}

interface Position {
  line: number
  character: number
}

interface CompletionItem {
  label: string
  kind: 'function' | 'variable' | 'struct' | 'enum' | 'module'
  detail?: string
  insertText: string
}

interface HoverInfo {
  contents: string
  range?: {
    start: Position
    end: Position
  }
}

let typeCheckerModule: any = null
let loadPromise: Promise<void> | null = null
let isLoaded = false

export async function loadRustAnalyzer(): Promise<void> {
  if (isLoaded) return
  if (loadPromise) {
    await loadPromise
    return
  }

  loadPromise = (async () => {
    try {
      console.log('[RustAnalyzer] Loading rust-analyzer WASM...')
      const startTime = performance.now()
      
      const base = window.location.hostname.includes('github.io') ? '/rust-wasm-web-ide' : ''
      
      try {
        const module = await import(/* @vite-ignore */ `${base}/type-checker/rust_analyzer_wasm.js`)
        await module.default()
        typeCheckerModule = module
        console.log('[RustAnalyzer] Using custom WASM')
      } catch (wasmError) {
        console.log('[RustAnalyzer] Custom WASM not available, using fallback')
      }
      
      const loadTime = performance.now() - startTime
      console.log(`[RustAnalyzer] Loaded in ${(loadTime / 1000).toFixed(2)}s`)
      isLoaded = true
    } catch (e) {
      console.error('[RustAnalyzer] Failed to load:', e)
      console.log('[RustAnalyzer] Using TypeScript fallback')
      isLoaded = true
    }
  })()

  await loadPromise
}

export function isRustAnalyzerLoaded(): boolean {
  return isLoaded
}

export async function typeCheck(code: string): Promise<TypeCheckResult> {
  if (!isLoaded) {
    await loadRustAnalyzer()
  }

  // Try WASM first
  if (typeCheckerModule) {
    try {
      const result = typeCheckerModule.check_types ? 
        await typeCheckerModule.check_types(code) :
        typeCheckerModule.check ? 
        typeCheckerModule.check(code) : null
      
      if (result) {
        const diagnostics: Diagnostic[] = []
        
        if (Array.isArray(result)) {
          result.forEach((d: any) => {
            diagnostics.push({
              severity: d.severity || 'warning',
              message: d.message,
              range: {
                start: { line: (d.line || 1) - 1, character: d.column || 0 },
                end: { line: (d.end_line || d.line || 1) - 1, character: d.end_column || 0 }
              }
            })
          })
        }
        
        return {
          diagnostics,
          errors: diagnostics.filter(d => d.severity === 'error').length,
          warnings: diagnostics.filter(d => d.severity === 'warning').length,
        }
      }
    } catch (e) {
      console.error('[RustAnalyzer] WASM check failed:', e)
    }
  }
  
  // Fallback to TypeScript
  return fallbackChecker.check(code)
}

export async function getCompletions(
  code: string,
  position: Position
): Promise<CompletionItem[]> {
  if (!isLoaded) {
    await loadRustAnalyzer()
  }

  // Try WASM first
  if (typeCheckerModule && typeCheckerModule.get_completions) {
    try {
      const result = await typeCheckerModule.get_completions(code, position.line, position.character)
      if (Array.isArray(result)) {
        return result.map((item: any) => ({
          label: item.label,
          kind: item.kind || 'variable',
          insertText: item.insertText || item.label,
          detail: item.detail
        }))
      }
    } catch (e) {
      console.error('[RustAnalyzer] WASM completions failed:', e)
    }
  }
  
  // Fallback
  return fallbackChecker.complete(code, position)
}

export async function getHoverInfo(
  code: string,
  position: Position
): Promise<HoverInfo | null> {
  if (!typeCheckerModule) {
    await loadRustAnalyzer()
  }

  return null
}

// Fallback TypeScript-based type checker
class FallbackTypeChecker {
  private typeSystem: TypeSystem
  private keywords: Set<string>
  
  constructor() {
    this.typeSystem = new TypeSystem()
    this.keywords = new Set([
      'fn', 'let', 'mut', 'const', 'static', 'pub', 'mod', 'use',
      'struct', 'enum', 'trait', 'impl', 'type', 'where', 'for',
      'if', 'else', 'match', 'while', 'loop', 'break', 'continue',
      'return', 'async', 'await', 'move', 'ref', 'self', 'Self',
      'true', 'false', 'in', 'as', 'extern', 'crate', 'super', 'dyn'
    ])
  }
  
  check(code: string): TypeCheckResult {
    const diagnostics = this.typeSystem.analyze(code)
    const lines = code.split('\n')
    
    lines.forEach((line, lineNum) => {
      const trimmed = line.trim()
      
      if (trimmed.includes('.unwrap()')) {
        diagnostics.push({
          severity: 'warning',
          message: 'calling `.unwrap()` may panic',
          range: {
            start: { line: lineNum, character: trimmed.indexOf('.unwrap()') },
            end: { line: lineNum, character: trimmed.indexOf('.unwrap()') + 9 }
          }
        })
      }
      
      if (trimmed.includes('unsafe')) {
        diagnostics.push({
          severity: 'warning',
          message: 'unsafe block: memory safety not guaranteed',
          range: {
            start: { line: lineNum, character: 0 },
            end: { line: lineNum, character: line.length }
          }
        })
      }
    })
    
    return {
      diagnostics,
      errors: diagnostics.filter(d => d.severity === 'error').length,
      warnings: diagnostics.filter(d => d.severity === 'warning').length
    }
  }
  
  complete(code: string, position: Position): CompletionItem[] {
    const completions: CompletionItem[] = []
    const lines = code.split('\n')
    const line = lines[position.line] || ''
    const beforeCursor = line.substring(0, position.character)
    const wordMatch = beforeCursor.match(/(\w+)$/)
    const prefix = wordMatch ? wordMatch[1] : ''
    
    this.keywords.forEach(kw => {
      if (!prefix || kw.startsWith(prefix)) {
        completions.push({
          label: kw,
          kind: 'variable',
          insertText: kw
        })
      }
    })
    
    const builtins = ['i32', 'i64', 'u32', 'u64', 'f32', 'f64', 'bool', 'char', 'String', 'Vec', 'Option', 'Result', 'Box', 'Rc']
    builtins.forEach(name => {
      if (!prefix || name.startsWith(prefix)) {
        completions.push({
          label: name,
          kind: 'struct',
          insertText: name
        })
      }
    })
    
    return completions.slice(0, 30)
  }
  
  hover(code: string, position: Position): HoverInfo | null {
    const lines = code.split('\n')
    const line = lines[position.line] || ''
    const wordMatch = line.substring(Math.max(0, position.character - 10), position.character + 10).match(/(\w+)/)
    
    if (!wordMatch) return null
    
    const word = wordMatch[1]
    const typeInfo = this.typeSystem.getType(word)
    
    if (typeInfo) {
      return {
        contents: `\`\`\`rust\n${typeInfo.name}: ${typeInfo.kind}\n\`\`\``
      }
    }
    
    if (this.keywords.has(word)) {
      return {
        contents: `\`\`\`rust\n${word}\n\`\`\`\n\nKeyword`
      }
    }
    
    return null
  }
}

const fallbackChecker = new FallbackTypeChecker()

export async function typeCheckWithFallback(code: string): Promise<TypeCheckResult> {
  if (isLoaded && typeCheckerModule) {
    return typeCheck(code)
  }
  
  return Promise.resolve(fallbackChecker.check(code))
}

export async function getCompletionsWithFallback(
  code: string,
  position: Position
): Promise<CompletionItem[]> {
  if (isLoaded && typeCheckerModule) {
    return getCompletions(code, position)
  }
  
  return Promise.resolve(fallbackChecker.complete(code, position))
}

export async function getHoverWithFallback(
  code: string,
  position: Position
): Promise<HoverInfo | null> {
  if (isLoaded && typeCheckerModule) {
    return getHoverInfo(code, position)
  }
  
  return Promise.resolve(fallbackChecker.hover(code, position))
}

export function getFallbackChecker(): FallbackTypeChecker {
  return fallbackChecker
}
