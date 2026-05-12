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
