export interface WebAPI {
  name: string
  module: string
  methods: Map<string, { params: string[]; returnType: string }>
  properties: Map<string, string>
}

export class WebSysStubs {
  private apis: Map<string, WebAPI> = new Map()
  
  constructor() {
    this.initDOMAPIs()
    this.initCanvasAPIs()
    this.initFetchAPIs()
    this.initConsoleAPIs()
    this.initStorageAPIs()
  }
  
  private initDOMAPIs() {
    const documentMethods = new Map<string, { params: string[]; returnType: string }>()
    documentMethods.set('getElementById', { params: ['id: &str'], returnType: 'Element' })
    documentMethods.set('querySelector', { params: ['selector: &str'], returnType: 'Element' })
    documentMethods.set('querySelectorAll', { params: ['selector: &str'], returnType: 'NodeList' })
    documentMethods.set('createElement', { params: ['tag: &str'], returnType: 'Element' })
    documentMethods.set('createTextNode', { params: ['text: &str'], returnType: 'TextNode' })
    documentMethods.set('body', { params: [], returnType: 'HtmlElement' })
    documentMethods.set('head', { params: [], returnType: 'HtmlElement' })
    
    const documentProps = new Map<string, string>()
    documentProps.set('title', 'String')
    documentProps.set('URL', 'String')
    documentProps.set('documentElement', 'Element')
    
    this.apis.set('Document', {
      name: 'Document',
      module: 'web_sys',
      methods: documentMethods,
      properties: documentProps
    })
    
    const elementMethods = new Map<string, { params: string[]; returnType: string }>()
    elementMethods.set('getAttribute', { params: ['name: &str'], returnType: 'String' })
    elementMethods.set('setAttribute', { params: ['name: &str', 'value: &str'], returnType: '()' })
    elementMethods.set('removeAttribute', { params: ['name: &str'], returnType: '()' })
    elementMethods.set('appendChild', { params: ['child: &Node'], returnType: 'Node' })
    elementMethods.set('removeChild', { params: ['child: &Node'], returnType: 'Node' })
    elementMethods.set('cloneNode', { params: ['deep: bool'], returnType: 'Node' })
    elementMethods.set('addEventListener', { params: ['type: &str', 'listener: &EventListener'], returnType: '()' })
    elementMethods.set('removeEventListener', { params: ['type: &str', 'listener: &EventListener'], returnType: '()' })
    
    const elementProps = new Map<string, string>()
    elementProps.set('id', 'String')
    elementProps.set('className', 'String')
    elementProps.set('innerHTML', 'String')
    elementProps.set('outerHTML', 'String')
    elementProps.set('textContent', 'String')
    elementProps.set('tagName', 'String')
    elementProps.set('parentNode', 'Node')
    elementProps.set('firstChild', 'Node')
    elementProps.set('lastChild', 'Node')
    elementProps.set('nextSibling', 'Node')
    elementProps.set('previousSibling', 'Node')
    
    this.apis.set('Element', {
      name: 'Element',
      module: 'web_sys',
      methods: elementMethods,
      properties: elementProps
    })
    
    const windowMethods = new Map<string, { params: string[]; returnType: string }>()
    windowMethods.set('alert', { params: ['message: &str'], returnType: '()' })
    windowMethods.set('confirm', { params: ['message: &str'], returnType: 'bool' })
    windowMethods.set('prompt', { params: ['message: &str', 'default: &str'], returnType: 'String' })
    windowMethods.set('setTimeout', { params: ['callback: &Function', 'delay: i32'], returnType: 'i32' })
    windowMethods.set('setInterval', { params: ['callback: &Function', 'delay: i32'], returnType: 'i32' })
    windowMethods.set('clearTimeout', { params: ['id: i32'], returnType: '()' })
    windowMethods.set('clearInterval', { params: ['id: i32'], returnType: '()' })
    windowMethods.set('fetch', { params: ['url: &str'], returnType: 'Promise' })
    
    const windowProps = new Map<string, string>()
    windowProps.set('document', 'Document')
    windowProps.set('location', 'Location')
    windowProps.set('history', 'History')
    windowProps.set('navigator', 'Navigator')
    windowProps.set('innerWidth', 'i32')
    windowProps.set('innerHeight', 'i32')
    
    this.apis.set('Window', {
      name: 'Window',
      module: 'web_sys',
      methods: windowMethods,
      properties: windowProps
    })
  }
  
  private initCanvasAPIs() {
    const ctxMethods = new Map<string, { params: string[]; returnType: string }>()
    ctxMethods.set('fillRect', { params: ['x: f64', 'y: f64', 'w: f64', 'h: f64'], returnType: '()' })
    ctxMethods.set('strokeRect', { params: ['x: f64', 'y: f64', 'w: f64', 'h: f64'], returnType: '()' })
    ctxMethods.set('clearRect', { params: ['x: f64', 'y: f64', 'w: f64', 'h: f64'], returnType: '()' })
    ctxMethods.set('fillText', { params: ['text: &str', 'x: f64', 'y: f64'], returnType: '()' })
    ctxMethods.set('strokeText', { params: ['text: &str', 'x: f64', 'y: f64'], returnType: '()' })
    ctxMethods.set('measureText', { params: ['text: &str'], returnType: 'TextMetrics' })
    ctxMethods.set('beginPath', { params: [], returnType: '()' })
    ctxMethods.set('closePath', { params: [], returnType: '()' })
    ctxMethods.set('moveTo', { params: ['x: f64', 'y: f64'], returnType: '()' })
    ctxMethods.set('lineTo', { params: ['x: f64', 'y: f64'], returnType: '()' })
    ctxMethods.set('arc', { params: ['x: f64', 'y: f64', 'r: f64', 'start: f64', 'end: f64'], returnType: '()' })
    ctxMethods.set('fill', { params: [], returnType: '()' })
    ctxMethods.set('stroke', { params: [], returnType: '()' })
    ctxMethods.set('save', { params: [], returnType: '()' })
    ctxMethods.set('restore', { params: [], returnType: '()' })
    ctxMethods.set('translate', { params: ['x: f64', 'y: f64'], returnType: '()' })
    ctxMethods.set('rotate', { params: ['angle: f64'], returnType: '()' })
    ctxMethods.set('scale', { params: ['x: f64', 'y: f64'], returnType: '()' })
    ctxMethods.set('drawImage', { params: ['image: &Image', 'x: f64', 'y: f64'], returnType: '()' })
    
    const ctxProps = new Map<string, string>()
    ctxProps.set('fillStyle', 'String')
    ctxProps.set('strokeStyle', 'String')
    ctxProps.set('lineWidth', 'f64')
    ctxProps.set('font', 'String')
    ctxProps.set('textAlign', 'String')
    ctxProps.set('textBaseline', 'String')
    ctxProps.set('globalAlpha', 'f64')
    ctxProps.set('canvas', 'HtmlCanvasElement')
    
    this.apis.set('CanvasRenderingContext2d', {
      name: 'CanvasRenderingContext2d',
      module: 'web_sys',
      methods: ctxMethods,
      properties: ctxProps
    })
  }
  
  private initFetchAPIs() {
    const responseMethods = new Map<string, { params: string[]; returnType: string }>()
    responseMethods.set('json', { params: [], returnType: 'Promise' })
    responseMethods.set('text', { params: [], returnType: 'Promise' })
    responseMethods.set('arrayBuffer', { params: [], returnType: 'Promise' })
    responseMethods.set('blob', { params: [], returnType: 'Promise' })
    
    const responseProps = new Map<string, string>()
    responseProps.set('ok', 'bool')
    responseProps.set('status', 'i32')
    responseProps.set('statusText', 'String')
    responseProps.set('headers', 'Headers')
    responseProps.set('url', 'String')
    
    this.apis.set('Response', {
      name: 'Response',
      module: 'web_sys',
      methods: responseMethods,
      properties: responseProps
    })
    
    const requestMethods = new Map<string, { params: string[]; returnType: string }>()
    requestMethods.set('text', { params: [], returnType: 'Promise' })
    requestMethods.set('json', { params: [], returnType: 'Promise' })
    
    const requestProps = new Map<string, string>()
    requestProps.set('method', 'String')
    requestProps.set('url', 'String')
    requestProps.set('headers', 'Headers')
    
    this.apis.set('Request', {
      name: 'Request',
      module: 'web_sys',
      methods: requestMethods,
      properties: requestProps
    })
  }
  
  private initConsoleAPIs() {
    const consoleMethods = new Map<string, { params: string[]; returnType: string }>()
    consoleMethods.set('log', { params: ['...args'], returnType: '()' })
    consoleMethods.set('info', { params: ['...args'], returnType: '()' })
    consoleMethods.set('warn', { params: ['...args'], returnType: '()' })
    consoleMethods.set('error', { params: ['...args'], returnType: '()' })
    consoleMethods.set('debug', { params: ['...args'], returnType: '()' })
    consoleMethods.set('trace', { params: ['...args'], returnType: '()' })
    consoleMethods.set('table', { params: ['data: &JsValue'], returnType: '()' })
    consoleMethods.set('dir', { params: ['obj: &JsValue'], returnType: '()' })
    consoleMethods.set('time', { params: ['label: &str'], returnType: '()' })
    consoleMethods.set('timeEnd', { params: ['label: &str'], returnType: '()' })
    consoleMethods.set('group', { params: ['...args'], returnType: '()' })
    consoleMethods.set('groupEnd', { params: [], returnType: '()' })
    consoleMethods.set('clear', { params: [], returnType: '()' })
    
    this.apis.set('console', {
      name: 'console',
      module: 'web_sys',
      methods: consoleMethods,
      properties: new Map()
    })
  }
  
  private initStorageAPIs() {
    const storageMethods = new Map<string, { params: string[]; returnType: string }>()
    storageMethods.set('getItem', { params: ['key: &str'], returnType: 'String' })
    storageMethods.set('setItem', { params: ['key: &str', 'value: &str'], returnType: '()' })
    storageMethods.set('removeItem', { params: ['key: &str'], returnType: '()' })
    storageMethods.set('clear', { params: [], returnType: '()' })
    storageMethods.set('key', { params: ['index: i32'], returnType: 'String' })
    
    const storageProps = new Map<string, string>()
    storageProps.set('length', 'i32')
    
    this.apis.set('Storage', {
      name: 'Storage',
      module: 'web_sys',
      methods: storageMethods,
      properties: storageProps
    })
  }
  
  getAPI(name: string): WebAPI | undefined {
    return this.apis.get(name)
  }
  
  getMethod(apiName: string, methodName: string): { params: string[]; returnType: string } | undefined {
    const api = this.apis.get(apiName)
    if (api) {
      return api.methods.get(methodName)
    }
    return undefined
  }
  
  getProperty(apiName: string, propName: string): string | undefined {
    const api = this.apis.get(apiName)
    if (api) {
      return api.properties.get(propName)
    }
    return undefined
  }
  
  hasAPI(name: string): boolean {
    return this.apis.has(name)
  }
  
  hasMethod(apiName: string, methodName: string): boolean {
    const api = this.apis.get(apiName)
    if (api) {
      return api.methods.has(methodName)
    }
    return false
  }
  
  listAPIs(): string[] {
    return Array.from(this.apis.keys())
  }
  
  generateStubCode(apiName: string): string {
    const api = this.apis.get(apiName)
    if (!api) return ''
    
    let code = `// ${apiName} stub (from ${api.module})\n`
    code += `pub struct ${apiName};\n\n`
    
    api.methods.forEach((method, methodName) => {
      const params = method.params.join(', ')
      code += `impl ${apiName} {\n`
      code += `    pub fn ${methodName}(${params}) -> ${method.returnType} {\n`
      code += `        // TODO: implement\n`
      code += `        unimplemented!()\n`
      code += `    }\n`
      code += `}\n\n`
    })
    
    return code
  }
  
  generateAllStubs(): string {
    let code = '// Web API Stubs (auto-generated)\n\n'
    
    this.apis.forEach((_, name) => {
      code += this.generateStubCode(name)
      code += '\n'
    })
    
    return code
  }
}
