(self as any).MonacoEnvironment = {
  getWorkerUrl(_: any, label: string) {
    const base = '/rust-wasm-web-ide/'
    if (label === 'typescript' || label === 'javascript') {
      return base + 'ts.worker.js'
    }
    return base + 'editor.worker.js'
  }
}
