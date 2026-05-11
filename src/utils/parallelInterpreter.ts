import { DOMAINS } from './multiDomainLoader'

interface WorkerMessage {
  type: 'check' | 'execute' | 'analyze'
  code: string
  taskId: string
  options?: any
}

interface WorkerResponse {
  taskId: string
  result: any
  error: string | null
  domain: string
  time: number
}

class MultiDomainInterpreterPool {
  private workers: Map<string, Worker> = new Map()
  private pendingTasks: Map<string, { resolve: Function; reject: Function }> = new Map()
  private workerUrls: Map<string, string> = new Map()
  private activeDomains: Set<string> = new Set()
  
  constructor() {
    this.initWorkers()
  }
  
  private initWorkers() {
    const workerCode = `
      let interpreterModule = null
      
      self.onmessage = async (e) => {
        const { type, code, taskId, options } = e.data
        
        try {
          if (!interpreterModule) {
            const wasmUrl = self.location.origin + '/wasm/rust_interpreter.js'
            const module = await import(wasmUrl)
            await module.default()
            interpreterModule = module
          }
          
          let result
          const startTime = performance.now()
          
          switch (type) {
            case 'check':
              result = await checkSyntax(code)
              break
            case 'execute':
              result = await interpreterModule.interpret_rust_code(code)
              break
            case 'analyze':
              result = await analyzeCode(code)
              break
            default:
              throw new Error('Unknown task type: ' + type)
          }
          
          self.postMessage({
            taskId,
            result,
            error: null,
            domain: self.location.hostname,
            time: performance.now() - startTime
          })
        } catch (e) {
          self.postMessage({
            taskId,
            result: null,
            error: e.message,
            domain: self.location.hostname,
            time: 0
          })
        }
      }
      
      async function checkSyntax(code) {
        const lines = code.split('\\n')
        const errors = []
        const warnings = []
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const lineNum = i + 1
          
          if (line.includes('fn ') && !line.includes('{')) {
            const nextLine = lines[i + 1] || ''
            if (!nextLine.trim().startsWith('{') && !line.trim().endsWith('{')) {
              errors.push({
                line: lineNum,
                column: 0,
                message: 'Function declaration missing opening brace',
                severity: 'error'
              })
            }
          }
          
          const openBraces = (line.match(/{/g) || []).length
          const closeBraces = (line.match(/}/g) || []).length
          if (openBraces !== closeBraces) {
          }
          
          if (line.includes('let ') && !line.includes('=') && !line.trim().endsWith(';')) {
            warnings.push({
              line: lineNum,
              column: 0,
              message: 'Variable declaration might be incomplete',
              severity: 'warning'
            })
          }
        }
        
        return { errors, warnings, lineCount: lines.length }
      }
      
      async function analyzeCode(code) {
        const functionPattern = /fn\\s+(\\w+)\\s*\\(([^)]*)\\)/g
        const structPattern = /struct\\s+(\\w+)/g
        const enumPattern = /enum\\s+(\\w+)/g
        const implPattern = /impl\\s+(\\w+)/g
        
        const functions = []
        const structs = []
        const enums = []
        const impls = []
        
        let match
        while ((match = functionPattern.exec(code)) !== null) {
          functions.push({
            name: match[1],
            params: match[2],
            position: match.index
          })
        }
        
        while ((match = structPattern.exec(code)) !== null) {
          structs.push({ name: match[1], position: match.index })
        }
        
        while ((match = enumPattern.exec(code)) !== null) {
          enums.push({ name: match[1], position: match.index })
        }
        
        while ((match = implPattern.exec(code)) !== null) {
          impls.push({ name: match[1], position: match.index })
        }
        
        return { functions, structs, enums, impls }
      }
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const baseWorkerUrl = URL.createObjectURL(blob)
    
    DOMAINS.forEach((domain, index) => {
      if (index < navigator.hardwareConcurrency || DOMAINS.length) {
        const workerUrl = `https://${domain}/worker.js`
        this.workerUrls.set(domain, workerUrl)
      }
    })
  }
  
  async createWorker(domain: string): Promise<Worker> {
    if (this.workers.has(domain)) {
      return this.workers.get(domain)!
    }
    
    const workerCode = `
      let interpreterModule = null
      
      self.onmessage = async (e) => {
        const { type, code, taskId, options } = e.data
        
        try {
          if (!interpreterModule) {
            const module = await import('/rust-wasm-web-ide/wasm/rust_interpreter.js')
            await module.default()
            interpreterModule = module
          }
          
          let result
          const startTime = performance.now()
          
          if (type === 'execute') {
            result = await interpreterModule.interpret_rust_code(code)
          }
          
          self.postMessage({
            taskId,
            result,
            error: null,
            domain: '${domain}',
            time: performance.now() - startTime
          })
        } catch (e) {
          self.postMessage({
            taskId,
            result: null,
            error: e.message,
            domain: '${domain}',
            time: 0
          })
        }
      }
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    
    const worker = new Worker(workerUrl)
    
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { taskId, result, error } = e.data
      const pending = this.pendingTasks.get(taskId)
      
      if (pending) {
        if (error) {
          pending.reject(new Error(error))
        } else {
          pending.resolve(result)
        }
        this.pendingTasks.delete(taskId)
      }
    }
    
    worker.onerror = (e) => {
      console.error(`Worker error on ${domain}:`, e)
    }
    
    this.workers.set(domain, worker)
    this.activeDomains.add(domain)
    
    return worker
  }
  
  async executeParallel(
    code: string,
    taskType: 'check' | 'execute' | 'analyze' = 'check',
    maxWorkers: number = 6
  ): Promise<WorkerResponse[]> {
    const availableDomains = DOMAINS.slice(0, maxWorkers)
    const taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const workers = await Promise.all(
      availableDomains.map(domain => this.createWorker(domain))
    )
    
    const promises = workers.map((worker, index) => {
      const domain = availableDomains[index]
      const currentTaskId = `${taskId}_${index}`
      
      return new Promise<WorkerResponse>((resolve, reject) => {
        this.pendingTasks.set(currentTaskId, { resolve, reject })
        
        const message: WorkerMessage = {
          type: taskType,
          code,
          taskId: currentTaskId
        }
        
        worker.postMessage(message)
      })
    })
    
    const results = await Promise.allSettled(promises)
    
    return results
      .filter((r): r is PromiseFulfilledResult<WorkerResponse> => r.status === 'fulfilled')
      .map(r => r.value)
  }
  
  async checkSyntaxParallel(code: string): Promise<any> {
    const results = await this.executeParallel(code, 'check', 6)
    
    const allErrors: any[] = []
    const allWarnings: any[] = []
    
    results.forEach(r => {
      if (r.result?.errors) allErrors.push(...r.result.errors)
      if (r.result?.warnings) allWarnings.push(...r.result.warnings)
    })
    
    return {
      errors: allErrors,
      warnings: allWarnings,
      checkedBy: results.map(r => r.domain),
      avgTime: results.reduce((sum, r) => sum + r.time, 0) / results.length
    }
  }
  
  async analyzeCodeParallel(code: string): Promise<any> {
    const results = await this.executeParallel(code, 'analyze', 6)
    
    if (results.length === 0) {
      return { functions: [], structs: [], enums: [], impls: [] }
    }
    
    const first = results[0].result
    
    return {
      ...first,
      analyzedBy: results.map(r => r.domain),
      avgTime: results.reduce((sum, r) => sum + r.time, 0) / results.length
    }
  }
  
  async executeFastest(code: string): Promise<any> {
    const results = await this.executeParallel(code, 'execute', 24)
    
    const successResults = results.filter(r => r.result && !r.error)
    
    if (successResults.length === 0) {
      throw new Error('All workers failed to execute')
    }
    
    const fastest = successResults.sort((a, b) => a.time - b.time)[0]
    
    console.log(`[ParallelExecutor] Fastest response from ${fastest.domain} in ${fastest.time}ms`)
    
    return fastest.result
  }
  
  getStats(): { activeWorkers: number; activeDomains: string[] } {
    return {
      activeWorkers: this.workers.size,
      activeDomains: Array.from(this.activeDomains)
    }
  }
  
  terminate() {
    this.workers.forEach(worker => worker.terminate())
    this.workers.clear()
    this.activeDomains.clear()
    this.pendingTasks.clear()
  }
}

export const interpreterPool = new MultiDomainInterpreterPool()

export async function parallelSyntaxCheck(code: string): Promise<any> {
  return interpreterPool.checkSyntaxParallel(code)
}

export async function parallelAnalyze(code: string): Promise<any> {
  return interpreterPool.analyzeCodeParallel(code)
}

export async function parallelExecute(code: string): Promise<any> {
  return interpreterPool.executeFastest(code)
}
