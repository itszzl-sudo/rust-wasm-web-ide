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

let rustAnalyzerModule: RustAnalyzer | null = null
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
      console.warn('[RustAnalyzer] rust-analyzer Wasm is not available')
      console.warn('[RustAnalyzer] Type checking feature is disabled')
      isLoaded = false
    } catch (e) {
      console.error('[RustAnalyzer] 加载失败:', e)
      throw e
    }
  })()

  await loadPromise
}

export function isRustAnalyzerLoaded(): boolean {
  return isLoaded
}

export async function typeCheck(code: string): Promise<TypeCheckResult> {
  if (!rustAnalyzerModule) {
    await loadRustAnalyzer()
  }

  if (!rustAnalyzerModule) {
    return {
      diagnostics: [],
      errors: 0,
      warnings: 0
    }
  }

  try {
    return await rustAnalyzerModule.check(code)
  } catch (e) {
    console.error('[RustAnalyzer] 类型检查失败:', e)
    return {
      diagnostics: [{
        severity: 'error',
        message: `类型检查失败: ${(e as Error).message}`,
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
  if (!rustAnalyzerModule) {
    await loadRustAnalyzer()
  }

  if (!rustAnalyzerModule) {
    return []
  }

  try {
    return await rustAnalyzerModule.complete(code, position)
  } catch (e) {
    console.error('[RustAnalyzer] 补全失败:', e)
    return []
  }
}

export async function getHoverInfo(
  code: string,
  position: Position
): Promise<HoverInfo | null> {
  if (!rustAnalyzerModule) {
    await loadRustAnalyzer()
  }

  if (!rustAnalyzerModule) {
    return null
  }

  try {
    return await rustAnalyzerModule.hover(code, position)
  } catch (e) {
    console.error('[RustAnalyzer] Hover 失败:', e)
    return null
  }
}
