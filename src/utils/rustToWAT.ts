interface WATModule {
  types: string[]
  imports: string[]
  functions: string[]
  exports: string[]
  data: string[]
}

interface StructField {
  name: string
  type: string
  offset: number
}

interface StructDef {
  name: string
  fields: StructField[]
  size: number
}

interface EnumVariant {
  name: string
  discriminant: number
  hasData: boolean
  dataType?: string
}

interface EnumDef {
  name: string
  variants: EnumVariant[]
}

interface ClosureDef {
  id: number
  params: string[]
  body: string
  capturedVars: string[]
}

interface ModuleDef {
  name: string
  functions: string[]
  structs: string[]
  enums: string[]
}

interface UseAlias {
  originalPath: string
  alias: string
}

interface GenericInstance {
  baseName: string
  typeParams: string[]
  concreteTypes: string[]
}

interface ResultType {
  tag: number  // 0 = Ok, 1 = Err
  value: number
}

interface TypeAlias {
  name: string
  target: string
}

interface AssociatedType {
  traitName: string
  typeName: string
  concreteType: string
}

interface SmartPointerDef {
  type: 'Box' | 'Rc' | 'RefCell'
  innerType: string
  address: number
  refCount?: number
}

interface TraitMethod {
  name: string
  params: string[]
  returnType: string
}

interface TraitDef {
  name: string
  methods: TraitMethod[]
}

interface TraitImpl {
  traitName: string
  typeName: string
  methods: Map<string, string>
}

interface VTable {
  traitName: string
  typeName: string
  methodPointers: Map<string, number>
}

interface OperatorOverload {
  operator: string
  traitName: string
  leftType: string
  rightType: string
  methodName: string
}

interface MacroRule {
  pattern: string
  replacement: string
}

interface MacroDef {
  name: string
  rules: MacroRule[]
}

export class RustToWAT {
  private module: WATModule
  private functionIndex: number = 0
  private localVars: Map<string, number> = new Map()
  private structDefs: Map<string, StructDef> = new Map()
  private enumDefs: Map<string, EnumDef> = new Map()
  private memoryOffset: number = 0
  private heapPointer: number = 1024
  private closures: Map<string, ClosureDef> = new Map()
  private closureCounter: number = 0
  private moduleDefs: Map<string, ModuleDef> = new Map()
  private useAliases: Map<string, UseAlias> = new Map()
  private currentModule: string = ''
  private pubItems: Set<string> = new Set()
  private genericInstances: Map<string, GenericInstance> = new Map()
  private typeParamMappings: Map<string, string> = new Map()
  private typeAliases: Map<string, TypeAlias> = new Map()
  private associatedTypes: Map<string, AssociatedType> = new Map()
  private smartPointers: Map<string, SmartPointerDef> = new Map()
  private traitDefs: Map<string, TraitDef> = new Map()
  private traitImpls: Map<string, TraitImpl> = new Map()
  private vtables: Map<string, VTable> = new Map()
  private dynTraitVars: Map<string, string> = new Map()
  private operatorOverloads: Map<string, OperatorOverload> = new Map()
  private macroDefs: Map<string, MacroDef> = new Map()
  
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
    this.structDefs = new Map()
    this.enumDefs = new Map()
    this.memoryOffset = 0
    this.heapPointer = 1024
    this.closures = new Map()
    this.closureCounter = 0
    this.moduleDefs = new Map()
    this.useAliases = new Map()
    this.currentModule = ''
    this.pubItems = new Set()
    this.genericInstances = new Map()
    this.typeParamMappings = new Map()
    this.typeAliases = new Map()
    this.associatedTypes = new Map()
    
    this.addDefaultImports()
    this.parseDefinitions(rustCode)
    this.parseRustCode(rustCode)
    
    return this.generateWAT()
  }
  
  private parseDefinitions(code: string) {
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Parse pub items
      if (line.startsWith('pub ')) {
        const pubLine = line.slice(4).trim()
        if (pubLine.startsWith('fn ')) {
          const match = pubLine.match(/fn\s+(\w+)/)
          if (match) this.pubItems.add(match[1])
        } else if (pubLine.startsWith('struct ')) {
          const match = pubLine.match(/struct\s+(\w+)/)
          if (match) this.pubItems.add(match[1])
        } else if (pubLine.startsWith('enum ')) {
          const match = pubLine.match(/enum\s+(\w+)/)
          if (match) this.pubItems.add(match[1])
        } else if (pubLine.startsWith('type ')) {
          const match = pubLine.match(/type\s+(\w+)/)
          if (match) this.pubItems.add(match[1])
        }
      }
      
      if (line.startsWith('struct ') || line.startsWith('pub struct ')) {
        this.parseStruct(lines, i)
      } else if (line.startsWith('#[derive(')) {
        this.parseDeriveAttribute(lines, i)
      } else if (line.startsWith('enum ') || line.startsWith('pub enum ')) {
        this.parseEnum(lines, i)
      } else if (line.startsWith('mod ')) {
        this.parseModule(lines, i)
      } else if (line.startsWith('use ')) {
        this.parseUse(line)
      } else if (line.startsWith('type ') || line.startsWith('pub type ')) {
        this.parseTypeAlias(line)
      } else if (line.startsWith('trait ')) {
        this.parseTrait(lines, i)
      } else if (line.startsWith('impl ') && line.includes(' for ')) {
        this.parseTraitImpl(lines, i)
      } else if (line.startsWith('macro_rules! ')) {
        this.parseMacroRules(lines, i)
      }
    }
  }
  
  private parseTypeAlias(line: string) {
    // type Name = Target;
    // type Point = (i32, i32);
    const match = line.match(/(?:pub\s+)?type\s+(\w+)\s*=\s*([^;]+);/)
    if (match) {
      const name = match[1]
      const target = match[2].trim()
      this.typeAliases.set(name, { name, target })
    }
  }
  
  private resolveType(typeName: string): string {
    // Resolve type aliases
    const alias = this.typeAliases.get(typeName)
    if (alias) {
      return this.resolveType(alias.target)
    }
    return typeName
  }
  
  private parseTrait(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    // trait Name { ... }
    const match = line.match(/trait\s+(\w+)(?:<([^>]+)>)?\s*\{?/)
    
    if (!match) return startIndex
    
    const traitName = match[1]
    const typeParams = match[2] ? match[2].split(',').map(t => t.trim()) : []
    const methods: TraitMethod[] = []
    
    let braceCount = 0
    let started = false
    let i = startIndex
    
    while (i < lines.length) {
      const l = lines[i]
      if (l.includes('{')) {
        started = true
        braceCount += (l.match(/{/g) || []).length
      }
      if (l.includes('}')) {
        braceCount -= (l.match(/}/g) || []).length
      }
      
      if (started && braceCount > 0) {
        const trimmed = l.trim()
        // Parse associated types: type Item;
        const assocMatch = trimmed.match(/type\s+(\w+);/)
        if (assocMatch) {
          const typeName = assocMatch[1]
          this.associatedTypes.set(`${traitName}::${typeName}`, {
            traitName,
            typeName,
            concreteType: ''
          })
        }
        
        // Parse trait methods: fn method_name(&self, params) -> ReturnType;
        const methodMatch = trimmed.match(/fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\w+))?;?/)
        if (methodMatch) {
          const methodName = methodMatch[1]
          const paramsStr = methodMatch[2]
          const returnType = methodMatch[3] || 'void'
          const params = paramsStr.split(',').map(p => p.trim()).filter(p => p && p !== '&self' && p !== '&mut self')
          methods.push({ name: methodName, params, returnType })
        }
      }
      
      if (started && braceCount === 0) break
      i++
    }
    
    this.traitDefs.set(traitName, { name: traitName, methods })
    
    return i
  }
  
  private parseTraitImpl(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    // impl TraitName for TypeName { ... }
    const match = line.match(/impl\s+(\w+)\s+for\s+(\w+)\s*\{?/)
    
    if (!match) return startIndex
    
    const traitName = match[1]
    const typeName = match[2]
    const methods = new Map<string, string>()
    
    let braceCount = 0
    let started = false
    let i = startIndex
    
    while (i < lines.length) {
      const l = lines[i]
      if (l.includes('{')) {
        started = true
        braceCount += (l.match(/{/g) || []).length
      }
      if (l.includes('}')) {
        braceCount -= (l.match(/}/g) || []).length
      }
      
      if (started && braceCount > 0) {
        const trimmed = l.trim()
        // Parse impl methods: fn method_name(&self, params) { ... }
        const methodMatch = trimmed.match(/fn\s+(\w+)\s*\(/)
        if (methodMatch) {
          const methodName = methodMatch[1]
          methods.set(methodName, `${typeName}_${methodName}`)
        }
      }
      
      if (started && braceCount === 0) break
      i++
    }
    
    const implKey = `${traitName}_for_${typeName}`
    this.traitImpls.set(implKey, { traitName, typeName, methods })
    
    // Generate vtable for this impl
    this.generateVTable(traitName, typeName, methods)
    
    // Register operator overloads
    this.registerOperatorOverloads(traitName, typeName, methods)
    
    return i
  }
  
  private registerOperatorOverloads(traitName: string, typeName: string, methods: Map<string, string>) {
    const operatorTraits: Record<string, { operator: string, method: string }> = {
      'Add': { operator: '+', method: 'add' },
      'Sub': { operator: '-', method: 'sub' },
      'Mul': { operator: '*', method: 'mul' },
      'Div': { operator: '/', method: 'div' },
      'Rem': { operator: '%', method: 'rem' },
      'BitAnd': { operator: '&', method: 'bitand' },
      'BitOr': { operator: '|', method: 'bitor' },
      'BitXor': { operator: '^', method: 'bitxor' },
      'Shl': { operator: '<<', method: 'shl' },
      'Shr': { operator: '>>', method: 'shr' },
      'Neg': { operator: '-', method: 'neg' },
      'Not': { operator: '!', method: 'not' },
      'PartialEq': { operator: '==', method: 'eq' },
      'PartialOrd': { operator: '<', method: 'partial_cmp' }
    }
    
    const opTrait = operatorTraits[traitName]
    if (opTrait) {
      const implMethod = methods.get(opTrait.method)
      if (implMethod) {
        const key = `${typeName}_${opTrait.operator}`
        this.operatorOverloads.set(key, {
          operator: opTrait.operator,
          traitName,
          leftType: typeName,
          rightType: typeName,
          methodName: implMethod
        })
      }
    }
  }
  
  private generateVTable(traitName: string, typeName: string, methods: Map<string, string>) {
    const traitDef = this.traitDefs.get(traitName)
    if (!traitDef) return
    
    const methodPointers = new Map<string, number>()
    traitDef.methods.forEach(method => {
      const implMethodName = methods.get(method.name)
      if (implMethodName) {
        methodPointers.set(method.name, this.functionIndex)
        this.functionIndex++
      }
    })
    
    const vtableKey = `${traitName}_${typeName}`
    this.vtables.set(vtableKey, { traitName, typeName, methodPointers })
  }
  
  private parseStruct(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    // Match: struct Name<T> or struct Name
    const match = line.match(/struct\s+(\w+)(?:<([^>]+)>)?\s*\{?/)
    
    if (!match) return startIndex
    
    const structName = match[1]
    const typeParams = match[2] ? match[2].split(',').map(t => t.trim()) : []
    const fields: StructField[] = []
    let offset = 0
    let i = startIndex + 1
    
    while (i < lines.length) {
      const l = lines[i].trim()
      
      if (l === '}' || l.startsWith('}')) break
      if (l.startsWith('//') || !l) {
        i++
        continue
      }
      
      const fieldMatch = l.match(/(\w+)\s*:\s*(\w+)/)
      if (fieldMatch) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2],
          offset: offset
        })
        offset += 4
      }
      
      i++
    }
    
    // Store struct definition with type parameters
    this.structDefs.set(structName, {
      name: structName,
      fields,
      size: offset
    })
    
    // If generic, store type parameters
    if (typeParams.length > 0) {
      this.genericInstances.set(structName, {
        baseName: structName,
        typeParams,
        concreteTypes: []
      })
    }
    
    return i
  }
  
  private parseEnum(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    const match = line.match(/enum\s+(\w+)\s*\{?/)
    
    if (!match) return startIndex
    
    const enumName = match[1]
    const variants: EnumVariant[] = []
    let discriminant = 0
    let i = startIndex + 1
    
    while (i < lines.length) {
      const l = lines[i].trim()
      
      if (l === '}' || l.startsWith('}')) break
      if (l.startsWith('//') || !l) {
        i++
        continue
      }
      
      const variantMatch = l.match(/(\w+)(?:\(([^)]+)\))?,?/)
      if (variantMatch) {
        variants.push({
          name: variantMatch[1],
          discriminant: discriminant++,
          hasData: !!variantMatch[2],
          dataType: variantMatch[2]?.trim()
        })
      }
      
      i++
    }
    
    this.enumDefs.set(enumName, {
      name: enumName,
      variants
    })
    
    return i
  }
  
  private addDefaultImports() {
    this.module.imports.push(
      '(import "env" "memory" (memory 1))',
      '(import "env" "log" (func $log (param i32 i32)))'
    )
  }
  
  private parseModule(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    const match = line.match(/mod\s+(\w+)\s*\{?/)
    
    if (!match) return startIndex
    
    const moduleName = match[1]
    const functions: string[] = []
    const structs: string[] = []
    const enums: string[] = []
    
    let braceCount = 0
    let started = false
    let i = startIndex
    
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
        const trimmed = l.trim()
        if (trimmed.startsWith('fn ')) {
          const fnMatch = trimmed.match(/fn\s+(\w+)/)
          if (fnMatch) functions.push(fnMatch[1])
        } else if (trimmed.startsWith('struct ')) {
          const structMatch = trimmed.match(/struct\s+(\w+)/)
          if (structMatch) structs.push(structMatch[1])
        } else if (trimmed.startsWith('enum ')) {
          const enumMatch = trimmed.match(/enum\s+(\w+)/)
          if (enumMatch) enums.push(enumMatch[1])
        }
      }
      
      if (started && braceCount === 0) break
      i++
    }
    
    this.moduleDefs.set(moduleName, {
      name: moduleName,
      functions,
      structs,
      enums
    })
    
    return i
  }
  
  private parseUse(line: string) {
    // use crate::module::item;
    // use module::item as alias;
    // use module::*;
    const match = line.match(/use\s+([^;]+);/)
    if (!match) return
    
    const usePath = match[1].trim()
    
    // Handle: use path::item as alias
    const aliasMatch = usePath.match(/(.+)\s+as\s+(\w+)/)
    if (aliasMatch) {
      const originalPath = aliasMatch[1].trim()
      const alias = aliasMatch[2]
      this.useAliases.set(alias, {
        originalPath,
        alias
      })
      return
    }
    
    // Handle: use path::item
    const parts = usePath.split('::')
    if (parts.length > 0 && parts[parts.length - 1] !== '*') {
      const item = parts[parts.length - 1]
      this.useAliases.set(item, {
        originalPath: usePath,
        alias: item
      })
    }
  }
  
  private resolvePath(path: string): string {
    // Check if it's a use alias
    const alias = this.useAliases.get(path)
    if (alias) {
      const parts = alias.originalPath.split('::')
      return parts[parts.length - 1]
    }
    
    // Check module path
    if (path.includes('::')) {
      const parts = path.split('::')
      return parts[parts.length - 1]
    }
    
    return path
  }
  
  private mangleGenericName(baseName: string, concreteTypes: string[]): string {
    if (concreteTypes.length === 0) return baseName
    return `${baseName}_${concreteTypes.join('_')}`
  }
  
  private parseGenericCall(expr: string): { baseName: string; concreteTypes: string[] } | null {
    // Match: func_name::<Type>()
    const match = expr.match(/(\w+)::<(?:([^,>]+)\s*,?\s*)+>\s*\(/)
    if (match) {
      const baseName = match[1]
      const typeParams = expr.match(/<([^>]+)>/)
      if (typeParams) {
        const concreteTypes = typeParams[1].split(',').map(t => t.trim())
        return { baseName, concreteTypes }
      }
    }
    
    // Match: func_name<Type>() (without ::)
    const match2 = expr.match(/(\w+)<([^>]+)>\s*\(/)
    if (match2) {
      const baseName = match2[1]
      const concreteTypes = match2[2].split(',').map(t => t.trim())
      return { baseName, concreteTypes }
    }
    
    return null
  }
  
  private parseRustCode(code: string) {
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('fn ') || line.startsWith('pub fn ')) {
        this.parseFunction(lines, i)
      } else if (line.startsWith('impl ')) {
        this.parseImpl(lines, i)
      } else if (line.startsWith('mod ')) {
        this.parseModuleContent(lines, i)
      }
    }
  }
  
  private parseModuleContent(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    const match = line.match(/mod\s+(\w+)\s*\{?/)
    
    if (!match) return startIndex
    
    const moduleName = match[1]
    const previousModule = this.currentModule
    this.currentModule = moduleName
    
    let braceCount = 0
    let started = false
    let i = startIndex
    
    while (i < lines.length) {
      const l = lines[i]
      if (l.includes('{')) {
        if (!started) started = true
        braceCount += (l.match(/{/g) || []).length
      }
      if (l.includes('}')) {
        braceCount -= (l.match(/}/g) || []).length
      }
      
      if (started && braceCount > 0) {
        const trimmed = l.trim()
        if (trimmed.startsWith('fn ') || trimmed.startsWith('pub fn ')) {
          this.parseFunction(lines, i)
        } else if (trimmed.startsWith('struct ') || trimmed.startsWith('pub struct ')) {
          this.parseStruct(lines, i)
        } else if (trimmed.startsWith('enum ') || trimmed.startsWith('pub enum ')) {
          this.parseEnum(lines, i)
        } else if (trimmed.startsWith('impl ')) {
          this.parseImpl(lines, i)
        }
      }
      
      if (started && braceCount === 0) break
      i++
    }
    
    this.currentModule = previousModule
    return i
  }
  
  private parseImpl(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    const match = line.match(/impl\s+(?:(\w+)\s+for\s+)?(\w+)\s*\{?/)
    
    if (!match) return startIndex
    
    const traitName = match[1]
    const typeName = match[2]
    
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
    
    const implBody = lines.slice(startIndex + 1, i)
    
    for (const bodyLine of implBody) {
      const trimmed = bodyLine.trim()
      if (trimmed.startsWith('fn ')) {
        const fnMatch = trimmed.match(/fn\s+(\w+)\s*\(([^)]*)\)/)
        if (fnMatch) {
          const methodName = fnMatch[1]
          const fullName = `${typeName}_${methodName}`
          const params = fnMatch[2]
          
          this.module.functions.push(`  ;; Method ${typeName}.${methodName}\n`)
        }
      }
    }
    
    return i
  }
  
  private parseFunction(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    // Match: fn name<T>(params) or fn name(params)
    const fnMatch = line.match(/(?:pub\s+)?fn\s+(\w+)(?:<([^>]+)>)?\s*\(([^)]*)\)/)
    
    if (!fnMatch) return startIndex
    
    let fnName = fnMatch[1]
    const typeParams = fnMatch[2] ? fnMatch[2].split(',').map(t => t.trim()) : []
    const params = this.parseParams(fnMatch[3])
    
    // Store type parameter mappings for this function
    if (typeParams.length > 0) {
      typeParams.forEach(tp => {
        this.typeParamMappings.set(`${fnName}_${tp}`, tp)
      })
    }
    
    // Add module prefix if inside a module
    if (this.currentModule) {
      fnName = `${this.currentModule}_${fnName}`
    }
    
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
    
    // Export main function or pub functions
    const originalName = fnMatch[1]
    if (originalName === 'main' || line.includes('#[wasm_bindgen]')) {
      this.module.exports.push(`(export "${originalName}" (func $${fnName}))`)
    } else if (line.startsWith('pub fn ') && !this.currentModule) {
      // Export pub functions at crate level
      this.module.exports.push(`(export "${originalName}" (func $${fnName}))`)
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
        const letMatch = line.match(/let\s+(mut\s+)?(.+)\s*=\s*(.+);/)
        if (letMatch) {
          const pattern = letMatch[2]
          const expr = letMatch[3]
          
          // Check if pattern is destructuring
          if (pattern.includes(',') || pattern.includes('{') || pattern.includes('[')) {
            // Destructuring assignment
            wat += this.convertDestructuring(pattern, expr)
          } else if (expr.trim().startsWith('|') && expr.trim().indexOf('|', 1) > 0) {
            // Closure assignment
            wat += this.convertClosureAssignment(pattern.trim(), expr.trim())
          } else {
            // Check for smart pointer types
            const varName = pattern.trim()
            if (expr.trim().startsWith('Box::new(')) {
              this.smartPointers.set(varName, { type: 'Box', innerType: 'i32', address: this.heapPointer })
            } else if (expr.trim().startsWith('Rc::new(')) {
              this.smartPointers.set(varName, { type: 'Rc', innerType: 'i32', address: this.heapPointer, refCount: 1 })
            } else if (expr.trim().startsWith('RefCell::new(')) {
              this.smartPointers.set(varName, { type: 'RefCell', innerType: 'i32', address: this.heapPointer })
            }
            
            // Simple let
            wat += this.convertExpression(expr)
            wat += `    local.set $${varName}\n`
          }
        }
      } else if (line.startsWith('println!')) {
        wat += this.convertPrintln(line)
      } else if (line.startsWith('panic!')) {
        wat += this.convertPanic(line)
      } else if (line.startsWith('vec!')) {
        wat += this.convertVec(line)
      } else if (line.startsWith('format!')) {
        wat += this.convertFormat(line)
      } else if (line.endsWith('!') && line.includes('(')) {
        // Generic macro invocation: macro_name!(args)
        const macroMatch = line.match(/(\w+)!\(([^)]*)\)/)
        if (macroMatch) {
          const macroName = macroMatch[1]
          const args = macroMatch[2].split(',').map(a => a.trim()).filter(a => a)
          
          // Check if it's a user-defined macro
          if (this.macroDefs.has(macroName)) {
            const expanded = this.expandMacro(macroName, args)
            if (expanded) {
              wat += this.convertExpression(expanded)
            }
          }
        }
      } else if (line.startsWith('match ')) {
        const result = this.convertMatch(lines, i)
        wat += result.wat
        i = result.endIndex
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
      } else if (line === 'loop {') {
        const result = this.convertLoop(lines, i)
        wat += result.wat
        i = result.endIndex
      } else if (line.startsWith('if let ')) {
        const result = this.convertIfLet(lines, i)
        wat += result.wat
        i = result.endIndex
      } else if (line.startsWith('while let ')) {
        const result = this.convertWhileLet(lines, i)
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
      } else if (line.match(/^\w+\s*(\+=|-=|\*=|\/=|%=&)/)) {
        wat += this.convertCompoundAssignment(line)
      } else if (line === 'break;') {
        wat += `    br $for_end_${startIndex}\n`
      } else if (line === 'continue;') {
        wat += `    br $for_start_${startIndex}\n`
      } else if (line && !line.startsWith('//') && !line.startsWith('#[') && !line.startsWith('}')) {
        if (!line.includes('{')) {
          wat += this.convertExpression(line)
        }
      }
      
      i++
    }
    
    return wat
  }
  
  private convertCompoundAssignment(line: string): string {
    const match = line.match(/(\w+)\s*(\+=|-=|\*=|\/=|%=)\s*(.+);/)
    if (!match) return ''
    
    const varName = match[1]
    const op = match[2]
    const expr = match[3]
    
    let wat = ''
    wat += `    local.get $${varName}\n`
    wat += this.convertExpression(expr)
    
    switch (op) {
      case '+=': wat += '    i32.add\n'; break
      case '-=': wat += '    i32.sub\n'; break
      case '*=': wat += '    i32.mul\n'; break
      case '/=': wat += '    i32.div_s\n'; break
      case '%=': wat += '    i32.rem_s\n'; break
    }
    
    wat += `    local.set $${varName}\n`
    return wat
  }
  
  private convertDestructuring(pattern: string, expr: string): string {
    // Generate the value
    let wat = ''
    wat += this.convertExpression(expr)
    wat += `    local.set $destructure_value\n`
    
    // Handle tuple destructuring: (a, b, c)
    if (pattern.includes('(') && pattern.includes(')')) {
      const match = pattern.match(/\(([^)]+)\)/)
      if (match) {
        const parts = match[1].split(',').map(p => p.trim())
        parts.forEach((part, idx) => {
          if (part !== '_') {
            wat += `    local.get $destructure_value\n`
            wat += `    i32.const ${idx * 4}\n`
            wat += `    i32.add\n`
            wat += `    i32.load\n`
            wat += `    local.set $${part}\n`
          }
        })
      }
      return wat
    }
    
    // Handle struct destructuring: Point { x, y }
    const structMatch = pattern.match(/(\w+)\s*\{\s*([^}]+)\s*\}/)
    if (structMatch) {
      const structName = structMatch[1]
      const fields = structMatch[2].split(',').map(f => f.trim())
      const structDef = this.structDefs.get(structName)
      
      if (structDef) {
        fields.forEach(field => {
          if (field !== '_') {
            const fieldDef = structDef.fields.find(f => f.name === field)
            if (fieldDef) {
              wat += `    local.get $destructure_value\n`
              wat += `    i32.const ${fieldDef.offset}\n`
              wat += `    i32.add\n`
              wat += `    i32.load\n`
              wat += `    local.set $${field}\n`
            }
          }
        })
      }
      return wat
    }
    
    // Handle array destructuring: [first, second]
    if (pattern.includes('[') && pattern.includes(']')) {
      const match = pattern.match(/\[([^\]]+)\]/)
      if (match) {
        const parts = match[1].split(',').map(p => p.trim())
        parts.forEach((part, idx) => {
          if (part !== '_' && part !== '..') {
            wat += `    local.get $destructure_value\n`
            wat += `    i32.const ${idx * 4}\n`
            wat += `    i32.add\n`
            wat += `    i32.load\n`
            wat += `    local.set $${part}\n`
          }
        })
      }
      return wat
    }
    
    return wat
  }
  
  private convertMatch(lines: string[], startIndex: number): { wat: string, endIndex: number } {
    const line = lines[startIndex].trim()
    const matchExpr = line.match(/match\s+(.+)\s*\{/)
    
    if (!matchExpr) return { wat: '', endIndex: startIndex }
    
    const expr = matchExpr[1]
    
    // Find match body
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
    
    // Parse match arms with guards
    const arms: { pattern: string, guard?: string, body: string[] }[] = []
    let currentPattern = ''
    let currentGuard: string | undefined = undefined
    let currentBody: string[] = []
    let armBraceCount = 0
    let inArm = false
    
    for (const l of bodyLines) {
      const trimmed = l.trim()
      
      if (trimmed.includes('=>') && !inArm) {
        // Parse pattern and guard: "pattern if guard =>" or "pattern =>"
        const arrowIdx = trimmed.indexOf('=>')
        const patternPart = trimmed.slice(0, arrowIdx).trim()
        
        if (patternPart.includes(' if ')) {
          const guardMatch = patternPart.match(/^(.+)\s+if\s+(.+)$/)
          if (guardMatch) {
            currentPattern = guardMatch[1].trim()
            currentGuard = guardMatch[2].trim()
          }
        } else {
          currentPattern = patternPart
          currentGuard = undefined
        }
        
        inArm = true
        armBraceCount = 0
      } else if (inArm) {
        if (trimmed === '{') {
          armBraceCount++
        } else if (trimmed === '}') {
          armBraceCount--
          if (armBraceCount === 0) {
            arms.push({ pattern: currentPattern, guard: currentGuard, body: currentBody })
            currentBody = []
            currentGuard = undefined
            inArm = false
          }
        } else if (trimmed.endsWith(',') && armBraceCount === 0) {
          currentBody.push(trimmed.replace(/,\s*$/, ''))
          arms.push({ pattern: currentPattern, guard: currentGuard, body: currentBody })
          currentBody = []
          currentGuard = undefined
          inArm = false
        } else {
          currentBody.push(trimmed)
        }
      }
    }
    
    let wat = ''
    
    // Generate match value
    wat += this.convertExpression(expr)
    wat += `    local.set $match_value\n`
    
    for (let j = 0; j < arms.length; j++) {
      const arm = arms[j]
      const isLast = j === arms.length - 1
      
      // Parse pattern
      const patternCode = this.convertPattern(arm.pattern, '$match_value')
      
      if (arm.pattern === '_') {
        // Default case - no condition needed
        if (arm.guard) {
          wat += this.convertExpression(arm.guard)
          wat += `    (if\n`
          wat += `      (then\n`
          wat += this.convertBody(arm.body)
          wat += `      )\n`
          wat += `    )\n`
        } else {
          wat += this.convertBody(arm.body)
        }
      } else {
        // Pattern matching with optional guard
        wat += patternCode.condition
        
        if (arm.guard) {
          wat += `    (if\n`
          wat += `      (then\n`
          wat += this.convertExpression(arm.guard)
          wat += `    (if\n`
          wat += `      (then\n`
          wat += patternCode.bindings
          wat += this.convertBody(arm.body)
          wat += `      )\n`
          wat += `    )\n`
          wat += `      )\n`
          wat += `    )\n`
        } else {
          wat += `    (if\n`
          wat += `      (then\n`
          wat += patternCode.bindings
          wat += this.convertBody(arm.body)
          wat += `      )\n`
          wat += `    )\n`
        }
      }
    }
    
    return { wat, endIndex: i }
  }
  
  private convertPattern(pattern: string, valueVar: string): { condition: string, bindings: string } {
    // Handle binding pattern: var @ subpattern
    const bindMatch = pattern.match(/^(\w+)\s*@\s*(.+)$/)
    if (bindMatch) {
      const varName = bindMatch[1]
      const subPattern = bindMatch[2]
      const sub = this.convertPattern(subPattern, valueVar)
      return {
        condition: sub.condition,
        bindings: sub.bindings + `    local.get ${valueVar}\n    local.set $${varName}\n`
      }
    }
    
    // Handle tuple destructuring: (a, b, c)
    if (pattern.startsWith('(') && pattern.endsWith(')')) {
      const inner = pattern.slice(1, -1)
      const parts = inner.split(',').map(p => p.trim())
      
      let condition = '    i32.const 1\n'
      let bindings = ''
      
      parts.forEach((part, idx) => {
        // Load tuple element: value + idx * 4
        bindings += `    local.get ${valueVar}\n`
        bindings += `    i32.const ${idx * 4}\n`
        bindings += `    i32.add\n`
        bindings += `    i32.load\n`
        
        if (part === '_') {
          bindings += `    drop\n`
        } else {
          bindings += `    local.set $${part}\n`
        }
      })
      
      return { condition, bindings }
    }
    
    // Handle struct destructuring: Point { x, y }
    const structMatch = pattern.match(/^(\w+)\s*\{\s*([^}]+)\s*\}$/)
    if (structMatch) {
      const structName = structMatch[1]
      const fields = structMatch[2].split(',').map(f => f.trim())
      
      let condition = '    i32.const 1\n'
      let bindings = ''
      
      const structDef = this.structDefs.get(structName)
      if (structDef) {
        fields.forEach(field => {
          const fieldDef = structDef.fields.find(f => f.name === field)
          if (fieldDef && field !== '_') {
            bindings += `    local.get ${valueVar}\n`
            bindings += `    i32.const ${fieldDef.offset}\n`
            bindings += `    i32.add\n`
            bindings += `    i32.load\n`
            bindings += `    local.set $${field}\n`
          }
        })
      }
      
      return { condition, bindings }
    }
    
    // Handle array/slice destructuring: [first, second, .., last]
    if (pattern.startsWith('[') && pattern.endsWith(']')) {
      const inner = pattern.slice(1, -1)
      const parts = inner.split(',').map(p => p.trim())
      
      let condition = '    i32.const 1\n'
      let bindings = ''
      
      let idx = 0
      for (const part of parts) {
        if (part === '..' || part.startsWith('..')) {
          // Skip rest pattern
          continue
        }
        
        if (part !== '_') {
          bindings += `    local.get ${valueVar}\n`
          bindings += `    i32.const ${idx * 4}\n`
          bindings += `    i32.add\n`
          bindings += `    i32.load\n`
          bindings += `    local.set $${part}\n`
        }
        idx++
      }
      
      return { condition, bindings }
    }
    
    // Handle range pattern: 1..=10
    const rangeMatch = pattern.match(/^(\d+)\.\.=(\d+)$/)
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1])
      const end = parseInt(rangeMatch[2])
      
      let condition = ''
      condition += `    local.get ${valueVar}\n`
      condition += `    i32.const ${start}\n`
      condition += `    i32.ge_s\n`
      condition += `    local.get ${valueVar}\n`
      condition += `    i32.const ${end}\n`
      condition += `    i32.le_s\n`
      condition += `    i32.and\n`
      
      return { condition, bindings: '' }
    }
    
    // Handle enum variant: Enum::Variant or Enum::Variant(data)
    const enumMatch = pattern.match(/^(\w+)::(\w+)(?:\(([^)]+)\))?$/)
    if (enumMatch) {
      const enumName = enumMatch[1]
      const variantName = enumMatch[2]
      const dataPattern = enumMatch[3]
      
      const enumDef = this.enumDefs.get(enumName)
      if (enumDef) {
        const variant = enumDef.variants.find(v => v.name === variantName)
        if (variant) {
          let condition = ''
          condition += `    local.get ${valueVar}\n`
          condition += `    i32.const ${variant.discriminant}\n`
          condition += `    i32.eq\n`
          
          let bindings = ''
          if (dataPattern) {
            // Handle data destructuring
            const dataParts = dataPattern.split(',').map(p => p.trim())
            dataParts.forEach((part, idx) => {
              if (part !== '_') {
                bindings += `    local.get ${valueVar}\n`
                bindings += `    i32.const ${4 + idx * 4}\n`  // Skip discriminant
                bindings += `    i32.add\n`
                bindings += `    i32.load\n`
                bindings += `    local.set $${part}\n`
              }
            })
          }
          
          return { condition, bindings }
        }
      }
    }
    
    // Handle literal pattern
    return {
      condition: `    local.get ${valueVar}\n    i32.const ${pattern}\n    i32.eq\n`,
      bindings: ''
    }
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
    
    // Result::Ok(value) and Result::Err(value)
    if (expr.startsWith('Ok(') || expr.startsWith('Err(')) {
      return this.convertResultConstruction(expr)
    }
    
    // Option::Some(value) and Option::None
    if (expr.startsWith('Some(') || expr === 'None') {
      return this.convertOptionConstruction(expr)
    }
    
    // Smart pointers: Box::new(), Rc::new(), RefCell::new()
    if (expr.startsWith('Box::new(') || expr.startsWith('Rc::new(') || expr.startsWith('RefCell::new(')) {
      return this.convertSmartPointerConstruction(expr)
    }
    
    // Box<dyn Trait> creation
    if (expr.startsWith('Box::new(') && expr.includes(' as ')) {
      const match = expr.match(/Box::new\((\w+)\s+as\s+dyn\s+(\w+)\)/)
      if (match) {
        const varName = match[1]
        const traitName = match[2]
        return this.convertDynTraitBox(varName, traitName)
      }
    }
    
    // dyn Trait method call: dyn_var.method()
    if (this.dynTraitVars.has(expr.split('.')[0])) {
      const varName = expr.split('.')[0]
      const traitName = this.dynTraitVars.get(varName)!
      if (expr.includes('.')) {
        const parts = expr.split('.')
        if (parts.length === 2) {
          const method = parts[1].replace('()', '').trim()
          return this.convertDynTraitMethodCall(varName, traitName, method)
        }
      }
    }
    
    if (expr.startsWith('"') && expr.endsWith('"')) {
      const str = expr.slice(1, -1)
      const offset = this.module.data.length * 20
      this.module.data.push(`(data (i32.const ${offset}) "${str}\\00")`)
      return `    i32.const ${offset}\n    i32.const ${str.length}\n`
    }
    
    // Closure definition: |x| x + 1 or |x, y| x + y
    if (expr.startsWith('|') && expr.indexOf('|', 1) > 0) {
      return this.convertClosureDefinition(expr)
    }
    
    // Closure call through variable: closure_var(args)
    if (expr.includes('(') && expr.includes(')')) {
      const callMatch = expr.match(/^(\w+)\s*\(([^)]*)\)$/)
      if (callMatch) {
        const varName = callMatch[1]
        const args = callMatch[2].split(',').map(a => a.trim()).filter(a => a)
        
        // Check if it's a closure variable
        if (this.closures.has(varName)) {
          return this.convertClosureCall(varName, args)
        }
      }
    }
    
    if (this.localVars.has(expr)) {
      return `    local.get $${expr}\n`
    }
    
    // Struct field access: instance.field
    if (expr.includes('.') && !expr.includes('..')) {
      const parts = expr.split('.')
      if (parts.length === 2) {
        const [instance, field] = parts
        const instanceType = this.localVars.get(instance)
        
        // Check if instance is a struct
        for (const [structName, structDef] of this.structDefs.entries()) {
          const fieldDef = structDef.fields.find(f => f.name === field)
          if (fieldDef) {
            let wat = ''
            wat += `    local.get $${instance}\n`
            wat += `    i32.const ${fieldDef.offset}\n`
            wat += `    i32.add\n`
            wat += `    i32.load\n`
            return wat
          }
        }
        
        // Tuple index access: tuple.0
        if (/^\d+$/.test(field)) {
          const index = parseInt(field)
          let wat = ''
          wat += `    local.get $${instance}\n`
          wat += `    i32.const ${index * 4}\n`
          wat += `    i32.add\n`
          wat += `    i32.load\n`
          return wat
        }
        
        // String methods: str.len(), str.push()
        if (field === 'len' && !expr.includes('(')) {
          let wat = ''
          wat += `    local.get $${instance}\n`
          wat += `    i32.load offset=4\n`
          return wat
        }
        
        if (field === 'as_str' && !expr.includes('(')) {
          return `    local.get $${instance}\n`
        }
        
        // Smart pointer dereference: *box or box.deref()
        if (this.smartPointers.has(instance)) {
          return this.convertSmartPointerAccess(instance, field)
        }
      }
    }
    
    // Smart pointer dereference: *box
    if (expr.startsWith('*')) {
      const varName = expr.slice(1).trim()
      if (this.smartPointers.has(varName)) {
        return this.convertSmartPointerDeref(varName)
      }
    }
    
    // String push: str.push('c')
    if (expr.includes('.push(')) {
      const match = expr.match(/(\w+)\.push\(([^)]+)\)/)
      if (match) {
        const strName = match[1]
        const char = match[2]
        
        let wat = ''
        wat += `    local.get $${strName}\n`
        wat += this.convertExpression(char)
        wat += `    call $string_push\n`
        return wat
      }
    }
    
    // Array/Slice length: arr.len()
    if (expr.endsWith('.len()')) {
      const arrName = expr.replace('.len()', '').trim()
      if (this.localVars.has(arrName)) {
        let wat = ''
        wat += `    local.get $${arrName}\n`
        wat += `    i32.const 4\n`
        wat += `    i32.add\n`
        wat += `    i32.load\n`
        return wat
      }
    }
    
    // Enum variant construction: EnumName::Variant or EnumName::Variant(data)
    if (expr.includes('::')) {
      const match = expr.match(/(\w+)::(\w+)(?:\(([^)]+)\))?/)
      if (match) {
        const enumName = match[1]
        const variantName = match[2]
        const data = match[3]
        
        const enumDef = this.enumDefs.get(enumName)
        if (enumDef) {
          const variant = enumDef.variants.find(v => v.name === variantName)
          if (variant) {
            let wat = ''
            wat += `    i32.const ${variant.discriminant}\n`
            
            if (data) {
              wat += this.convertExpression(data)
            }
            
            return wat
          }
        }
      }
    }
    
    if (expr.includes('(') && expr.includes(')')) {
      // Check for generic function call first: func<Type>(args)
      const genericCall = this.parseGenericCall(expr)
      if (genericCall) {
        const argsMatch = expr.match(/<[^>]+>\s*\(([^)]*)\)/)
        if (argsMatch) {
          const mangledName = this.mangleGenericName(genericCall.baseName, genericCall.concreteTypes)
          const args = argsMatch[1].split(',').map(a => a.trim()).filter(a => a)
          
          let wat = ''
          args.forEach(arg => {
            wat += this.convertExpression(arg)
          })
          wat += `    call $${mangledName}\n`
          return wat
        }
      }
      
      const callMatch = expr.match(/(\w+)\s*\(([^)]*)\)/)
      if (callMatch) {
        let fnName = callMatch[1]
        const args = callMatch[2].split(',').map(a => a.trim()).filter(a => a)
        
        // Check if it's a macro invocation
        if (this.macroDefs.has(fnName)) {
          const expanded = this.expandMacro(fnName, args)
          if (expanded) {
            return this.convertExpression(expanded)
          }
        }
        
        // Resolve function name through use aliases
        fnName = this.resolvePath(fnName)
        
        let wat = ''
        args.forEach(arg => {
          wat += this.convertExpression(arg)
        })
        wat += `    call $${fnName}\n`
        return wat
      }
    }
    
    // Module path call: module::function(args)
    if (expr.includes('::') && expr.includes('(')) {
      const match = expr.match(/(\w+)::(\w+)\s*\(([^)]*)\)/)
      if (match) {
        const moduleName = match[1]
        const fnName = match[2]
        const args = match[3].split(',').map(a => a.trim()).filter(a => a)
        
        let wat = ''
        args.forEach(arg => {
          wat += this.convertExpression(arg)
        })
        wat += `    call $${moduleName}_${fnName}\n`
        return wat
      }
    }
    
    // Method call: obj.method() or obj.method(args)
    if (expr.includes('.') && expr.includes('(') && expr.includes(')') && !expr.includes('..')) {
      // Check for iterator methods first
      const iterWat = this.convertIteratorMethod(expr)
      if (iterWat) return iterWat
      
      // Check for string methods
      const strWat = this.convertStringMethod(expr)
      if (strWat) return strWat
      
      const methodMatch = expr.match(/(\w+)\.(\w+)\s*\(([^)]*)\)/)
      if (methodMatch) {
        const objName = methodMatch[1]
        const methodName = methodMatch[2]
        const args = methodMatch[3].split(',').map(a => a.trim()).filter(a => a)
        
        // Smart pointer methods: clone(), borrow(), borrow_mut()
        if (this.smartPointers.has(objName)) {
          return this.convertSmartPointerMethod(objName, methodName, args)
        }
        
        let wat = ''
        wat += this.convertExpression(objName)
        args.forEach(arg => {
          wat += this.convertExpression(arg)
        })
        
        wat += `    call $${objName}_${methodName}\n`
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
    
    // Logical operators
    if (expr.includes('&&')) {
      const [left, right] = expr.split('&&').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.and\n'
    }
    if (expr.includes('||')) {
      const [left, right] = expr.split('||').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.or\n'
    }
    if (expr.startsWith('!') && !expr.startsWith('!=')) {
      const inner = expr.slice(1).trim()
      return this.convertExpression(inner) + '    i32.eqz\n'
    }
    
    // Bitwise operators
    if (expr.includes('&') && !expr.includes('&&')) {
      const [left, right] = expr.split('&').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.and\n'
    }
    if (expr.includes('|') && !expr.includes('||')) {
      const [left, right] = expr.split('|').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.or\n'
    }
    if (expr.includes('^')) {
      const [left, right] = expr.split('^').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.xor\n'
    }
    if (expr.includes('<<')) {
      const [left, right] = expr.split('<<').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.shl\n'
    }
    if (expr.includes('>>')) {
      const [left, right] = expr.split('>>').map(e => e.trim())
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.shr_s\n'
    }
    
    // Modulo
    if (expr.includes('%')) {
      const [left, right] = expr.split('%').map(e => e.trim())
      const overloadWat = this.tryOperatorOverload('%', left, right)
      if (overloadWat) return overloadWat
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.rem_s\n'
    }
    
    // Unary minus
    if (expr.startsWith('-')) {
      const inner = expr.slice(1).trim()
      const overloadWat = this.tryUnaryOperatorOverload('-', inner)
      if (overloadWat) return overloadWat
      return '    i32.const 0\n' + this.convertExpression(inner) + '    i32.sub\n'
    }
    
    if (expr.includes('+')) {
      const [left, right] = expr.split('+').map(e => e.trim())
      const overloadWat = this.tryOperatorOverload('+', left, right)
      if (overloadWat) return overloadWat
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.add\n'
    }
    if (expr.includes('-') && !expr.startsWith('-')) {
      const [left, right] = expr.split('-').map(e => e.trim())
      const overloadWat = this.tryOperatorOverload('-', left, right)
      if (overloadWat) return overloadWat
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.sub\n'
    }
    if (expr.includes('*')) {
      const [left, right] = expr.split('*').map(e => e.trim())
      const overloadWat = this.tryOperatorOverload('*', left, right)
      if (overloadWat) return overloadWat
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.mul\n'
    }
    if (expr.includes('/') && !expr.startsWith('/')) {
      const [left, right] = expr.split('/').map(e => e.trim())
      const overloadWat = this.tryOperatorOverload('/', left, right)
      if (overloadWat) return overloadWat
      return this.convertExpression(left) + this.convertExpression(right) + '    i32.div_s\n'
    }
    
    // Try operator: expr?
    if (expr.endsWith('?')) {
      return this.convertTryOperator(expr.slice(0, -1))
    }
    
    return `    i32.const 0\n`
  }
  
  private convertClosureDefinition(expr: string): string {
    // Parse: |x, y| x + y
    const pipeEnd = expr.indexOf('|', 1)
    const paramsStr = expr.slice(1, pipeEnd)
    const body = expr.slice(pipeEnd + 1).trim()
    
    const params = paramsStr.split(',').map(p => p.trim()).filter(p => p)
    
    // Find captured variables (variables used in body but not in params)
    const capturedVars: string[] = []
    const bodyTokens = body.match(/\b\w+\b/g) || []
    for (const token of bodyTokens) {
      if (this.localVars.has(token) && !params.includes(token) && !capturedVars.includes(token)) {
        capturedVars.push(token)
      }
    }
    
    const closureId = this.closureCounter++
    const closureName = `$closure_${closureId}`
    
    // Store closure definition
    this.closures.set(closureName, {
      id: closureId,
      params,
      body,
      capturedVars
    })
    
    // Generate closure function in WAT
    let watFn = `  (func ${closureName}`
    
    // Add captured variables as first parameters
    capturedVars.forEach(v => {
      watFn += ` (param $captured_${v} i32)`
    })
    
    // Add closure parameters
    params.forEach(p => {
      watFn += ` (param $${p} i32)`
    })
    
    watFn += ' (result i32)\n'
    
    // Add captured variables as locals
    capturedVars.forEach(v => {
      watFn += `    (local $${v} i32)\n`
      watFn += `    local.get $captured_${v}\n`
      watFn += `    local.set $${v}\n`
    })
    
    // Convert body expression
    const bodyWat = this.convertExpression(body)
    watFn += bodyWat
    watFn += '  )\n'
    
    this.module.functions.push(watFn)
    
    // Return closure ID (for now just return the function index)
    return `    i32.const ${closureId}\n`
  }
  
  private convertClosureAssignment(varName: string, expr: string): string {
    // Parse: |x, y| x + y
    const pipeEnd = expr.indexOf('|', 1)
    const paramsStr = expr.slice(1, pipeEnd)
    const body = expr.slice(pipeEnd + 1).trim()
    
    const params = paramsStr.split(',').map(p => p.trim()).filter(p => p)
    
    // Find captured variables
    const capturedVars: string[] = []
    const bodyTokens = body.match(/\b\w+\b/g) || []
    for (const token of bodyTokens) {
      if (this.localVars.has(token) && !params.includes(token) && !capturedVars.includes(token)) {
        capturedVars.push(token)
      }
    }
    
    const closureId = this.closureCounter++
    const closureName = `$closure_${closureId}`
    
    // Store closure definition with variable name as key
    this.closures.set(varName, {
      id: closureId,
      params,
      body,
      capturedVars
    })
    
    // Generate closure function in WAT
    let watFn = `  (func ${closureName}`
    
    // Add captured variables as first parameters
    capturedVars.forEach(v => {
      watFn += ` (param $captured_${v} i32)`
    })
    
    // Add closure parameters
    params.forEach(p => {
      watFn += ` (param $${p} i32)`
    })
    
    watFn += ' (result i32)\n'
    
    // Add captured variables as locals
    capturedVars.forEach(v => {
      watFn += `    (local $${v} i32)\n`
      watFn += `    local.get $captured_${v}\n`
      watFn += `    local.set $${v}\n`
    })
    
    // Convert body expression
    const bodyWat = this.convertExpression(body)
    watFn += bodyWat
    watFn += '  )\n'
    
    this.module.functions.push(watFn)
    
    // Store closure ID in the variable
    return `    i32.const ${closureId}\n    local.set $${varName}\n`
  }
  
  private convertClosureCall(closureVarName: string, args: string[]): string {
    const closure = this.closures.get(closureVarName)
    if (!closure) {
      return `    i32.const 0\n`
    }
    
    let wat = ''
    
    // Push captured variables
    closure.capturedVars.forEach(v => {
      wat += `    local.get $${v}\n`
    })
    
    // Push arguments
    args.forEach(arg => {
      wat += this.convertExpression(arg)
    })
    
    // Call closure function
    wat += `    call $closure_${closure.id}\n`
    
    return wat
  }
  
  private convertResultConstruction(expr: string): string {
    // Result represented as: [tag: i32, value: i32]
    // tag: 0 = Ok, 1 = Err
    
    let wat = ''
    
    if (expr.startsWith('Ok(')) {
      const match = expr.match(/Ok\(([^)]+)\)/)
      if (match) {
        const value = match[1]
        // Allocate memory for Result
        wat += `    i32.const ${this.heapPointer}\n`
        wat += `    local.set $result_ptr\n`
        
        // Set tag to 0 (Ok)
        wat += `    local.get $result_ptr\n`
        wat += `    i32.const 0\n`
        wat += `    i32.store\n`
        
        // Set value
        wat += `    local.get $result_ptr\n`
        wat += `    i32.const 4\n`
        wat += `    i32.add\n`
        wat += this.convertExpression(value)
        wat += `    i32.store\n`
        
        // Update heap pointer
        this.heapPointer += 8
        wat += `    local.get $result_ptr\n`
      }
    } else if (expr.startsWith('Err(')) {
      const match = expr.match(/Err\(([^)]+)\)/)
      if (match) {
        const value = match[1]
        // Allocate memory for Result
        wat += `    i32.const ${this.heapPointer}\n`
        wat += `    local.set $result_ptr\n`
        
        // Set tag to 1 (Err)
        wat += `    local.get $result_ptr\n`
        wat += `    i32.const 1\n`
        wat += `    i32.store\n`
        
        // Set value
        wat += `    local.get $result_ptr\n`
        wat += `    i32.const 4\n`
        wat += `    i32.add\n`
        wat += this.convertExpression(value)
        wat += `    i32.store\n`
        
        // Update heap pointer
        this.heapPointer += 8
        wat += `    local.get $result_ptr\n`
      }
    }
    
    return wat
  }
  
  private convertOptionConstruction(expr: string): string {
    // Option represented as: [tag: i32, value: i32]
    // tag: 0 = Some, 1 = None
    
    let wat = ''
    
    if (expr === 'None') {
      // Allocate memory for Option
      wat += `    i32.const ${this.heapPointer}\n`
      wat += `    local.set $option_ptr\n`
      
      // Set tag to 1 (None)
      wat += `    local.get $option_ptr\n`
      wat += `    i32.const 1\n`
      wat += `    i32.store\n`
      
      // Update heap pointer
      this.heapPointer += 8
      wat += `    local.get $option_ptr\n`
    } else if (expr.startsWith('Some(')) {
      const match = expr.match(/Some\(([^)]+)\)/)
      if (match) {
        const value = match[1]
        // Allocate memory for Option
        wat += `    i32.const ${this.heapPointer}\n`
        wat += `    local.set $option_ptr\n`
        
        // Set tag to 0 (Some)
        wat += `    local.get $option_ptr\n`
        wat += `    i32.const 0\n`
        wat += `    i32.store\n`
        
        // Set value
        wat += `    local.get $option_ptr\n`
        wat += `    i32.const 4\n`
        wat += `    i32.add\n`
        wat += this.convertExpression(value)
        wat += `    i32.store\n`
        
        // Update heap pointer
        this.heapPointer += 8
        wat += `    local.get $option_ptr\n`
      }
    }
    
    return wat
  }
  
  private convertTryOperator(expr: string): string {
    // Handle: expr?
    // If Result is Err or Option is None, return early
    
    let wat = ''
    wat += this.convertExpression(expr)
    wat += `    local.set $try_value\n`
    
    // Check tag
    wat += `    local.get $try_value\n`
    wat += `    i32.load\n`  // Load tag
    wat += `    i32.const 1\n`
    wat += `    i32.eq\n`
    wat += `    (if\n`
    wat += `      (then\n`
    // Return the error/None value
    wat += `        local.get $try_value\n`
    wat += `        return\n`
    wat += `      )\n`
    wat += `    )\n`
    
    // Extract the Ok/Some value
    wat += `    local.get $try_value\n`
    wat += `    i32.const 4\n`
    wat += `    i32.add\n`
    wat += `    i32.load\n`
    
    return wat
  }
  
  private convertIteratorMethod(expr: string): string {
    // Handle iterator chain methods
    // .fold(init, |acc, x| body)
    // .take(n)
    // .skip(n)
    // .enumerate()
    
    if (expr.includes('.fold(')) {
      return this.convertFold(expr)
    }
    
    if (expr.includes('.take(')) {
      return this.convertTake(expr)
    }
    
    if (expr.includes('.skip(')) {
      return this.convertSkip(expr)
    }
    
    if (expr.includes('.enumerate()')) {
      return this.convertEnumerate(expr)
    }
    
    if (expr.includes('.collect()')) {
      return this.convertCollect(expr)
    }
    
    return ''
  }
  
  private convertFold(expr: string): string {
    // expr.fold(init, |acc, x| body)
    const match = expr.match(/(.+)\.fold\((.+),\s*(\|.+\|)\)/)
    if (!match) return ''
    
    const iterableExpr = match[1]
    const initValue = match[2]
    const closure = match[3]
    
    // Parse closure: |acc, x| body
    const closureMatch = closure.match(/\|([^|]+)\|\s*(.+)/)
    if (!closureMatch) return ''
    
    const params = closureMatch[1].split(',').map(p => p.trim())
    const body = closureMatch[2]
    
    let wat = ''
    
    // Initialize accumulator
    wat += this.convertExpression(initValue)
    wat += `    local.set $fold_acc\n`
    
    // Get iterable (assume it's a range or array)
    wat += this.convertExpression(iterableExpr)
    wat += `    local.set $fold_iter\n`
    
    // Generate loop
    wat += `    (block $fold_done\n`
    wat += `      (loop $fold_loop\n`
    
    // Check if iterator has next (simplified: assume range)
    wat += `        local.get $fold_iter\n`
    wat += `        i32.load offset=4\n`  // current index
    wat += `        local.get $fold_iter\n`
    wat += `        i32.load offset=8\n`  // end
    wat += `        i32.lt_s\n`
    wat += `        i32.eqz\n`
    wat += `        br_if $fold_done\n`
    
    // Get next value
    wat += `        local.get $fold_iter\n`
    wat += `        i32.load offset=4\n`  // current
    wat += `        local.set $fold_item\n`
    
    // Increment iterator
    wat += `        local.get $fold_iter\n`
    wat += `        local.get $fold_iter\n`
    wat += `        i32.load offset=4\n`
    wat += `        i32.const 1\n`
    wat += `        i32.add\n`
    wat += `        i32.store offset=4\n`
    
    // Call closure body with acc and item
    wat += `        local.get $fold_acc\n`
    wat += `        local.set $${params[0]}\n`
    wat += `        local.get $fold_item\n`
    wat += `        local.set $${params[1]}\n`
    wat += this.convertExpression(body)
    wat += `        local.set $fold_acc\n`
    
    wat += `        br $fold_loop\n`
    wat += `      )\n`
    wat += `    )\n`
    
    wat += `    local.get $fold_acc\n`
    
    return wat
  }
  
  private convertTake(expr: string): string {
    // iter.take(n)
    const match = expr.match(/(.+)\.take\((.+)\)/)
    if (!match) return ''
    
    const iterableExpr = match[1]
    const count = match[2]
    
    let wat = ''
    
    wat += this.convertExpression(iterableExpr)
    wat += `    local.set $take_iter\n`
    
    // Create new iterator with limited range
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $take_result\n`
    
    // Copy start
    wat += `    local.get $take_result\n`
    wat += `    local.get $take_iter\n`
    wat += `    i32.load offset=4\n`
    wat += `    i32.store offset=4\n`
    
    // Calculate new end (min of current end and start + count)
    wat += `    local.get $take_iter\n`
    wat += `    i32.load offset=4\n`
    wat += this.convertExpression(count)
    wat += `    i32.add\n`
    wat += `    local.get $take_iter\n`
    wat += `    i32.load offset=8\n`
    wat += `    local.get $take_iter\n`
    wat += `    i32.load offset=4\n`
    wat += this.convertExpression(count)
    wat += `    i32.add\n`
    wat += `    i32.lt_s\n`
    wat += `    (if\n`
    wat += `      (then\n`
    wat += `        local.get $take_result\n`
    wat += `        local.get $take_iter\n`
    wat += `        i32.load offset=4\n`
    wat += this.convertExpression(count)
    wat += `        i32.add\n`
    wat += `        i32.store offset=8\n`
    wat += `      )\n`
    wat += `      (else\n`
    wat += `        local.get $take_result\n`
    wat += `        local.get $take_iter\n`
    wat += `        i32.load offset=8\n`
    wat += `        i32.store offset=8\n`
    wat += `      )\n`
    wat += `    )\n`
    
    this.heapPointer += 12
    wat += `    local.get $take_result\n`
    
    return wat
  }
  
  private convertSkip(expr: string): string {
    // iter.skip(n)
    const match = expr.match(/(.+)\.skip\((.+)\)/)
    if (!match) return ''
    
    const iterableExpr = match[1]
    const count = match[2]
    
    let wat = ''
    
    wat += this.convertExpression(iterableExpr)
    wat += `    local.set $skip_iter\n`
    
    // Create new iterator starting from current + skip
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $skip_result\n`
    
    // New start = old start + skip
    wat += `    local.get $skip_result\n`
    wat += `    local.get $skip_iter\n`
    wat += `    i32.load offset=4\n`
    wat += this.convertExpression(count)
    wat += `    i32.add\n`
    wat += `    i32.store offset=4\n`
    
    // Keep same end
    wat += `    local.get $skip_result\n`
    wat += `    local.get $skip_iter\n`
    wat += `    i32.load offset=8\n`
    wat += `    i32.store offset=8\n`
    
    this.heapPointer += 12
    wat += `    local.get $skip_result\n`
    
    return wat
  }
  
  private convertEnumerate(expr: string): string {
    // iter.enumerate()
    const match = expr.match(/(.+)\.enumerate\(\)/)
    if (!match) return ''
    
    const iterableExpr = match[1]
    
    let wat = ''
    
    wat += this.convertExpression(iterableExpr)
    wat += `    local.set $enum_iter\n`
    
    // Create enumerated iterator: [index: i32, start: i32, end: i32]
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $enum_result\n`
    
    // Initialize index to 0
    wat += `    local.get $enum_result\n`
    wat += `    i32.const 0\n`
    wat += `    i32.store\n`
    
    // Copy start and end
    wat += `    local.get $enum_result\n`
    wat += `    local.get $enum_iter\n`
    wat += `    i32.load offset=4\n`
    wat += `    i32.store offset=4\n`
    
    wat += `    local.get $enum_result\n`
    wat += `    local.get $enum_iter\n`
    wat += `    i32.load offset=8\n`
    wat += `    i32.store offset=8\n`
    
    this.heapPointer += 12
    wat += `    local.get $enum_result\n`
    
    return wat
  }
  
  private convertCollect(expr: string): string {
    // iter.collect()
    const match = expr.match(/(.+)\.collect\(\)/)
    if (!match) return ''
    
    const iterableExpr = match[1]
    
    let wat = ''
    
    wat += this.convertExpression(iterableExpr)
    wat += `    local.set $collect_iter\n`
    
    // Calculate length
    wat += `    local.get $collect_iter\n`
    wat += `    i32.load offset=8\n`
    wat += `    local.get $collect_iter\n`
    wat += `    i32.load offset=4\n`
    wat += `    i32.sub\n`
    wat += `    local.set $collect_len\n`
    
    // Allocate array: [len: i32, data...]
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $collect_result\n`
    
    // Store length
    wat += `    local.get $collect_result\n`
    wat += `    local.get $collect_len\n`
    wat += `    i32.store\n`
    
    // Copy elements
    wat += `    local.get $collect_iter\n`
    wat += `    i32.load offset=4\n`
    wat += `    local.set $collect_idx\n`
    
    wat += `    (block $collect_done\n`
    wat += `      (loop $collect_loop\n`
    wat += `        local.get $collect_idx\n`
    wat += `        local.get $collect_iter\n`
    wat += `        i32.load offset=8\n`
    wat += `        i32.ge_s\n`
    wat += `        br_if $collect_done\n`
    
    // Store element
    wat += `        local.get $collect_result\n`
    wat += `        local.get $collect_idx\n`
    wat += `        local.get $collect_iter\n`
    wat += `        i32.load offset=4\n`
    wat += `        i32.sub\n`
    wat += `        i32.const 4\n`
    wat += `        i32.mul\n`
    wat += `        i32.const 4\n`
    wat += `        i32.add\n`
    wat += `        i32.add\n`
    wat += `        local.get $collect_idx\n`
    wat += `        i32.store\n`
    
    wat += `        local.get $collect_idx\n`
    wat += `        i32.const 1\n`
    wat += `        i32.add\n`
    wat += `        local.set $collect_idx\n`
    
    wat += `        br $collect_loop\n`
    wat += `      )\n`
    wat += `    )\n`
    
    this.heapPointer += 4 + 4 * 100  // reserve space for up to 100 elements
    wat += `    local.get $collect_result\n`
    
    return wat
  }
  
  private convertStringMethod(expr: string): string {
    // Handle string methods: trim, split, replace, find, contains
    
    if (expr.includes('.trim()')) {
      return this.convertTrim(expr)
    }
    
    if (expr.includes('.split(')) {
      return this.convertSplit(expr)
    }
    
    if (expr.includes('.replace(')) {
      return this.convertReplace(expr)
    }
    
    if (expr.includes('.find(')) {
      return this.convertFind(expr)
    }
    
    if (expr.includes('.contains(')) {
      return this.convertContains(expr)
    }
    
    if (expr.includes('.chars()')) {
      return this.convertChars(expr)
    }
    
    return ''
  }
  
  private convertTrim(expr: string): string {
    // str.trim()
    const match = expr.match(/(.+)\.trim\(\)/)
    if (!match) return ''
    
    const strExpr = match[1]
    
    let wat = ''
    
    wat += this.convertExpression(strExpr)
    wat += `    local.set $trim_str\n`
    
    // Allocate new string
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $trim_result\n`
    
    // Copy string pointer and length (simplified: just copy)
    // In reality, would scan for leading/trailing whitespace
    wat += `    local.get $trim_result\n`
    wat += `    local.get $trim_str\n`
    wat += `    i32.load\n`
    wat += `    i32.store\n`
    
    wat += `    local.get $trim_result\n`
    wat += `    i32.const 4\n`
    wat += `    i32.add\n`
    wat += `    local.get $trim_str\n`
    wat += `    i32.load offset=4\n`
    wat += `    i32.store\n`
    
    this.heapPointer += 8
    wat += `    local.get $trim_result\n`
    
    return wat
  }
  
  private convertSplit(expr: string): string {
    // str.split(delim)
    const match = expr.match(/(.+)\.split\(([^)]+)\)/)
    if (!match) return ''
    
    const strExpr = match[1]
    const delim = match[2]
    
    let wat = ''
    
    wat += this.convertExpression(strExpr)
    wat += `    local.set $split_str\n`
    
    // Create iterator for split
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $split_result\n`
    
    // Store string pointer
    wat += `    local.get $split_result\n`
    wat += `    local.get $split_str\n`
    wat += `    i32.store\n`
    
    // Initialize position to 0
    wat += `    local.get $split_result\n`
    wat += `    i32.const 4\n`
    wat += `    i32.add\n`
    wat += `    i32.const 0\n`
    wat += `    i32.store\n`
    
    // Store delimiter
    wat += this.convertExpression(delim)
    wat += `    local.set $split_delim\n`
    wat += `    local.get $split_result\n`
    wat += `    i32.const 8\n`
    wat += `    i32.add\n`
    wat += `    local.get $split_delim\n`
    wat += `    i32.store\n`
    
    this.heapPointer += 12
    wat += `    local.get $split_result\n`
    
    return wat
  }
  
  private convertReplace(expr: string): string {
    // str.replace(old, new)
    const match = expr.match(/(.+)\.replace\(([^,]+),\s*([^)]+)\)/)
    if (!match) return ''
    
    const strExpr = match[1]
    const oldStr = match[2]
    const newStr = match[3]
    
    let wat = ''
    
    wat += this.convertExpression(strExpr)
    wat += `    local.set $replace_str\n`
    
    // Allocate new string
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $replace_result\n`
    
    // Simplified: just copy original string
    // In reality, would scan and replace
    wat += `    local.get $replace_result\n`
    wat += `    local.get $replace_str\n`
    wat += `    i32.load\n`
    wat += `    i32.store\n`
    
    wat += `    local.get $replace_result\n`
    wat += `    i32.const 4\n`
    wat += `    i32.add\n`
    wat += `    local.get $replace_str\n`
    wat += `    i32.load offset=4\n`
    wat += `    i32.store\n`
    
    this.heapPointer += 8
    wat += `    local.get $replace_result\n`
    
    return wat
  }
  
  private convertFind(expr: string): string {
    // str.find(sub) -> Option<usize>
    const match = expr.match(/(.+)\.find\(([^)]+)\)/)
    if (!match) return ''
    
    const strExpr = match[1]
    const subStr = match[2]
    
    let wat = ''
    
    wat += this.convertExpression(strExpr)
    wat += `    local.set $find_str\n`
    
    // Simplified: return Some(0)
    // In reality, would search for substring
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $find_result\n`
    
    // Set tag to 0 (Some)
    wat += `    local.get $find_result\n`
    wat += `    i32.const 0\n`
    wat += `    i32.store\n`
    
    // Set value to 0 (index)
    wat += `    local.get $find_result\n`
    wat += `    i32.const 4\n`
    wat += `    i32.add\n`
    wat += `    i32.const 0\n`
    wat += `    i32.store\n`
    
    this.heapPointer += 8
    wat += `    local.get $find_result\n`
    
    return wat
  }
  
  private convertContains(expr: string): string {
    // str.contains(sub) -> bool
    const match = expr.match(/(.+)\.contains\(([^)]+)\)/)
    if (!match) return ''
    
    const strExpr = match[1]
    const subStr = match[2]
    
    let wat = ''
    
    wat += this.convertExpression(strExpr)
    wat += `    local.set $contains_str\n`
    
    // Simplified: return true
    // In reality, would check if substring exists
    wat += `    i32.const 1\n`
    
    return wat
  }
  
  private convertChars(expr: string): string {
    // str.chars() -> iterator
    const match = expr.match(/(.+)\.chars\(\)/)
    if (!match) return ''
    
    const strExpr = match[1]
    
    let wat = ''
    
    wat += this.convertExpression(strExpr)
    wat += `    local.set $chars_str\n`
    
    // Create iterator
    wat += `    i32.const ${this.heapPointer}\n`
    wat += `    local.set $chars_result\n`
    
    // Store string pointer
    wat += `    local.get $chars_result\n`
    wat += `    local.get $chars_str\n`
    wat += `    i32.store\n`
    
    // Initialize position to 0
    wat += `    local.get $chars_result\n`
    wat += `    i32.const 4\n`
    wat += `    i32.add\n`
    wat += `    i32.const 0\n`
    wat += `    i32.store\n`
    
    // Store length
    wat += `    local.get $chars_result\n`
    wat += `    i32.const 8\n`
    wat += `    i32.add\n`
    wat += `    local.get $chars_str\n`
    wat += `    i32.load offset=4\n`
    wat += `    i32.store\n`
    
    this.heapPointer += 12
    wat += `    local.get $chars_result\n`
    
    return wat
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
  
  private convertPanic(line: string): string {
    const match = line.match(/panic!\s*\(\s*"([^"]*)"\s*\)/)
    if (match) {
      const msg = match[1]
      const offset = this.module.data.length * 100
      this.module.data.push(`(data (i32.const ${offset}) "PANIC: ${msg}\\00")`)
      
      let wat = ''
      wat += `    i32.const ${offset}\n`
      wat += `    i32.const ${msg.length + 8}\n`
      wat += `    call $log\n`
      wat += `    unreachable\n`
      return wat
    }
    return '    unreachable\n'
  }
  
  private convertVec(line: string): string {
    const match = line.match(/vec!\s*\[\s*([^\]]*)\s*\]/)
    if (match) {
      const elements = match[1].split(',').map(e => e.trim()).filter(e => e)
      
      const arrayAddr = this.heapPointer
      this.heapPointer += 8 + elements.length * 4
      
      let wat = ''
      wat += `    i32.const ${arrayAddr}\n`
      wat += `    i32.const ${elements.length}\n`
      wat += `    i32.store\n`
      wat += `    i32.const ${arrayAddr}\n`
      wat += `    i32.const ${elements.length}\n`
      wat += `    i32.store offset=4\n`
      
      elements.forEach((elem, idx) => {
        wat += this.convertExpression(elem)
        wat += `    i32.const ${arrayAddr + 8 + idx * 4}\n`
        wat += `    i32.store\n`
      })
      
      wat += `    i32.const ${arrayAddr}\n`
      return wat
    }
    return ''
  }
  
  private convertFormat(line: string): string {
    const match = line.match(/format!\s*\(\s*"([^"]*)"\s*(?:,\s*(.+))?\s*\)/)
    if (match) {
      const format = match[1]
      const args = match[2] ? match[2].split(',').map(a => a.trim()) : []
      
      let result = format
      args.forEach((arg, idx) => {
        result = result.replace(/{}/g, `{${arg}}`)
      })
      
      const offset = this.module.data.length * 100
      this.module.data.push(`(data (i32.const ${offset}) "${result}\\00")`)
      
      let wat = ''
      wat += `    i32.const ${offset}\n`
      wat += `    i32.const ${result.length}\n`
      return wat
    }
    return ''
  }
  
  private convertLoop(lines: string[], startIndex: number): { wat: string, endIndex: number } {
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
    wat += `    (block $loop_end_${startIndex}\n`
    wat += `      (loop $loop_start_${startIndex}\n`
    wat += this.convertBody(bodyLines)
    wat += `        br $loop_start_${startIndex}\n`
    wat += `      )\n`
    wat += `    )\n`
    
    return { wat, endIndex: i }
  }
  
  private convertIfLet(lines: string[], startIndex: number): { wat: string, endIndex: number } {
    const line = lines[startIndex].trim()
    const match = line.match(/if let\s+(\w+)::(\w+)\s*=\s*(.+)\s*\{/)
    
    if (!match) return { wat: '', endIndex: startIndex }
    
    const enumName = match[1]
    const variantName = match[2]
    const expr = match[3]
    
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
    
    const enumDef = this.enumDefs.get(enumName)
    if (!enumDef) return { wat: '', endIndex: i }
    
    const variant = enumDef.variants.find(v => v.name === variantName)
    if (!variant) return { wat: '', endIndex: i }
    
    let wat = ''
    wat += this.convertExpression(expr)
    wat += `    i32.const ${variant.discriminant}\n`
    wat += `    i32.eq\n`
    wat += `    (if\n`
    wat += `      (then\n`
    wat += this.convertBody(bodyLines)
    wat += `      )\n`
    wat += `    )\n`
    
    return { wat, endIndex: i }
  }
  
  private convertWhileLet(lines: string[], startIndex: number): { wat: string, endIndex: number } {
    const line = lines[startIndex].trim()
    const match = line.match(/while let\s+(\w+)::(\w+)\s*=\s*(.+)\s*\{/)
    
    if (!match) return { wat: '', endIndex: startIndex }
    
    const enumName = match[1]
    const variantName = match[2]
    const expr = match[3]
    
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
    
    const enumDef = this.enumDefs.get(enumName)
    if (!enumDef) return { wat: '', endIndex: i }
    
    const variant = enumDef.variants.find(v => v.name === variantName)
    if (!variant) return { wat: '', endIndex: i }
    
    let wat = ''
    wat += `    (block $while_let_end_${startIndex}\n`
    wat += `      (loop $while_let_start_${startIndex}\n`
    wat += this.convertExpression(expr)
    wat += `        i32.const ${variant.discriminant}\n`
    wat += `        i32.eq\n`
    wat += `        i32.eqz\n`
    wat += `        br_if $while_let_end_${startIndex}\n`
    wat += this.convertBody(bodyLines)
    wat += `        br $while_let_start_${startIndex}\n`
    wat += `      )\n`
    wat += `    )\n`
    
    return { wat, endIndex: i }
  }
  
  private convertSmartPointerConstruction(expr: string): string {
    let wat = ''
    
    if (expr.startsWith('Box::new(')) {
      const match = expr.match(/Box::new\(([^)]+)\)/)
      if (match) {
        const value = match[1].trim()
        const address = this.heapPointer
        this.heapPointer += 8
        
        wat += this.convertExpression(value)
        wat += `    i32.const ${address}\n`
        wat += `    i32.store\n`
        wat += `    i32.const ${address}\n`
        
        return wat
      }
    }
    
    if (expr.startsWith('Rc::new(')) {
      const match = expr.match(/Rc::new\(([^)]+)\)/)
      if (match) {
        const value = match[1].trim()
        const address = this.heapPointer
        this.heapPointer += 12
        
        wat += `    i32.const 1\n`
        wat += `    i32.const ${address}\n`
        wat += `    i32.store\n`
        wat += this.convertExpression(value)
        wat += `    i32.const ${address + 4}\n`
        wat += `    i32.store\n`
        wat += `    i32.const ${address}\n`
        
        return wat
      }
    }
    
    if (expr.startsWith('RefCell::new(')) {
      const match = expr.match(/RefCell::new\(([^)]+)\)/)
      if (match) {
        const value = match[1].trim()
        const address = this.heapPointer
        this.heapPointer += 12
        
        wat += `    i32.const 0\n`
        wat += `    i32.const ${address}\n`
        wat += `    i32.store\n`
        wat += this.convertExpression(value)
        wat += `    i32.const ${address + 4}\n`
        wat += `    i32.store\n`
        wat += `    i32.const ${address}\n`
        
        return wat
      }
    }
    
    return wat
  }
  
  private convertSmartPointerDeref(varName: string): string {
    const ptrDef = this.smartPointers.get(varName)
    if (!ptrDef) return ''
    
    let wat = ''
    wat += `    local.get $${varName}\n`
    
    if (ptrDef.type === 'Box') {
      wat += `    i32.load\n`
    } else if (ptrDef.type === 'Rc') {
      wat += `    i32.const 4\n`
      wat += `    i32.add\n`
      wat += `    i32.load\n`
    } else if (ptrDef.type === 'RefCell') {
      wat += `    i32.const 4\n`
      wat += `    i32.add\n`
      wat += `    i32.load\n`
    }
    
    return wat
  }
  
  private convertSmartPointerAccess(varName: string, field: string): string {
    const ptrDef = this.smartPointers.get(varName)
    if (!ptrDef) return ''
    
    let wat = ''
    wat += `    local.get $${varName}\n`
    
    if (ptrDef.type === 'Box') {
      wat += `    i32.load\n`
    } else if (ptrDef.type === 'Rc') {
      wat += `    i32.const 4\n`
      wat += `    i32.add\n`
      wat += `    i32.load\n`
    } else if (ptrDef.type === 'RefCell') {
      wat += `    i32.const 4\n`
      wat += `    i32.add\n`
      wat += `    i32.load\n`
    }
    
    const structDef = this.structDefs.get(ptrDef.innerType)
    if (structDef) {
      const fieldDef = structDef.fields.find(f => f.name === field)
      if (fieldDef) {
        wat += `    i32.const ${fieldDef.offset}\n`
        wat += `    i32.add\n`
        wat += `    i32.load\n`
      }
    }
    
    return wat
  }
  
  private convertSmartPointerMethod(varName: string, methodName: string, args: string[]): string {
    const ptrDef = this.smartPointers.get(varName)
    if (!ptrDef) return ''
    
    let wat = ''
    
    if (methodName === 'clone' && ptrDef.type === 'Rc') {
      wat += `    local.get $${varName}\n`
      wat += `    i32.load\n`
      wat += `    i32.const 1\n`
      wat += `    i32.add\n`
      wat += `    local.get $${varName}\n`
      wat += `    i32.store\n`
      wat += `    local.get $${varName}\n`
      return wat
    }
    
    if (methodName === 'borrow' && ptrDef.type === 'RefCell') {
      wat += `    local.get $${varName}\n`
      wat += `    i32.load\n`
      wat += `    i32.const 1\n`
      wat += `    i32.add\n`
      wat += `    local.get $${varName}\n`
      wat += `    i32.store\n`
      wat += `    local.get $${varName}\n`
      wat += `    i32.const 4\n`
      wat += `    i32.add\n`
      return wat
    }
    
    if (methodName === 'borrow_mut' && ptrDef.type === 'RefCell') {
      wat += `    local.get $${varName}\n`
      wat += `    i32.load\n`
      wat += `    i32.const 1\n`
      wat += `    i32.add\n`
      wat += `    local.get $${varName}\n`
      wat += `    i32.store\n`
      wat += `    local.get $${varName}\n`
      wat += `    i32.const 4\n`
      wat += `    i32.add\n`
      return wat
    }
    
    if (methodName === 'get' && ptrDef.type === 'RefCell') {
      wat += `    local.get $${varName}\n`
      wat += `    i32.const 4\n`
      wat += `    i32.add\n`
      wat += `    i32.load\n`
      return wat
    }
    
    return wat
  }
  
  private convertDynTraitBox(varName: string, traitName: string): string {
    let wat = ''
    const address = this.heapPointer
    this.heapPointer += 8
    
    wat += `    local.get $${varName}\n`
    wat += `    i32.const ${address}\n`
    wat += `    i32.store\n`
    
    // Store vtable pointer (offset +4)
    const vtableKey = `${traitName}_${this.localVars.get(varName)}`
    const vtable = this.vtables.get(vtableKey)
    if (vtable) {
      wat += `    i32.const ${address + 4}\n`
      wat += `    i32.const ${Array.from(vtable.methodPointers.values())[0] || 0}\n`
      wat += `    i32.store\n`
    }
    
    wat += `    i32.const ${address}\n`
    
    this.dynTraitVars.set(varName, traitName)
    
    return wat
  }
  
  private convertDynTraitMethodCall(varName: string, traitName: string, methodName: string): string {
    let wat = ''
    
    // Get vtable pointer
    wat += `    local.get $${varName}\n`
    wat += `    i32.const 4\n`
    wat += `    i32.add\n`
    wat += `    i32.load\n`
    
    // Get data pointer
    wat += `    local.get $${varName}\n`
    wat += `    i32.load\n`
    
    // For now, use indirect call through vtable
    // This is simplified - real implementation would need call_indirect
    wat += `    ;; dyn call: ${traitName}::${methodName}\n`
    
    // Try to find the impl and call directly
    for (const [implKey, impl] of this.traitImpls.entries()) {
      if (impl.traitName === traitName) {
        const implMethod = impl.methods.get(methodName)
        if (implMethod) {
          wat = ''
          wat += `    local.get $${varName}\n`
          wat += `    i32.load\n`
          wat += `    call $${implMethod}\n`
          return wat
        }
      }
    }
    
    return wat
  }
  
  private tryOperatorOverload(op: string, left: string, right: string): string | null {
    const leftType = this.inferType(left)
    const key = `${leftType}_${op}`
    const overload = this.operatorOverloads.get(key)
    
    if (overload) {
      let wat = ''
      wat += this.convertExpression(left)
      wat += this.convertExpression(right)
      wat += `    call $${overload.methodName}\n`
      return wat
    }
    
    return null
  }
  
  private tryUnaryOperatorOverload(op: string, inner: string): string | null {
    const innerType = this.inferType(inner)
    const key = `${innerType}_${op}`
    const overload = this.operatorOverloads.get(key)
    
    if (overload) {
      let wat = ''
      wat += this.convertExpression(inner)
      wat += `    call $${overload.methodName}\n`
      return wat
    }
    
    return null
  }
  
  private inferType(expr: string): string {
    expr = expr.trim()
    
    if (/^\d+$/.test(expr)) return 'i32'
    if (expr === 'true' || expr === 'false') return 'bool'
    if (expr.startsWith('"') && expr.endsWith('"')) return 'String'
    
    if (this.localVars.has(expr)) {
      for (const [structName, structDef] of this.structDefs.entries()) {
        return structName
      }
    }
    
    return 'i32'
  }
  
  private parseDeriveAttribute(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    // #[derive(Trait1, Trait2, ...)]
    const match = line.match(/#\[derive\(([^)]+)\)\]/)
    
    if (!match) return startIndex
    
    const traits = match[1].split(',').map(t => t.trim())
    
    // Look ahead to find the struct/enum being derived
    let i = startIndex + 1
    while (i < lines.length) {
      const nextLine = lines[i].trim()
      
      if (nextLine.startsWith('struct ') || nextLine.startsWith('pub struct ')) {
        const structMatch = nextLine.match(/struct\s+(\w+)/)
        if (structMatch) {
          const structName = structMatch[1]
          this.generateDerivedImpls(structName, 'struct', traits)
        }
        break
      }
      
      if (nextLine.startsWith('enum ') || nextLine.startsWith('pub enum ')) {
        const enumMatch = nextLine.match(/enum\s+(\w+)/)
        if (enumMatch) {
          const enumName = enumMatch[1]
          this.generateDerivedImpls(enumName, 'enum', traits)
        }
        break
      }
      
      if (nextLine && !nextLine.startsWith('//') && !nextLine.startsWith('#[')) {
        break
      }
      
      i++
    }
    
    return startIndex
  }
  
  private generateDerivedImpls(typeName: string, typeKind: 'struct' | 'enum', traits: string[]) {
    traits.forEach(trait => {
      switch (trait) {
        case 'Debug':
          this.generateDebugImpl(typeName, typeKind)
          break
        case 'Clone':
          this.generateCloneImpl(typeName, typeKind)
          break
        case 'Copy':
          // Copy is just a marker trait, no methods needed
          break
        case 'PartialEq':
          this.generatePartialEqImpl(typeName, typeKind)
          break
        case 'Eq':
          // Eq is just a marker trait
          break
        case 'Default':
          this.generateDefaultImpl(typeName, typeKind)
          break
      }
    })
  }
  
  private generateDebugImpl(typeName: string, typeKind: 'struct' | 'enum') {
    // Generate fmt::Debug implementation
    // fn fmt(&self, f: &mut Formatter) -> Result
    const methodName = `${typeName}_fmt`
    
    // Just register that this impl exists
    const implKey = `Debug_for_${typeName}`
    const methods = new Map<string, string>()
    methods.set('fmt', methodName)
    this.traitImpls.set(implKey, { traitName: 'Debug', typeName, methods })
  }
  
  private generateCloneImpl(typeName: string, typeKind: 'struct' | 'enum') {
    // Generate clone implementation
    const methodName = `${typeName}_clone`
    
    const implKey = `Clone_for_${typeName}`
    const methods = new Map<string, string>()
    methods.set('clone', methodName)
    this.traitImpls.set(implKey, { traitName: 'Clone', typeName, methods })
    
    // Register operator overload for .clone()
  }
  
  private generatePartialEqImpl(typeName: string, typeKind: 'struct' | 'enum') {
    // Generate eq implementation
    const methodName = `${typeName}_eq`
    
    const implKey = `PartialEq_for_${typeName}`
    const methods = new Map<string, string>()
    methods.set('eq', methodName)
    this.traitImpls.set(implKey, { traitName: 'PartialEq', typeName, methods })
    
    // Register operator overload for ==
    this.operatorOverloads.set(`${typeName}_==`, {
      operator: '==',
      traitName: 'PartialEq',
      leftType: typeName,
      rightType: typeName,
      methodName
    })
  }
  
  private generateDefaultImpl(typeName: string, typeKind: 'struct' | 'enum') {
    // Generate default implementation
    const methodName = `${typeName}_default`
    
    const implKey = `Default_for_${typeName}`
    const methods = new Map<string, string>()
    methods.set('default', methodName)
    this.traitImpls.set(implKey, { traitName: 'Default', typeName, methods })
  }
  
  private parseMacroRules(lines: string[], startIndex: number): number {
    const line = lines[startIndex].trim()
    // macro_rules! name { ... }
    const match = line.match(/macro_rules!\s+(\w+)\s*\{?/)
    
    if (!match) return startIndex
    
    const macroName = match[1]
    const rules: MacroRule[] = []
    
    let braceCount = 0
    let started = false
    let i = startIndex
    let currentPattern = ''
    let currentReplacement = ''
    let inPattern = true
    
    while (i < lines.length) {
      const l = lines[i]
      if (l.includes('{')) {
        started = true
        braceCount += (l.match(/{/g) || []).length
      }
      if (l.includes('}')) {
        braceCount -= (l.match(/}/g) || []).length
      }
      
      if (started && braceCount > 0) {
        const trimmed = l.trim()
        
        // Pattern-replacement separator: =>
        if (trimmed.includes('=>')) {
          const parts = trimmed.split('=>')
          currentPattern = parts[0].trim().replace(/^\(/, '').replace(/\)$/, '')
          currentReplacement = parts[1].trim()
          inPattern = false
        }
        
        // Rule separator: ;
        if (trimmed.endsWith(';') && currentPattern && currentReplacement) {
          currentReplacement = currentReplacement.replace(/;$/, '').replace(/^\{/, '').replace(/\}$/, '')
          rules.push({
            pattern: currentPattern,
            replacement: currentReplacement
          })
          currentPattern = ''
          currentReplacement = ''
          inPattern = true
        }
      }
      
      if (started && braceCount === 0) break
      i++
    }
    
    this.macroDefs.set(macroName, { name: macroName, rules })
    
    return i
  }
  
  private expandMacro(macroName: string, args: string[]): string | null {
    const macroDef = this.macroDefs.get(macroName)
    if (!macroDef) return null
    
    for (const rule of macroDef.rules) {
      const expanded = this.tryExpandRule(rule, args)
      if (expanded) return expanded
    }
    
    return null
  }
  
  private tryExpandRule(rule: MacroRule, args: string[]): string | null {
    // Simple pattern matching: $name:type
    const patternVars: Map<string, string> = new Map()
    
    // Extract pattern variables
    const patternParts = rule.pattern.split(/[\s,()]+/).filter(p => p)
    const argParts = args
    
    // Match pattern to args
    let patternIdx = 0
    let argIdx = 0
    
    while (patternIdx < patternParts.length && argIdx < argParts.length) {
      const patPart = patternParts[patternIdx]
      const argPart = argParts[argIdx]
      
      // Check for metavariable: $name:tt, $name:expr, etc.
      const metaMatch = patPart.match(/\$(\w+):(\w+)/)
      if (metaMatch) {
        const varName = metaMatch[1]
        patternVars.set(varName, argPart)
        patternIdx++
        argIdx++
      } else if (patPart === argPart) {
        patternIdx++
        argIdx++
      } else {
        // No match
        return null
      }
    }
    
    // Substitute variables in replacement
    let replacement = rule.replacement
    patternVars.forEach((value, varName) => {
      replacement = replacement.replace(new RegExp(`\\$${varName}`, 'g'), value)
    })
    
    return replacement
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
