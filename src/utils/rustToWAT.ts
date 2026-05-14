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
    let body: string[] = []
    
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
      
      if (started) {
        body.push(l)
        if (braceCount === 0) break
      }
      i++
    }
    
    const watFn = this.convertFunction(fnName, params, body)
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
    let wat = `(func $${name}`
    
    params.forEach((p, i) => {
      wat += ` (param $${p} i32)`
      this.localVars.set(p, i)
    })
    
    wat += ' (result i32)\n'
    
    const bodyLines = body.slice(1, -1)
    
    // First pass: collect all local variables
    const locals: string[] = []
    for (const line of bodyLines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('let ')) {
        const letMatch = trimmed.match(/let\s+(mut\s+)?(\w+)\s*=/)
        if (letMatch) {
          const varName = letMatch[2]
          if (!this.localVars.has(varName)) {
            this.localVars.set(varName, localIndex++)
            locals.push(varName)
          }
        }
      }
    }
    
    // Declare all locals at function start
    for (const varName of locals) {
      wat += `    (local $${varName} i32)\n`
    }
    
    // Second pass: generate instructions
    const statements = this.convertBody(bodyLines, localIndex)
    wat += statements
    
    wat += '\n    i32.const 0\n  )'
    
    return wat
  }
  
  private convertBody(lines: string[], localIndex: number): string {
    let wat = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('let ')) {
        const letMatch = trimmed.match(/let\s+(mut\s+)?(\w+)\s*=\s*(.+);/)
        if (letMatch) {
          const varName = letMatch[2]
          const expr = letMatch[3]
          wat += this.convertExpression(expr)
          wat += `    local.set $${varName}\n`
        }
      } else if (trimmed.startsWith('println!')) {
        wat += this.convertPrintln(trimmed)
      } else if (trimmed.startsWith('return ')) {
        const retMatch = trimmed.match(/return\s+(.+);/)
        if (retMatch) {
          wat += this.convertExpression(retMatch[1])
        }
      } else if (trimmed.includes(' = ') && !trimmed.startsWith('let')) {
        const assignMatch = trimmed.match(/(\w+)\s*=\s*(.+);/)
        if (assignMatch) {
          const varName = assignMatch[1]
          const expr = assignMatch[2]
          wat += this.convertExpression(expr)
          wat += `    local.set $${varName}\n`
        }
      } else if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#[')) {
        wat += this.convertExpression(trimmed)
      }
    }
    
    return wat
  }
  
  private convertExpression(expr: string): string {
    expr = expr.trim()
    
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
      
      // Store the format string in data section
      const offset = this.module.data.length * 100
      this.module.data.push(`(data (i32.const ${offset}) "${format}\\00")`)
      
      let wat = ''
      // Push string offset and length for $log function
      wat += `    i32.const ${offset}\n`
      wat += `    i32.const ${format.length}\n`
      
      // Push additional arguments
      args.forEach(arg => {
        wat += this.convertExpression(arg)
      })
      
      wat += `    call $log\n`
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
        wat += `  ${fn}\n\n`
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

export const rustToWAT = new RustToWAT()
