export interface ClippyWarning {
  name: string
  message: string
  line: number
  column: number
  severity: string
}

let clippyModule: any = null
let clippyChecker: any = null
let isLoaded = false

export async function loadClippy(): Promise<void> {
  if (isLoaded) return
  
  try {
    console.log('[Clippy] Loading Clippy WASM...')
    const startTime = performance.now()
    
    const base = window.location.hostname.includes('github.io') ? '/rust-wasm-web-ide' : ''
    
    const moduleImport = await import(
      /* @vite-ignore */
      `${base}/clippy/clippy_wasm.js`
    )
    
    await moduleImport.default()
    clippyModule = moduleImport
    clippyChecker = new moduleImport.ClippyChecker()
    
    const loadTime = performance.now() - startTime
    console.log(`[Clippy] Loaded in ${(loadTime / 1000).toFixed(2)}s`)
    isLoaded = true
  } catch (e) {
    console.error('[Clippy] Failed to load:', e)
    
    clippyChecker = new FallbackClippyChecker()
    isLoaded = true
  }
}

export function isClippyLoaded(): boolean {
  return isLoaded
}

export async function checkClippy(code: string): Promise<ClippyWarning[]> {
  if (!isLoaded) {
    await loadClippy()
  }
  
  if (!clippyChecker) {
    return []
  }
  
  try {
    const result = clippyChecker.check(code)
    
    if (Array.isArray(result)) {
      return result
    }
    
    if (result && typeof result === 'object') {
      const warnings: ClippyWarning[] = []
      
      for (let i = 0; ; i++) {
        const item = result[i]
        if (item === undefined) break
        
        warnings.push({
          name: item.name || 'unknown',
          message: item.message || '',
          line: item.line || 0,
          column: item.column || 0,
          severity: item.severity || 'warn'
        })
      }
      
      return warnings
    }
    
    return []
  } catch (e) {
    console.error('[Clippy] Check failed:', e)
    return []
  }
}

class FallbackClippyChecker {
  check(code: string): ClippyWarning[] {
    const warnings: ClippyWarning[] = []
    
    const lines = code.split('\n')
    
    lines.forEach((line, i) => {
      if (line.includes('.clone()') && (line.includes('i32') || line.includes('bool'))) {
        warnings.push({
          name: 'clone_on_copy',
          message: 'using `.clone()` on a Copy type is unnecessary',
          line: i + 1,
          column: line.indexOf('.clone()'),
          severity: 'warn'
        })
      }
      
      if (line.includes('.map(|x| x)')) {
        warnings.push({
          name: 'map_identity',
          message: 'using `.map(|x| x)` is redundant',
          line: i + 1,
          column: line.indexOf('.map'),
          severity: 'warn'
        })
      }
      
      if (line.includes('if true {')) {
        warnings.push({
          name: 'needless_bool',
          message: 'if true { ... } can be replaced with { ... }',
          line: i + 1,
          column: line.indexOf('if true'),
          severity: 'warn'
        })
      }
      
      if (line.includes('!!')) {
        warnings.push({
          name: 'double_neg',
          message: '`!!x` can be replaced with `x`',
          line: i + 1,
          column: line.indexOf('!!'),
          severity: 'warn'
        })
      }
      
      if (line.includes('.len() < 0')) {
        warnings.push({
          name: 'absurd_comparison',
          message: 'length comparison with 0 is always false',
          line: i + 1,
          column: 0,
          severity: 'error'
        })
      }
      
      const eqMatch = line.match(/(\w+)\s*==\s*\1/)
      if (eqMatch) {
        warnings.push({
          name: 'eq_op',
          message: 'equal expressions left and right of `==`',
          line: i + 1,
          column: line.indexOf('=='),
          severity: 'warn'
        })
      }
    })
    
    return warnings
  }
}

export function formatClippyWarnings(warnings: ClippyWarning[]): string {
  if (warnings.length === 0) {
    return '✅ Clippy: No warnings found'
  }
  
  const errorCount = warnings.filter(w => w.severity === 'error').length
  const warnCount = warnings.filter(w => w.severity === 'warn').length
  
  let output = `🧹 Clippy: ${warnings.length} warning(s) found`
  if (errorCount > 0) output += ` (${errorCount} error(s), ${warnCount} warning(s))`
  output += '\n\n'
  
  warnings.forEach(w => {
    const icon = w.severity === 'error' ? '❌' : '⚠️'
    output += `${icon} ${w.name}: ${w.message}\n`
    output += `   at line ${w.line}:${w.column}\n\n`
  })
  
  return output
}
