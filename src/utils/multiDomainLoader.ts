// 根据用户核心数动态调整线程数
function getOptimalThreadCount(): number {
  const cores = navigator.hardwareConcurrency || 4
  return Math.min(cores, 8)
}

// 检测当前平台
function detectPlatform(): 'github' | 'cloudflare' {
  const hostname = window.location.hostname
  if (hostname.includes('github.io')) return 'github'
  if (hostname.includes('pages.dev') || hostname.includes('workers.dev')) return 'cloudflare'
  return 'github'
}

// 从 /domains.json 加载配置
let domainsCache: string[] | null = null

export async function loadDomains(): Promise<string[]> {
  if (domainsCache) {
    return domainsCache
  }
  
  const threadCount = getOptimalThreadCount()
  const platform = detectPlatform()
  
  try {
    const base = platform === 'cloudflare' ? '/' : '/rust-wasm-web-ide/'
    const response = await fetch(base + 'domains.json')
    const config = await response.json()
    
    const mainDomain = config[platform]?.mainDomain || config.mainDomain
    const allSubDomains = config.subDomains || []
    const subDomains = allSubDomains.slice(0, threadCount - 1)
    
    domainsCache = [mainDomain, ...subDomains]
    console.log(`[Domains] Platform: ${platform}, Using ${domainsCache.length} domains (cores: ${navigator.hardwareConcurrency || 'unknown'}, threadCount: ${threadCount})`)
    return domainsCache
  } catch (e) {
    console.warn('[Domains] Failed to load config, using defaults:', e)
    
    const MAIN_DOMAIN = platform === 'cloudflare' 
      ? 'rust-wasm-web-ide.pages.dev'
      : 'itszzl-sudo.github.io/rust-wasm-web-ide'
    const SUB_DOMAINS = Array.from({ length: threadCount - 1 }, (_, i) => 
      `ide${String(i + 1).padStart(2, '0')}.irisverse.org`
    )
    domainsCache = [MAIN_DOMAIN, ...SUB_DOMAINS]
    console.log(`[Domains] Platform: ${platform}, Using ${domainsCache.length} domains (cores: ${navigator.hardwareConcurrency || 'unknown'}, threadCount: ${threadCount})`)
    return domainsCache
  }
}

// 同步获取域名（需要先调用 loadDomains）
export function getDomains(): string[] {
  if (domainsCache) {
    return domainsCache
  }
  
  const threadCount = getOptimalThreadCount()
  const platform = detectPlatform()
  const MAIN_DOMAIN = platform === 'cloudflare' 
    ? 'rust-wasm-web-ide.pages.dev'
    : 'itszzl-sudo.github.io/rust-wasm-web-ide'
  const SUB_DOMAINS = Array.from({ length: threadCount - 1 }, (_, i) => 
    `ide${String(i + 1).padStart(2, '0')}.irisverse.org`
  )
  return [MAIN_DOMAIN, ...SUB_DOMAINS]
}

// 兼容旧代码
export const MAIN_DOMAIN = 'itszzl-sudo.github.io/rust-wasm-web-ide'
export const SUB_DOMAINS = Array.from({ length: 24 }, (_, i) => 
  `ide${String(i + 1).padStart(2, '0')}.irisverse.org`
)
export const DOMAINS = [MAIN_DOMAIN, ...SUB_DOMAINS]

let currentDomainIndex = 0
const failedDomains = new Set<number>()

export function getNextDomain(): string {
  const domains = getDomains()
  const availableDomains = domains.filter((_, i) => !failedDomains.has(i))
  if (availableDomains.length === 0) {
    return domains[0]
  }
  
  const domain = availableDomains[currentDomainIndex % availableDomains.length]
  currentDomainIndex++
  return domain
}

export function markDomainFailed(index: number): void {
  failedDomains.add(index)
}

export function getDomainCount(): number {
  return getDomains().length
}

export function getAvailableDomains(): string[] {
  const domains = getDomains()
  return domains.filter((_, i) => !failedDomains.has(i))
}
