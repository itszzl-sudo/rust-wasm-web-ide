import { DOMAINS, getNextDomain, markDomainFailed } from './multiDomainLoader'

interface LoadTask {
  url: string
  priority: number
  retries: number
}

interface LoadResult {
  url: string
  data: ArrayBuffer | null
  error: Error | null
  domain: string
  loadTime: number
}

class ParallelWasmLoader {
  private maxConcurrent: number
  private activeLoads: number = 0
  private loadQueue: LoadTask[] = []
  private results: Map<string, LoadResult> = new Map()
  private domainStats: Map<string, { success: number; failed: number; avgTime: number }> = new Map()

  constructor(maxConcurrent: number = 24) {
    this.maxConcurrent = maxConcurrent
    DOMAINS.forEach(domain => {
      this.domainStats.set(domain, { success: 0, failed: 0, avgTime: 0 })
    })
  }

  async loadParallel(urls: string[]): Promise<Map<string, ArrayBuffer>> {
    this.results.clear()
    
    const tasks: LoadTask[] = urls.map((url, index) => ({
      url,
      priority: index,
      retries: 3
    }))
    
    this.loadQueue = tasks.sort((a, b) => a.priority - b.priority)
    
    const workers: Promise<void>[] = []
    for (let i = 0; i < this.maxConcurrent; i++) {
      workers.push(this.processQueue())
    }
    
    await Promise.all(workers)
    
    const results = new Map<string, ArrayBuffer>()
    for (const [url, result] of this.results) {
      if (result.data) {
        results.set(url, result.data)
      }
    }
    
    return results
  }

  private async processQueue(): Promise<void> {
    while (this.loadQueue.length > 0 || this.activeLoads > 0) {
      const task = this.loadQueue.shift()
      if (!task) {
        await new Promise(resolve => setTimeout(resolve, 10))
        continue
      }

      this.activeLoads++
      
      try {
        await this.loadWithRetry(task)
      } finally {
        this.activeLoads--
      }
    }
  }

  private async loadWithRetry(task: LoadTask): Promise<void> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= task.retries; attempt++) {
      const domain = getNextDomain()
      
      try {
        const startTime = performance.now()
        const data = await this.fetchFromDomain(task.url, domain)
        const loadTime = performance.now() - startTime
        
        this.updateDomainStats(domain, true, loadTime)
        
        this.results.set(task.url, {
          url: task.url,
          data,
          error: null,
          domain,
          loadTime
        })
        
        return
      } catch (e) {
        lastError = e as Error
        this.updateDomainStats(domain, false, 0)
        
        const domainIndex = DOMAINS.indexOf(domain)
        if (domainIndex !== -1 && attempt > 0) {
          markDomainFailed(domainIndex)
        }
      }
    }
    
    this.results.set(task.url, {
      url: task.url,
      data: null,
      error: lastError,
      domain: '',
      loadTime: 0
    })
  }

  private async fetchFromDomain(url: string, domain: string): Promise<ArrayBuffer> {
    const fullUrl = this.buildUrl(url, domain)
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    
    try {
      const response = await fetch(fullUrl, {
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      })
      
      clearTimeout(timeout)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.arrayBuffer()
    } catch (e) {
      clearTimeout(timeout)
      throw e
    }
  }

  private buildUrl(originalUrl: string, domain: string): string {
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      const url = new URL(originalUrl)
      url.host = domain
      return url.toString()
    }
    
    return `https://${domain}${originalUrl}`
  }

  private updateDomainStats(domain: string, success: boolean, loadTime: number): void {
    const stats = this.domainStats.get(domain)
    if (!stats) return
    
    if (success) {
      stats.success++
      stats.avgTime = (stats.avgTime * (stats.success - 1) + loadTime) / stats.success
    } else {
      stats.failed++
    }
    
    this.domainStats.set(domain, stats)
  }

  getStats(): Map<string, { success: number; failed: number; avgTime: number }> {
    return new Map(this.domainStats)
  }

  getBestDomains(): string[] {
    return Array.from(this.domainStats.entries())
      .filter(([_, stats]) => stats.success > 0)
      .sort((a, b) => {
        const aScore = a[1].success / (a[1].avgTime || 1)
        const bScore = b[1].success / (b[1].avgTime || 1)
        return bScore - aScore
      })
      .map(([domain]) => domain)
  }
}

export const parallelLoader = new ParallelWasmLoader(24)

export async function loadWasmParallel(wasmUrl: string): Promise<WebAssembly.Module> {
  const results = await parallelLoader.loadParallel([wasmUrl])
  const buffer = results.get(wasmUrl)
  
  if (!buffer) {
    throw new Error(`Failed to load Wasm: ${wasmUrl}`)
  }
  
  return await WebAssembly.compile(buffer)
}

export async function loadScriptParallel(scriptUrl: string): Promise<void> {
  const results = await parallelLoader.loadParallel([scriptUrl])
  const buffer = results.get(scriptUrl)
  
  if (!buffer) {
    throw new Error(`Failed to load script: ${scriptUrl}`)
  }
  
  const text = new TextDecoder().decode(buffer)
  const script = document.createElement('script')
  script.textContent = text
  document.head.appendChild(script)
}
