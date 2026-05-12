(self as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    const base = '/rust-wasm-web-ide/'
    const workerPath = label === 'typescript' || label === 'javascript'
      ? base + 'ts.worker.js'
      : base + 'editor.worker.js'
    return new Worker(workerPath, { type: 'classic' })
  }
}
