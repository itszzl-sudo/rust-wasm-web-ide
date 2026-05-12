export interface AnalysisTask {
  type: 'syntax' | 'typeCheck' | 'completion'
  code: string
  position?: { line: number; column: number }
}

export interface AnalysisResult {
  errors: Array<{
    message: string
    line: number
    column: number
    severity: 'error' | 'warning' | 'info'
  }>
  completions?: Array<{
    label: string
    kind: 'function' | 'variable' | 'keyword' | 'type'
    insertText: string
  }>
}

class AnalysisWorker {
  private worker: Worker | null = null
  private ready: boolean = false
  private messageQueue: Array<{
    task: AnalysisTask
    resolve: (result: AnalysisResult) => void
    reject: (error: Error) => void
  }> = []
  private onError: ((msg: string) => void) | null = null

  constructor(onError?: (msg: string) => void) {
    this.onError = onError
    const workerCode = `
      self.onmessage = (e) => {
        const { id, task } = e.data
        
        try {
          const result = analyze(task)
          self.postMessage({ id, result })
        } catch (error) {
          self.postMessage({ id, error: error.message })
        }
      }
      
      function analyze(task) {
        const errors = []
        const lines = task.code.split('\\n')
        
        lines.forEach((line, lineIndex) => {
          if (line.includes('println!(')) {
            const match = line.match(/println!\\(([^)]*)\\)/)
            if (match && !match[1].startsWith('"')) {
              errors.push({
                message: 'println! requires a format string',
                line: lineIndex + 1,
                column: line.indexOf('println!') + 1,
                severity: 'error'
              })
            }
          }
          
          if (line.includes('fn ') && !line.includes('(')) {
            errors.push({
              message: 'Function missing parameter list',
              line: lineIndex + 1,
              column: line.indexOf('fn ') + 1,
              severity: 'error'
            })
          }
        })
        
        let braceCount = 0
        lines.forEach((line, lineIndex) => {
          braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
        })
        
        if (braceCount !== 0) {
          errors.push({
            message: braceCount > 0 ? 'Unmatched opening brace' : 'Unmatched closing brace',
            line: lines.length,
            column: 0,
            severity: 'error'
          })
        }
        
        return { errors }
      }
    `
    
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      this.worker = new Worker(workerUrl)
      
      this.worker.onmessage = (e) => {
        const { id, result, error } = e.data
        const pending = this.messageQueue[id]
        if (pending) {
          if (error) {
            pending.reject(new Error(error))
          } else {
            pending.resolve(result)
          }
          this.messageQueue.splice(id, 1)
        }
      }
      this.worker.onerror = (e) => {
        this.onError?.(`Worker init failed: ${e.message || 'unknown'}`)
        this.ready = false
      }
      this.ready = true
    } catch (e) {
      this.onError?.(`Worker create failed: ${(e as Error).message}`)
      this.ready = false
    }
  }

  isReady(): boolean {
    return this.ready && this.worker !== null
  }

  async analyze(task: AnalysisTask): Promise<AnalysisResult> {
    if (!this.worker || !this.ready) {
      throw new Error('Worker not ready')
    }

    return new Promise((resolve, reject) => {
      const id = this.messageQueue.length
      this.messageQueue.push({ task, resolve, reject })
      this.worker!.postMessage({ id, task })
    })
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.ready = false
    }
  }
}

export class ThreadManager {
  private workers: AnalysisWorker[] = []
  private taskQueue: Array<{
    task: AnalysisTask
    resolve: (result: AnalysisResult) => void
    reject: (error: Error) => void
  }> = []
  private workerCount: number = 4
  private roundRobin: number = 0
  private onError: ((msg: string) => void) | null = null

  setErrorHandler(handler: (msg: string) => void) {
    this.onError = handler
  }

  async initialize(workerCount: number = 4): Promise<void> {
    this.workerCount = workerCount
    this.workers = []

    for (let i = 0; i < workerCount; i++) {
      const worker = new AnalysisWorker(this.onError ? (msg) => this.onError!(`Worker ${i}: ${msg}`) : undefined)
      this.workers.push(worker)
    }

    console.log(`Initialized ${workerCount} analysis workers`)
  }

  async analyze(task: AnalysisTask): Promise<AnalysisResult> {
    const readyWorkers = this.workers.filter(w => w.isReady())
    if (readyWorkers.length === 0) {
      return this.fallbackAnalyze(task)
    }

    const worker = readyWorkers[this.roundRobin % readyWorkers.length]
    this.roundRobin++

    try {
      return await worker.analyze(task)
    } catch (e) {
      console.error('Worker analysis failed:', e)
      return this.fallbackAnalyze(task)
    }
  }

  async analyzeBatch(tasks: AnalysisTask[]): Promise<AnalysisResult[]> {
    const readyWorkers = this.workers.filter(w => w.isReady())
    if (readyWorkers.length === 0) {
      return tasks.map(t => this.fallbackAnalyze(t))
    }

    const promises = tasks.map((task, index) => {
      const worker = readyWorkers[index % readyWorkers.length]
      return worker.analyze(task).catch(e => {
        console.error('Worker analysis failed:', e)
        return this.fallbackAnalyze(task)
      })
    })

    return Promise.all(promises)
  }

  private fallbackAnalyze(task: AnalysisTask): AnalysisResult {
    const errors: AnalysisResult['errors'] = []

    const lines = task.code.split('\n')
    lines.forEach((line, lineIndex) => {
      if (line.includes('println!(')) {
        const match = line.match(/println!\(([^)]*)\)/)
        if (match && !match[1].includes('"')) {
          errors.push({
            message: 'println! requires a format string',
            line: lineIndex + 1,
            column: line.indexOf('println!') + 1,
            severity: 'error'
          })
        }
      }

      if (line.includes('fn ') && !line.includes('(')) {
        errors.push({
          message: 'Function declaration missing parentheses',
          line: lineIndex + 1,
          column: line.indexOf('fn ') + 1,
          severity: 'error'
        })
      }

      const openBraces = (line.match(/{/g) || []).length
      const closeBraces = (line.match(/}/g) || []).length
      if (openBraces !== closeBraces && lineIndex === lines.length - 1) {
        errors.push({
          message: 'Unmatched braces',
          line: lineIndex + 1,
          column: line.length,
          severity: 'error'
        })
      }
    })

    if (task.type === 'completion' && task.position) {
      const line = lines[task.position.line - 1] || ''
      const beforeCursor = line.substring(0, task.position.column)
      const completions = this.getCompletions(beforeCursor)
      return { errors, completions }
    }

    return { errors }
  }

  private getCompletions(beforeCursor: string): AnalysisResult['completions'] {
    const keywords = ['fn', 'let', 'if', 'else', 'while', 'for', 'loop', 'return', 'mut', 'struct', 'enum', 'impl', 'trait']
    const builtins = ['println!', 'print!', 'vec!', 'format!', 'panic!']
    const types = ['i32', 'i64', 'f32', 'f64', 'bool', 'String', 'Vec', 'Option', 'Result']

    const completions: AnalysisResult['completions'] = []

    keywords.forEach(kw => {
      completions.push({ label: kw, kind: 'keyword', insertText: kw })
    })

    builtins.forEach(builtin => {
      completions.push({ label: builtin, kind: 'function', insertText: builtin })
    })

    types.forEach(type => {
      completions.push({ label: type, kind: 'type', insertText: type })
    })

    return completions
  }

  terminate(): void {
    this.workers.forEach(w => w.terminate())
    this.workers = []
  }

  getWorkerCount(): number {
    return this.workers.filter(w => w.isReady()).length
  }
}

export const threadManager = new ThreadManager()
