export interface PlaygroundResult {
  success: boolean
  stdout: string
  stderr: string
  rustc: string
  program: string
  execution_time: number
}

export type Channel = 'stable' | 'beta' | 'nightly'
export type Edition = '2015' | '2018' | '2021'
export type Mode = 'debug' | 'release'
export type CrateType = 'bin' | 'lib'

export interface PlaygroundOptions {
  channel?: Channel
  edition?: Edition
  mode?: Mode
  crateType?: CrateType
  tests?: boolean
}

export type ProgressCallback = (progress: number, message: string) => void

export async function compileWithPlayground(
  code: string,
  options: PlaygroundOptions = {},
  onProgress?: ProgressCallback
): Promise<PlaygroundResult> {
  const {
    channel = 'stable',
    edition = '2021',
    mode = 'debug',
    crateType = 'bin',
    tests = false
  } = options
  
  const startTime = performance.now()
  
  try {
    onProgress?.(10, 'Connecting to Rust Playground...')
    
    const response = await fetch('https://play.rust-lang.org/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        channel,
        edition,
        mode,
        crateType,
        tests,
        backtrace: false,
        targetStage: 0
      })
    })
    
    onProgress?.(50, 'Compiling...')
    
    if (!response.ok) {
      throw new Error(`Playground API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    onProgress?.(100, 'Done')
    
    const executionTime = performance.now() - startTime
    
    return {
      success: data.success === true,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      rustc: data.rustc || '',
      program: data.program || '',
      execution_time: executionTime
    }
  } catch (e) {
    const executionTime = performance.now() - startTime
    return {
      success: false,
      stdout: '',
      stderr: `Playground error: ${(e as Error).message}`,
      rustc: '',
      program: '',
      execution_time: executionTime
    }
  }
}

export async function executeWithPlayground(
  code: string,
  options: PlaygroundOptions = {},
  onProgress?: ProgressCallback
): Promise<PlaygroundResult> {
  const {
    channel = 'stable',
    edition = '2021',
    mode = 'debug',
    crateType = 'bin'
  } = options
  
  const startTime = performance.now()
  
  try {
    onProgress?.(10, 'Connecting to Rust Playground...')
    
    const response = await fetch('https://play.rust-lang.org/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        channel,
        edition,
        mode,
        crateType,
        backtrace: false,
        targetStage: 0
      })
    })
    
    onProgress?.(50, 'Compiling and running...')
    
    if (!response.ok) {
      throw new Error(`Playground API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    onProgress?.(100, 'Done')
    
    const executionTime = performance.now() - startTime
    
    return {
      success: data.success === true,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      rustc: data.rustc || '',
      program: data.program || '',
      execution_time: executionTime
    }
  } catch (e) {
    const executionTime = performance.now() - startTime
    return {
      success: false,
      stdout: '',
      stderr: `Playground error: ${(e as Error).message}`,
      rustc: '',
      program: '',
      execution_time: executionTime
    }
  }
}

export function formatPlaygroundOutput(result: PlaygroundResult): string {
  const lines: string[] = []
  
  if (result.rustc) {
    const rustcLines = result.rustc.split('\n').filter(l => l.trim())
    if (rustcLines.length > 0) {
      lines.push('--- Compiler Output ---')
      lines.push(...rustcLines)
      lines.push('')
    }
  }
  
  if (result.stderr) {
    const stderrLines = result.stderr.split('\n').filter(l => l.trim())
    if (stderrLines.length > 0) {
      lines.push('--- Errors ---')
      lines.push(...stderrLines)
      lines.push('')
    }
  }
  
  if (result.stdout) {
    const stdoutLines = result.stdout.split('\n').filter(l => l.trim())
    if (stdoutLines.length > 0) {
      lines.push('--- Output ---')
      lines.push(...stdoutLines)
      lines.push('')
    }
  }
  
  if (result.program) {
    const programLines = result.program.split('\n').filter(l => l.trim())
    if (programLines.length > 0) {
      lines.push('--- Program Output ---')
      lines.push(...programLines)
    }
  }
  
  if (lines.length === 0) {
    lines.push(result.success ? 'Compilation successful (no output)' : 'Compilation failed (no output)')
  }
  
  lines.push('')
  lines.push(`Execution time: ${result.execution_time.toFixed(2)}ms`)
  
  return lines.join('\n')
}
