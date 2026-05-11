const DOMAINS = Array.from({ length: 24 }, (_, i) => `ide${String(i + 1).padStart(2, '0')}.irisverse.org`)

let currentDomainIndex = 0
const failedDomains = new Set<number>()

export function getNextDomain(): string {
  const availableDomains = DOMAINS.filter((_, i) => !failedDomains.has(i))
  if (availableDomains.length === 0) {
    return DOMAINS[0]
  }
  
  const domain = availableDomains[currentDomainIndex % availableDomains.length]
  currentDomainIndex++
  return domain
}

export function markDomainFailed(index: number): void {
  failedDomains.add(index)
}

export function getDomainCount(): number {
  return DOMAINS.length
}

export function getAvailableDomains(): string[] {
  return DOMAINS.filter((_, i) => !failedDomains.has(i))
}

export { DOMAINS }
