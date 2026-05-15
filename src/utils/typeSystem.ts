export interface TypeInfo {
  name: string
  kind: 'primitive' | 'struct' | 'enum' | 'trait' | 'function' | 'pointer'
  size: number
  fields?: Map<string, { type: string; offset: number }>
  variants?: Array<{ name: string; discriminant: number; hasData: boolean }>
  methods?: Map<string, { params: string[]; returnType: string }>
  typeParams?: string[]
}

export interface VariableInfo {
  name: string
  type: string
  isMutable: boolean
  isMoved: boolean
  borrowStatus: 'none' | 'immutable' | 'mutable'
  scope: number
}

export interface FunctionTypeInfo {
  name: string
  params: Array<{ name: string; type: string }>
  returnType: string
  typeParams?: string[]
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info'
  message: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  hint?: string
}

export interface Scope {
  id: number
  parent: number | null
  variables: Map<string, VariableInfo>
}

export class TypeSystem {
  private types: Map<string, TypeInfo> = new Map()
  private scopes: Map<number, Scope> = new Map()
  private currentScope: number = 0
  private scopeCounter: number = 0
  private diagnostics: Diagnostic[] = []
  private functions: Map<string, FunctionTypeInfo> = new Map()
  
  constructor() {
    this.initPrimitiveTypes()
    this.initScope()
  }
  
  private initPrimitiveTypes() {
    this.types.set('i32', { name: 'i32', kind: 'primitive', size: 4 })
    this.types.set('i64', { name: 'i64', kind: 'primitive', size: 8 })
    this.types.set('u32', { name: 'u32', kind: 'primitive', size: 4 })
    this.types.set('u64', { name: 'u64', kind: 'primitive', size: 8 })
    this.types.set('f32', { name: 'f32', kind: 'primitive', size: 4 })
    this.types.set('f64', { name: 'f64', kind: 'primitive', size: 8 })
    this.types.set('bool', { name: 'bool', kind: 'primitive', size: 1 })
    this.types.set('char', { name: 'char', kind: 'primitive', size: 4 })
    this.types.set('()', { name: '()', kind: 'primitive', size: 0 })
    
    this.types.set('String', { name: 'String', kind: 'struct', size: 24 })
    this.types.set('&str', { name: '&str', kind: 'pointer', size: 16 })
    
    this.types.set('Option', { 
      name: 'Option', 
      kind: 'enum', 
      size: 8,
      typeParams: ['T'],
      variants: [
        { name: 'Some', discriminant: 0, hasData: true },
        { name: 'None', discriminant: 1, hasData: false }
      ]
    })
    
    this.types.set('Result', { 
      name: 'Result', 
      kind: 'enum', 
      size: 8,
      typeParams: ['T', 'E'],
      variants: [
        { name: 'Ok', discriminant: 0, hasData: true },
        { name: 'Err', discriminant: 1, hasData: true }
      ]
    })
    
    this.types.set('Vec', { name: 'Vec', kind: 'struct', size: 24, typeParams: ['T'] })
    
    this.types.set('Box', { name: 'Box', kind: 'pointer', size: 4, typeParams: ['T'] })
    this.types.set('Rc', { name: 'Rc', kind: 'pointer', size: 8, typeParams: ['T'] })
    this.types.set('RefCell', { name: 'RefCell', kind: 'struct', size: 8, typeParams: ['T'] })
  }
  
  private initScope() {
    this.scopes.set(0, { id: 0, parent: null, variables: new Map() })
    this.currentScope = 0
  }
  
  pushScope() {
    const newScopeId = ++this.scopeCounter
    this.scopes.set(newScopeId, {
      id: newScopeId,
      parent: this.currentScope,
      variables: new Map()
    })
    this.currentScope = newScopeId
  }
  
  popScope() {
    const scope = this.scopes.get(this.currentScope)
    if (scope && scope.parent !== null) {
      this.currentScope = scope.parent
    }
  }
  
  declareVariable(name: string, type: string, isMutable: boolean = false, line: number = 0) {
    const scope = this.scopes.get(this.currentScope)
    if (scope) {
      const existingVar = scope.variables.get(name)
      if (existingVar) {
        this.addError(`变量 \`${name}\` 已在此作用域中声明`, line, 0)
        return
      }
      
      scope.variables.set(name, {
        name,
        type,
        isMutable,
        isMoved: false,
        borrowStatus: 'none',
        scope: this.currentScope
      })
    }
  }
  
  lookupVariable(name: string): VariableInfo | null {
    let scopeId: number | null = this.currentScope
    
    while (scopeId !== null) {
      const scope = this.scopes.get(scopeId)
      if (scope) {
        const varInfo = scope.variables.get(name)
        if (varInfo) return varInfo
        scopeId = scope.parent
      } else {
        break
      }
    }
    
    return null
  }
  
  checkMove(name: string, line: number): boolean {
    const varInfo = this.lookupVariable(name)
    if (!varInfo) {
      this.addError(`找不到变量 \`${name}\``, line, 0)
      return false
    }
    
    if (varInfo.isMoved) {
      this.addError(`使用已移动的值: \`${name}\``, line, 0, 
        `值在移动后不能再使用`)
      return false
    }
    
    const type = this.types.get(varInfo.type)
    if (type && type.kind !== 'primitive' && !this.isCopyType(varInfo.type)) {
      varInfo.isMoved = true
    }
    
    return true
  }
  
  private isCopyType(typeName: string): boolean {
    const copyTypes = new Set(['i32', 'i64', 'u32', 'u64', 'f32', 'f64', 'bool', 'char', '()'])
    return copyTypes.has(typeName)
  }
  
  checkBorrow(name: string, isMutable: boolean, line: number): boolean {
    const varInfo = this.lookupVariable(name)
    if (!varInfo) {
      this.addError(`找不到变量 \`${name}\``, line, 0)
      return false
    }
    
    if (isMutable && !varInfo.isMutable) {
      this.addError(`不能将不可变变量 \`${name}\` 借用为可变`, line, 0,
        `尝试使用 \`&mut ${name}\`，但 \`${name}\` 未声明为 mutable`)
      return false
    }
    
    if (varInfo.borrowStatus === 'mutable') {
      this.addError(`不能借用 \`${name}\`，因为它已被可变借用`, line, 0)
      return false
    }
    
    if (isMutable && varInfo.borrowStatus === 'immutable') {
      this.addError(`不能将 \`${name}\` 可变借用，因为它已被不可变借用`, line, 0)
      return false
    }
    
    return true
  }
  
  inferType(expr: string): string {
    expr = expr.trim()
    
    if (/^-?\d+$/.test(expr)) return 'i32'
    if (/^-?\d+\.\d+$/.test(expr)) return 'f64'
    if (expr === 'true' || expr === 'false') return 'bool'
    if (/^'.*'$/.test(expr)) return 'char'
    if (/^".*"$/.test(expr)) return '&str'
    
    if (expr.startsWith('Some(')) return 'Option'
    if (expr.startsWith('None')) return 'Option'
    if (expr.startsWith('Ok(')) return 'Result'
    if (expr.startsWith('Err(')) return 'Result'
    if (expr.startsWith('Box::new(')) return 'Box'
    if (expr.startsWith('Rc::new(')) return 'Rc'
    if (expr.startsWith('RefCell::new(')) return 'RefCell'
    if (expr.startsWith('vec![')) return 'Vec'
    if (expr.startsWith('String::from(')) return 'String'
    
    if (expr.startsWith('&mut ')) {
      const inner = expr.slice(5).trim()
      const innerType = this.inferType(inner)
      return `&mut ${innerType}`
    }
    
    if (expr.startsWith('&')) {
      const inner = expr.slice(1).trim()
      const innerType = this.inferType(inner)
      return `&${innerType}`
    }
    
    if (expr.startsWith('*')) {
      const inner = expr.slice(1).trim()
      const innerType = this.inferType(inner)
      const pointerType = this.types.get(innerType)
      if (pointerType && pointerType.kind === 'pointer') {
        return pointerType.typeParams?.[0] || 'i32'
      }
      return innerType
    }
    
    const varInfo = this.lookupVariable(expr)
    if (varInfo) return varInfo.type
    
    const arrayMatch = expr.match(/^\[(.*)\]$/)
    if (arrayMatch) {
      const elements = arrayMatch[1].split(',').map(e => e.trim()).filter(e => e)
      if (elements.length > 0) {
        const elemType = this.inferType(elements[0])
        return `[${elemType}; ${elements.length}]`
      }
      return '[()]'
    }
    
    const tupleMatch = expr.match(/^\((.*)\)$/)
    if (tupleMatch && !expr.includes('(') || expr.lastIndexOf('(') === 0) {
      const elements = tupleMatch[1].split(',').map(e => e.trim()).filter(e => e)
      const types = elements.map(e => this.inferType(e))
      return `(${types.join(', ')})`
    }
    
    if (expr.includes('(') && expr.includes(')')) {
      const callMatch = expr.match(/^(\w+)\s*\(/)
      if (callMatch) {
        const fnName = callMatch[1]
        const fnType = this.functions.get(fnName)
        if (fnType) return fnType.returnType
      }
    }
    
    if (expr.includes('.')) {
      const parts = expr.split('.')
      const baseExpr = parts[0]
      const methodName = parts[1].replace('()', '')
      
      const baseType = this.inferType(baseExpr)
      const typeInfo = this.types.get(baseType)
      if (typeInfo && typeInfo.methods) {
        const method = typeInfo.methods.get(methodName)
        if (method) return method.returnType
      }
      
      if (methodName === 'len') return 'usize'
      if (methodName === 'clone') return baseType
    }
    
    return 'unknown'
  }
  
  checkAssignment(left: string, right: string, line: number): boolean {
    const leftVar = this.lookupVariable(left)
    if (!leftVar) {
      this.addError(`找不到变量 \`${left}\``, line, 0)
      return false
    }
    
    if (!leftVar.isMutable) {
      this.addError(`不能对不可变变量 \`${left}\` 赋值`, line, 0,
        `尝试声明为 \`let mut ${left}\``)
      return false
    }
    
    const rightType = this.inferType(right)
    if (!this.typeEquals(leftVar.type, rightType)) {
      this.addError(`类型不匹配：期望 \`${leftVar.type}\`，找到 \`${rightType}\``, line, 0)
      return false
    }
    
    return true
  }
  
  private typeEquals(a: string, b: string): boolean {
    if (a === b) return true
    if (a === 'unknown' || b === 'unknown') return true
    
    const primitiveEquivalents = new Set([
      ['i32', 'isize'],
      ['u32', 'usize'],
      ['i32', 'i8'], ['i32', 'i16'],
      ['u32', 'u8'], ['u32', 'u16']
    ])
    
    for (const [t1, t2] of primitiveEquivalents) {
      if ((a === t1 && b === t2) || (a === t2 && b === t1)) return true
    }
    
    return false
  }
  
  declareStruct(name: string, fields: Array<{ name: string; type: string }>) {
    const fieldMap = new Map<string, { type: string; offset: number }>()
    let offset = 0
    let size = 0
    
    fields.forEach(field => {
      fieldMap.set(field.name, { type: field.type, offset })
      const fieldType = this.types.get(field.type)
      const fieldSize = fieldType ? fieldType.size : 4
      offset += fieldSize
      size += fieldSize
    })
    
    this.types.set(name, {
      name,
      kind: 'struct',
      size,
      fields: fieldMap
    })
  }
  
  declareEnum(name: string, variants: Array<{ name: string; hasData: boolean; dataType?: string }>) {
    const enumVariants = variants.map((v, i) => ({
      name: v.name,
      discriminant: i,
      hasData: v.hasData
    }))
    
    const hasDataVariant = variants.find(v => v.hasData)
    const dataSize = hasDataVariant?.dataType ? 
      (this.types.get(hasDataVariant.dataType)?.size || 4) : 0
    
    this.types.set(name, {
      name,
      kind: 'enum',
      size: 4 + dataSize,
      variants: enumVariants
    })
  }
  
  declareFunction(name: string, params: Array<{ name: string; type: string }>, returnType: string) {
    this.functions.set(name, {
      name,
      params,
      returnType
    })
  }
  
  private addError(message: string, line: number, column: number, hint?: string) {
    this.diagnostics.push({
      severity: 'error',
      message,
      line,
      column,
      hint
    })
  }
  
  private addWarning(message: string, line: number, column: number) {
    this.diagnostics.push({
      severity: 'warning',
      message,
      line,
      column
    })
  }
  
  getDiagnostics(): Diagnostic[] {
    return [...this.diagnostics]
  }
  
  clearDiagnostics() {
    this.diagnostics = []
  }
  
  getType(name: string): TypeInfo | undefined {
    return this.types.get(name)
  }
  
  getAllTypes(): Map<string, TypeInfo> {
    return this.types
  }
  
  analyze(code: string): Diagnostic[] {
    this.clearDiagnostics()
    
    const lines = code.split('\n')
    
    lines.forEach((line, lineNum) => {
      const trimmed = line.trim()
      
      const letMatch = trimmed.match(/let\s+(mut\s+)?(\w+)\s*(?::\s*(\w+))?\s*=\s*(.+);/)
      if (letMatch) {
        const isMutable = !!letMatch[1]
        const varName = letMatch[2]
        let varType = letMatch[3]
        const initExpr = letMatch[4]
        
        if (!varType) {
          varType = this.inferType(initExpr)
        }
        
        this.declareVariable(varName, varType, isMutable, lineNum + 1)
      }
      
      const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+);$/)
      if (assignMatch && !trimmed.startsWith('let')) {
        const varName = assignMatch[1]
        const expr = assignMatch[2]
        this.checkAssignment(varName, expr, lineNum + 1)
      }
      
      const moveMatch = trimmed.match(/(\w+)\s*=\s*(\w+);/)
      if (moveMatch && !trimmed.startsWith('let')) {
        const rightVar = moveMatch[2]
        this.checkMove(rightVar, lineNum + 1)
      }
    })
    
    return this.getDiagnostics()
  }
}
