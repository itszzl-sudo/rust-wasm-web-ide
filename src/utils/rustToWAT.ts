interface WATModule {
  types: string[]
  imports: string[]
  functions: string[]
  exports: string[]
  data: string[]
}

export class RustToWAT {
  private module: WATModule
  private functionIndex: number = 0
  private localVars: Map<string, number> = new Map()
  
  constructor() {
    this.module = {
      types: [],
      imports: [],
      functions: [],
      exports: [],
      data: []
    }
  }
  
  convert(rustCode: string): string {
    this.module = {
      types: [],
      imports: [],
      functions: [],
      exports: [],
      data: []
    }
    this.functionIndex = 0
    
    this.addDefaultImports()
    this.parseRustCode(rustCode)
    
    return this.generateWAT()
  }
  
  private addDefaultImports() {
    this.module.imports.push(
      '(import "env" "memory" (memory 1))',
      '(import "env" "log" (func $log (param i32 i32)))'
    )
  }
  
  private parseRustCode(code: string) {
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('fn ')) {
        this.parseFunction(lines, i)
      }
    }
  }
  
  private parseFunction(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    const fnMatch = line.match(/fn\s+(\w+)\s*\(([^)]*)\)/)
    
    if (!fnMatch) return startIndex
    
    const fnName = fnMatch[1]
    const params = this.parseParams(fnMatch[2])
    
    let braceCount = 0
    let i = startIndex
    let started = false
    let bodyStart = 0
    
    while (i < lines.length) {
      const l = lines[i]
      if (l.includes('{')) {
        if (!started) bodyStart = i
        started = true
        braceCount += (l.match(/{/g) || []).length
      }
      if (l.includes('}')) {
        braceCount -= (l.match(/}/g) || []).length
      }
      
      if (started && braceCount === 0) break
      i++
    }
    
    const bodyLines = lines.slice(bodyStart, i + 1)
    const watFn = this.convertFunction(fnName, params, bodyLines)
    this.module.functions.push(watFn)
    
    if (fnName === 'main' || line.includes('#[wasm_bindgen]')) {
      this.module.exports.push(`(export "${fnName}" (func $${fnName}))`)
    }
    
    return i
  }
  
  private parseParams(paramStr: string): string[] {
    if (!paramStr.trim()) return []
    return paramStr.split(',')
      .map(p => p.trim().split(':')[0].trim())
      .filter(p => p && p !== 'self')
  }
  
  private convertFunction(name: string, params: string[], body: string[]): string {
    this.localVars = new Map()
    let localIndex = params.length
    
    params.forEach((p, i) => {
      this.localVars.set(p, i)
    })
    
    // First pass: collect all local variables
    const bodyText = body.join('\n')
    this.collectLocals(bodyText, localIndex)
    
    let wat = `(func $${name}`
    
    params.forEach((p, i) => {
      wat += ` (param $${p} i32)`
    })
    
    wat += ' (result i32)\n'
    
    // Declare all locals at function start
    const locals = Array.from(this.localVars.entries())
      .filter(([_, idx]) => idx >= params.length)
      .sort((a, b) => a[1] - b[1])
    
    for (const [varName, _] of locals) {
      wat += `    (local $${varName} i32)\n`
    }
    
    // Second pass: generate instructions
    const statements = this.convertBody(body.slice(1, -1))
    wat += statements
    
    wat += '\n    i32.const 0\n  )'
    
    return wat
  }
  
  private collectLocals(code: string, localIndex: number): number {
    const letMatches = code.matchAll(/let\s+(mut\s+)?(\w+)\s*=/g)
    let idx = localIndex
    
    for (const match of letMatches) {
      const varName = match[2]
      if (!this.localVars.has(varName)) {
        this.localVars.set(varName, idx++)
      }
    }
    
    // Also collect loop variables
    const forMatches = code.matchAll(/for\s+(\w+)\s+in/g)
    for (const match of forMatches) {
      const varName = match[1]
      if (!this.localVars.has(varName)) {
        this.localVars.set(varName, idx++)
      }
    }
    
    return idx
  }
  
  private convertBody(lines: string[]): string {
    let wat = ''
    let i = 0
    
    while (i < lines.length) {
      const line = lines[i].trim()
      
      if (line.startsWith('let ')) {
        const letMatch = line.match(/let\s+(mut\s+)?(\w+)\s*=\s*(.+);/)
        if (letMatch) {
          const varName = letMatch[2]
          const expr = letMatch[3]
          wat += this.convertExpression(expr)
          wat += `    local.set $${varName}\n`
        }
      } else if (line.startsWith('println!')) {
        wat += this.convertPrintln(line)
      } else if (line.startsWith('for ')) {
        const result = this.convertForLoop(lines, i)
        wat += result.wat
        i = result.endIndex
      } else if (line.startsWith('if ')) {
        const result = this.convertIfElse(lines, i)
        wat += result.wat
        i = result.endIndex
      } else if (line.startsWith('while ')) {
        const result = this.convertWhileLoop(lines, i)
        wat += result.wat
        i = result.endIndex
      } else if (line.startsWith('return ')) {
        const retMatch = line.match(/return\s+(.+);/)
        if (retMatch) {
          wat += this.convertExpression(retMatch[1])
        }
      } else if (line.includes(' = ') && !line.startsWith('let') && line.endsWith(';')) {
        const assignMatch = line.match(/(\w+)\s*=\s*(.+);/)
        if (assignMatch) {
          const varName = assignMatch[1]
          const expr = assignMatch[2]
          wat += this.convertExpression(expr)
          wat += `    local.set $${varName}\n`
        }
      } else if (line && !line.startsWith('//') && !line.startsWith('#[') && !line.startsWith('}')) {
        if (!line.includes('{')) {
          wat += this.convertExpression(line)
        }
      }
      
      i++
    }
    
    return wat
  }
  
  private convertForLoop(lines: string[], startIndex: number): { wat: string, endIndex: number } {
    const line = lines[startIndex].trim()
    const match = line.match(/for\s+(\w+)\s+in\s+(\d+)\.\.(\d+)\s*\{/)
    
    if (!match) return { wat: '', endIndex: startIndex }
    
    const varName = match[1]
    const start = parseInt(match[2])
    const end = parseInt(match[3])
    
    // Find loop body
    let braceCount = 0
    let i = startIndex
    let started = false
    
    while (i < lines.length) {
      const l = lines[i]
      if (l.includes('{')) {
        started = true
        braceCount += (l.match(/{/g) || []).length
      }
      if (l.includes('}')) {
        braceCount -= (l.match(/}/g) || []).length
      }
      if (started && braceCount === 0) break
      i++
    }
    
    const bodyLines = lines.slice(startIndex + 1, i)
    
    let wat = ''
    wat += `    i32.const ${start}\n`
    wat += `    local.set $${varName}\n`
    wat += `    (block $for_end_${startIndex}\n`
    wat += `      (loop $for_start_${startIndex}\n`
    wat += `        local.get $${varName}\n`
    wat += `        i32.const ${end}\n`
    wat += `        i32.ge_s\n`
    wat += `        br_if $for_end_${startIndex}\n`
    
    wat += this.convertBody(bodyLines)
    
    wat += `        local.get $${varName}\n`
    wat += `        i32.const 1\n`
    wat += `        i32.add\n`
    wat += `        local.set $${varName}\n`
    wat += `        br $for_start_${startIndex}\n`
    wat += `      )\n`
    wat += `    )\n`
    
    return { wat, endIndex: i }
  }
  
  private convertIfElse(lines: string[], startIndex: number): { wat: string, endIndex: number } {
    const line = lines[startIndex].trim()
    const match = line.match(/if\s+(.+)\s*\{/)
    
    if (!match) return { wat: '', endIndex: startIndex }
    
    const condition = match[1]
    
    // Find if body
    let braceCount = 0
    let i = startIndex
    let started = false
    
    while (i < lines.length) {
      const l = lines[i]
      if (l.includes('{')) {
        started = true
        braceCount += (l.match(/{/g) || []).length
      }
      if (l.includes('}')) {
        braceCount -= (l.match(/}/g) || []).length
      }
      if (started && braceCount === 0) break
      i++
    }
    
    const ifBody = lines.slice(startIndex + 1, i)
    
    // Check for else
    let elseBody: string[] = []
    let endIndex = i
    
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim()
      if (nextLine === 'else {' || nextLine.startsWith('} else {')) {
        let j = i + 1
        braceCount = 0
        started = false
        
        while (j < lines.length) {
          const l = lines[j]
          if (l.includes('{')) {
            started = true
            braceCount += (l.match(/{/g) || []).length
          }
          if (l.includes('}')) {
            braceCount -= (l.match(/}/g) || []).length
          }
          if (started && braceCount === 0) break
          j++
        }
        
        elseBody = lines.slice(i + 2, j)
        endIndex = j
      }
    }
    
    let wat = ''
    wat += this.convertExpression(condition)
    wat += `    (if\n`
    wat += `      (then\n`
    wat += this.convertBody(ifBody)
    wat += `      )\n`
    
    if (elseBody.length > 0) {
      wat += `      (else\n`
      wat += this.convertBody(elseBody)
      wat += `      )\n`
    }
    
    wat += `    )\n`
    
    return { wat, endIndex }
  }
  
  private convertWhileLoop(lines: string[], startIndex: number): { wat: string, endIndex: number } {
    const line = lines[startIndex].trim()
    const match = line.match(/while\s+(.+)\s*\{/)
    
    if (!match) return { wat: '', endIndex: startIndex }
    
    const condition = match[1]
    
    // Find while body
    let braceCount = 0
    let i = startIndex
    let started = false
    
    while (i < lines.length) {
      const l = lines[i]
      if (l.includes('{')) {
        started = true
        braceCount += (l.match(/{/g) || []).length
      }
      if (l.includes('}')) {
        braceCount -= (l.match(/}/g) || []).length
      }
      if (started && braceCount === 0) break
      i++
    }
    
    const bodyLines = lines.slice(startIndex + 1, i)
    
    let wat = ''
    wat += `    (block $while_end_${startIndex}\n`
    wat += `      (loop $while_start_${startIndex}\n`
    wat += this.convertExpression(condition)
    wat += `        i32.eqz\n`
    wat += `        br_if $while_end_${startIndex}\n`
    wat += this.convertBody(bodyLines)
    wat += `        br $while_start_${startIndex}\n`
    wat += `      )\n`
    wat += `    )\n`
    
    return { wat, endIndex: i }
  }
  
  private convertExpression(expr: string): string {
    expr = expr.trim()
    
    if (!expr) return ''
    
    if (/^\d+$/.test(expr)) {
      return `    i32.const ${expr}\n`
    }
    
    if (expr === 'true') return '    i32.const 1\n'
    if (expr === 'false') return '    i32.const 0\n'
    
    if (expr.startsWith('"') && expr.endsWith('"')) {
      const str = expr.slice(1, -1)
      const offset = this.module.data.length * 20
      this.module.data.push(`(data (i32.const ${offset}) "${str}\\00")`)
      return `    i32.const ${offset}\n    i32.const ${str.length}\n`
    }
    
    if (this.localVars.has(expr)) {
      return `    local.get $${expr}\n`
    }
    
    if (expr.includes('(') && expr.includes(')')) {
      const callMatch = expr.match(/(\w+)\s*\(([^)]*)\)/)
      if (callMatch) {
        const fnName = callMatch[1]
        const args = callMatch[2].split(',').map(a => a.trim()).filter(a => a)
        let wat = ''
        args.forEach(arg => {
          wat += this.convertExpression(arg)
        })
        wat += `    call $${fnName}\n`
        return wat
      }
    }
    
    if (expr.includes('<') && !expr.includes('<<')) {
      const [left, right] = expr.split('<').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.lt_s\n'
    }
    if (expr.includes('>') && !expr.includes('>>') && !expr.includes('->')) {
      const [left, right] = expr.split('>').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.gt_s\n'
    }
    if (expr.includes('==')) {
      const [left, right] = expr.split('==').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.eq\n'
    }
    if (expr.includes('!=')) {
      const [left, right] = expr.split('!=').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.ne\n'
    }
    if (expr.includes('<=')) {
      const [left, right] = expr.split('<=').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.le_s\n'
    }
    if (expr.includes('>=')) {
      const [left, right] = expr.split('>=').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.ge_s\n'
    }
    
    if (expr.includes('+')) {
      const [left, right] = expr.split('+').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.add\n'
    }
    if (expr.includes('-') && !expr.startsWith('-')) {
      const [left, right] = expr.split('-').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.sub\n'
    }
    if (expr.includes('*')) {
      const [left, right] = expr.split('*').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.mul\n'
    }
    if (expr.includes('/')) {
      const [left, right] = expr.split('/').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.div_s\n'
    }
    
    return `    i32.const 0\n`
  }
  
  private convertPrintln(line: string): string {
    const match = line.match(/println!\s*\(\s*"([^"]*)"\s*(?:,\s*(.+))?\s*\)/)
    if (match) {
      const format = match[1]
      const args = match[2] ? match[2].split(',').map(a => a.trim()) : []
      
      const offset = this.module.data.length * 100
      this.module.data.push(`(data (i32.const ${offset}) "${format}\\00")`)
      
      let wat = ''
      wat += `    i32.const ${offset}\n`
      wat += `    i32.const ${format.length}\n`
      
      args.forEach(arg => {
        wat += this.convertExpression(arg)
      })
      
      wat += `    call $log\n`
      
      args.forEach(() => {
        wat += `    drop\n`
      })
      
      return wat
    }
    return ''
  }
  
  private generateWAT(): string {
    let wat = '(module\n'
    
    this.module.imports.forEach(imp => {
      wat += `  ${imp}\n`
    })
    
    if (this.module.types.length > 0) {
      wat += '\n  ;; Types\n'
      this.module.types.forEach(t => {
        wat += `  ${t}\n`
      })
    }
    
    if (this.module.functions.length > 0) {
      wat += '\n  ;; Functions\n'
      this.module.functions.forEach(fn => {
        wat += `  ${fn}\n`
      })
    }
    
    if (this.module.exports.length > 0) {
      wat += '\n  ;; Exports\n'
      this.module.exports.forEach(exp => {
        wat += `  ${exp}\n`
      })
    }
    
    if (this.module.data.length > 0) {
      wat += '\n  ;; Data\n'
      this.module.data.forEach(d => {
        wat += `  ${d}\n`
      })
    }
    
    wat += ')'
    return wat
  }
}

export function rustToWat(code: string): string {
  const converter = new RustToWAT()
  return converter.convert(code)
}
