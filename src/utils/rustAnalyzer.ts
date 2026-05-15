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
      console.log('[TypeChecker] Loading type checker Wasm...')
      const startTime = performance.now()
      
      const base = window.location.hostname.includes('github.io') ? '/rust-wasm-web-ide' : ''
      const module = await import(/* @vite-ignore */ `${base}/type-checker/rust_type_checker.js`)
      await module.default()
      typeCheckerModule = module
      
      const loadTime = performance.now() - startTime
      console.log(`[TypeChecker] Loaded in ${(loadTime / 1000).toFixed(2)}s`)
      isLoaded = true
    } catch (e) {
      console.error('[TypeChecker] Failed to load:', e)
      throw e
    }
  })()

  await loadPromise
}

export function isRustAnalyzerLoaded(): boolean {
  return isLoaded
}

export async function typeCheck(code: string): Promise<TypeCheckResult> {
  if (!typeCheckerModule) {
    await loadRustAnalyzer()
  }

  if (!typeCheckerModule) {
    return {
      diagnostics: [],
      errors: 0,
      warnings: 0
    }
  }

  try {
    const result = await typeCheckerModule.check_types(code)
    const diagnostics: Diagnostic[] = result.diagnostics || []
    return {
      diagnostics,
      errors: diagnostics.filter((d: Diagnostic) => d.severity === 'error').length,
      warnings: diagnostics.filter((d: Diagnostic) => d.severity === 'warning').length,
    }
  } catch (e) {
    console.error('[TypeChecker] Type check failed:', e)
    return {
      diagnostics: [{
        severity: 'error',
        message: `Type check failed: ${(e as Error).message}`,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
      }],
      errors: 1,
      warnings: 0
    }
  }
}

export async function getCompletions(
  code: string,
  position: Position
): Promise<CompletionItem[]> {
  if (!typeCheckerModule) {
    await loadRustAnalyzer()
  }

  if (!typeCheckerModule) {
    return []
  }

  try {
    const result = await typeCheckerModule.get_completions(code, position.line, position.character)
    return result || []
  } catch (e) {
    console.error('[TypeChecker] Completion failed:', e)
    return []
  }
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
