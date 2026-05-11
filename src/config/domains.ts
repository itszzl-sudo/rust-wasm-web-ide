/**
 * 域名池配置
 * 所有域名地位平等，参与并行加载
 */

export const MAIN_DOMAIN = 'itszzl-sudo.github.io/rust-wasm-web-ide'

export const SUB_DOMAINS = [
  'ide01.irisverse.org',
  'ide02.irisverse.org',
  'ide03.irisverse.org',
  'ide04.irisverse.org',
  'ide05.irisverse.org',
  'ide06.irisverse.org',
  'ide07.irisverse.org',
  'ide08.irisverse.org',
  'ide09.irisverse.org',
  'ide10.irisverse.org',
  'ide11.irisverse.org',
  'ide12.irisverse.org',
  'ide13.irisverse.org',
  'ide14.irisverse.org',
  'ide15.irisverse.org',
  'ide16.irisverse.org',
  'ide17.irisverse.org',
  'ide18.irisverse.org',
  'ide19.irisverse.org',
  'ide20.irisverse.org',
  'ide21.irisverse.org',
  'ide22.irisverse.org',
  'ide23.irisverse.org',
  'ide24.irisverse.org',
]

// 域名池：主域名 + 所有子域名
export const DOMAINS = [MAIN_DOMAIN, ...SUB_DOMAINS]

// 域名总数
export const DOMAIN_COUNT = DOMAINS.length

// 并发数（每个域名 6 个连接）
export const MAX_CONCURRENCY = DOMAIN_COUNT * 6

/**
 * 验证域名格式
 */
export function validateDomain(domain: string): boolean {
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i
  return domainRegex.test(domain)
}

/**
 * 获取域名统计信息
 */
export function getDomainStats() {
  return {
    mainDomain: MAIN_DOMAIN,
    subDomainCount: SUB_DOMAINS.length,
    totalDomains: DOMAIN_COUNT,
    maxConcurrency: MAX_CONCURRENCY,
    allValid: DOMAINS.every(validateDomain)
  }
}
