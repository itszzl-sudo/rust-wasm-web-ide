<template>
  <div class="main-layout">
    <div class="toolbar-container">
      <Toolbar
        :gpu-enabled="gpuReady"
        :thread-count="threadManager.getWorkerCount()"
        @run="handleRun"
        @save="handleSave"
        @format="handleFormat"
        @typeCheck="handleTypeCheck"
        @clippy="handleClippy"
        @parallelCheck="handleParallelCheck"
        @download="handleDownload"
        @generateWasm="handleGenerateWasm"
      />
    </div>
    <div class="content-container">
      <div class="sidebar">
        <FileExplorer
          :files="projectFiles"
          :active-file="activeFile"
          @select="handleFileSelect"
          @rename="handleFileRename"
          @delete="handleFileDelete"
          @download="handleFileDownload"
          @runWasm="handleRunWasmFile"
          @newFile="handleNewFile"
          @upload="handleUpload"
        />
      </div>
      <div class="editor-area">
        <TabBar
          :tabs="openTabs"
          :active-tab="activeFile"
          @select="handleTabSelect"
          @close="handleTabClose"
        />
        <div class="editor-container">
          <MonacoEditor
            ref="editorRef"
            v-model="currentCode"
            :filename="activeFile"
            @change="handleCodeChange"
          />
        </div>
      </div>
      <div class="log-container">
        <LogPanel ref="logPanelRef" />
      </div>
    </div>
    <div class="terminal-container">
      <Terminal ref="terminalRef" @execute="handleTerminalExecute" @log="handleTerminalLog" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Toolbar from '../Panel/Toolbar.vue'
import TabBar from '../Panel/TabBar.vue'
import FileExplorer from '../Panel/FileExplorer.vue'
import MonacoEditor from '../Editor/MonacoEditor.vue'
import LogPanel from '../Panel/LogPanel.vue'
import Terminal from '../Panel/Terminal.vue'
import { useProjectManager } from '@/utils/fileManager'
import { initRustInterpreter, interpretRustCode, formatRustCode } from '@/utils/rustInterpreter'
import { loadRustAnalyzer, typeCheck, isRustAnalyzerLoaded } from '@/utils/rustAnalyzer'
import { checkClippy, loadClippy, formatClippyWarnings, isClippyLoaded } from '@/utils/clippyChecker'
import { gpuExecutor } from '@/utils/gpuExecutor'
import { threadManager } from '@/utils/threadManager'
import { parallelSyntaxCheck, parallelAnalyze, interpreterPool } from '@/utils/parallelInterpreter'
import { compileRustToWasm, runCompiledWasm } from '@/utils/wasmCompiler'
import { executeWithPlayground, formatPlaygroundOutput } from '@/utils/rustPlayground'

const editorRef = ref<InstanceType<typeof MonacoEditor>>()
const logPanelRef = ref<InstanceType<typeof LogPanel>>()
const terminalRef = ref<InstanceType<typeof Terminal>>()

const { projectFiles, activeFile, openTabs, loadProject, addFile, removeFile, renameFileInTabs, saveFile, loadFile, downloadFile, downloadWasm, openTab, closeTab } = useProjectManager()

const currentCode = ref('')
const interpreterReady = ref(false)
const gpuReady = ref(false)
const threadReady = ref(false)
const currentExecutor = ref<string>(localStorage.getItem('rust_ide_executor') || 'interpreter')
const lastCompiledWasm = ref<Uint8Array | null>(null)

const handleRun = async () => {
  const executor = localStorage.getItem('rust_ide_executor') || 'interpreter'
  
  if (executor === 'playground') {
    await handleRunPlayground()
  } else {
    await handleRunInterpreter()
  }
}

const handleRunInterpreter = async () => {
  if (!interpreterReady.value) {
    logPanelRef.value?.addLog('error', 'Rust 解释器尚未初始化，请稍候...')
    return
  }
  
  logPanelRef.value?.addLog('info', '[解释器] 开始执行代码...')
  logPanelRef.value?.addLog('info', `代码行数: ${currentCode.value.split('\n').length}`)
  
  try {
    const result = await interpretRustCode(currentCode.value)
    if (result.error) {
      logPanelRef.value?.addLog('error', result.error)
    } else {
      logPanelRef.value?.addLog('info', '执行成功')
      if (result.output) {
        result.output.split('\n').forEach(line => {
          if (line.trim()) {
            logPanelRef.value?.addLog('info', line)
          }
        })
      }
    }
    logPanelRef.value?.addLog('info', `执行耗时: ${result.execution_time}ms`)
  } catch (e) {
    logPanelRef.value?.addLog('error', `执行失败: ${(e as Error).message}`)
  }
}

const handleRunPlayground = async () => {
  logPanelRef.value?.addLog('info', '[Playground] 开始编译和执行...')
  logPanelRef.value?.addLog('info', `代码行数: ${currentCode.value.split('\n').length}`)
  
  try {
    const result = await executeWithPlayground(
      currentCode.value,
      { channel: 'stable', edition: '2021', mode: 'debug' },
      (progress, message) => {
        logPanelRef.value?.addLog('info', `[${progress}%] ${message}`)
      }
    )
    
    const output = formatPlaygroundOutput(result)
    output.split('\n').forEach(line => {
      if (line.trim()) {
        const logType = line.includes('error') ? 'error' : line.includes('warning') ? 'warn' : 'info'
        logPanelRef.value?.addLog(logType, line)
      }
    })
  } catch (e) {
    logPanelRef.value?.addLog('error', `Playground 执行失败: ${(e as Error).message}`)
  }
}

const handleSave = () => {
  if (activeFile.value) {
    saveFile(activeFile.value, currentCode.value)
    logPanelRef.value?.addLog('info', `已保存: ${activeFile.value}`)
  }
}

const handleFileRename = (oldPath: string, newPath: string) => {
  if (renameFileInTabs(oldPath, newPath)) {
    logPanelRef.value?.addLog('info', `已重命名: ${oldPath} → ${newPath}`)
  } else {
    logPanelRef.value?.addLog('error', `重命名失败: ${newPath} 已存在`)
  }
}

const handleFileDelete = (path: string) => {
  if (confirm(`确定删除 ${path}？`)) {
    if (removeFile(path)) {
      logPanelRef.value?.addLog('info', `已删除: ${path}`)
    } else {
      logPanelRef.value?.addLog('error', `删除失败: ${path}`)
    }
  }
}

const handleFileDownload = (path: string) => {
  const { downloadFile, downloadWasm } = useFileManager()
  const content = loadFile(path)
  if (content === null) return
  
  if (path.endsWith('.wasm')) {
    try {
      const wasmBinary = new Uint8Array(JSON.parse(content))
      downloadWasm(path, wasmBinary)
    } catch {
      downloadFile(path)
    }
  } else {
    downloadFile(path)
  }
  logPanelRef.value?.addLog('info', `已下载: ${path}`)
}

const handleFormat = async () => {
  try {
    const formatted = formatRustCode(currentCode.value)
    currentCode.value = formatted
    logPanelRef.value?.addLog('info', '代码格式化完成')
  } catch (e) {
    logPanelRef.value?.addLog('error', `格式化失败: ${(e as Error).message}`)
  }
}

const handleNewFile = () => {
  const filename = `untitled_${Date.now()}.rs`
  if (addFile(filename, '// New Rust file\nfn main() {\n    println!("Hello, Rust!");\n}\n')) {
    logPanelRef.value?.addLog('info', `已创建: ${filename}`)
  } else {
    logPanelRef.value?.addLog('error', `创建失败: ${filename} 已存在`)
  }
}

const handleTabSelect = (path: string) => {
  if (activeFile.value) {
    saveFile(activeFile.value, currentCode.value)
  }
  openTab(path)
  currentCode.value = loadFile(path) || ''
}

const handleTabClose = (path: string) => {
  if (activeFile.value) {
    saveFile(activeFile.value, currentCode.value)
  }
  closeTab(path)
  if (activeFile.value) {
    currentCode.value = loadFile(activeFile.value) || ''
  }
}

const handleUpload = (files: { path: string; content: string }[]) => {
  files.forEach(({ path, content }) => {
    addFile(path, content)
  })
  logPanelRef.value?.addLog('info', `已上传 ${files.length} 个文件`)
}

const handleTypeCheck = async () => {
  if (!isRustAnalyzerLoaded()) {
    logPanelRef.value?.addLog('info', '正在加载 rust-analyzer（约 4MB），请稍候...')
    try {
      await loadRustAnalyzer()
      logPanelRef.value?.addLog('info', 'rust-analyzer 加载完成')
    } catch (e) {
      logPanelRef.value?.addLog('error', `rust-analyzer 加载失败: ${(e as Error).message}`)
      return
    }
  }
  
  logPanelRef.value?.addLog('info', '开始类型检查...')
  try {
    const result = await typeCheck(currentCode.value)
    if (result.errors === 0 && result.warnings === 0) {
      logPanelRef.value?.addLog('info', '类型检查通过，无错误或警告')
    } else {
      logPanelRef.value?.addLog('info', `类型检查完成: ${result.errors} 个错误, ${result.warnings} 个警告`)
      result.diagnostics.forEach(d => {
        const severity = d.severity === 'error' ? 'error' : d.severity === 'warning' ? 'warn' : 'info'
        logPanelRef.value?.addLog(severity, `行 ${d.range.start.line + 1}: ${d.message}`)
      })
    }
  } catch (e) {
    logPanelRef.value?.addLog('error', `类型检查失败: ${(e as Error).message}`)
  }
}

const handleClippy = async () => {
  if (!isClippyLoaded()) {
    logPanelRef.value?.addLog('info', '正在加载 Clippy WASM，请稍候...')
    try {
      await loadClippy()
      logPanelRef.value?.addLog('info', 'Clippy WASM 加载完成')
    } catch (e) {
      logPanelRef.value?.addLog('error', `Clippy 加载失败: ${(e as Error).message}`)
      return
    }
  }
  
  logPanelRef.value?.addLog('info', '开始 Clippy 规范检查...')
  try {
    const warnings = await checkClippy(currentCode.value)
    const output = formatClippyWarnings(warnings)
    
    output.split('\n').forEach(line => {
      if (line.trim()) {
        if (line.includes('❌')) {
          logPanelRef.value?.addLog('error', line)
        } else if (line.includes('⚠️')) {
          logPanelRef.value?.addLog('warn', line)
        } else if (line.includes('✅')) {
          logPanelRef.value?.addLog('success', line)
        } else {
          logPanelRef.value?.addLog('info', line)
        }
      }
    })
  } catch (e) {
    logPanelRef.value?.addLog('error', `Clippy 检查失败: ${(e as Error).message}`)
  }
}

const handleParallelCheck = async () => {
  logPanelRef.value?.addLog('info', '启动多域名并行纠错（24域名）...')
  
  try {
    const startTime = performance.now()
    
    const [syntaxResult, analyzeResult] = await Promise.all([
      parallelSyntaxCheck(currentCode.value),
      parallelAnalyze(currentCode.value)
    ])
    
    const totalTime = performance.now() - startTime
    
    logPanelRef.value?.addLog('info', `并行纠错完成，耗时: ${totalTime.toFixed(0)}ms`)
    logPanelRef.value?.addLog('info', `检查域名: ${syntaxResult.checkedBy?.join(', ')}`)
    
    if (syntaxResult.errors?.length > 0) {
      logPanelRef.value?.addLog('error', `发现 ${syntaxResult.errors.length} 个错误`)
      syntaxResult.errors.forEach((e: any) => {
        logPanelRef.value?.addLog('error', `行 ${e.line}: ${e.message}`)
      })
    }
    
    if (syntaxResult.warnings?.length > 0) {
      logPanelRef.value?.addLog('warn', `发现 ${syntaxResult.warnings.length} 个警告`)
      syntaxResult.warnings.forEach((w: any) => {
        logPanelRef.value?.addLog('warn', `行 ${w.line}: ${w.message}`)
      })
    }
    
    if (analyzeResult.functions?.length > 0) {
      logPanelRef.value?.addLog('info', `函数: ${analyzeResult.functions.map((f: any) => f.name).join(', ')}`)
    }
    if (analyzeResult.structs?.length > 0) {
      logPanelRef.value?.addLog('info', `结构体: ${analyzeResult.structs.map((s: any) => s.name).join(', ')}`)
    }
    if (analyzeResult.enums?.length > 0) {
      logPanelRef.value?.addLog('info', `枚举: ${analyzeResult.enums.map((e: any) => e.name).join(', ')}`)
    }
    
    const stats = interpreterPool.getStats()
    logPanelRef.value?.addLog('info', `活跃 Worker: ${stats.activeWorkers} 个`)
    
  } catch (e) {
    logPanelRef.value?.addLog('error', `并行纠错失败: ${(e as Error).message}`)
  }
}

const handleDownload = () => {
  const filename = activeFile.value || 'main.rs'
  const blob = new Blob([currentCode.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  logPanelRef.value?.addLog('info', `已下载: ${filename}`)
}

const handleCompile = async () => {
  logPanelRef.value?.addLog('info', '开始编译 Rust → WAT → WASM...')
  
  try {
    const result = await compileRustToWasm(currentCode.value)
    
    if (result.success && result.wasm && result.wat) {
      logPanelRef.value?.addLog('info', `✓ 编译成功!`)
      logPanelRef.value?.addLog('info', `Rust: ${result.stats.rustLines} 行`)
      logPanelRef.value?.addLog('info', `WAT: ${result.stats.watLines} 行`)
      logPanelRef.value?.addLog('info', `WASM: ${result.stats.wasmBytes} 字节`)
      logPanelRef.value?.addLog('info', `耗时: ${result.stats.compileTime.toFixed(0)}ms`)
      
      lastCompiledWasm.value = result.wasm
      
      logPanelRef.value?.addLog('info', '\n--- WAT 代码 ---')
      result.wat.split('\n').slice(0, 20).forEach(line => {
        logPanelRef.value?.addLog('info', line)
      })
      if (result.wat.split('\n').length > 20) {
        logPanelRef.value?.addLog('info', '...(省略)')
      }
      
      const wasmBlob = new Blob([result.wasm], { type: 'application/wasm' })
      const url = URL.createObjectURL(wasmBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'module.wasm'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      logPanelRef.value?.addLog('info', '✓ WASM 文件已下载')
      
    } else {
      logPanelRef.value?.addLog('error', `✗ 编译失败: ${result.error}`)
    }
  } catch (e) {
    logPanelRef.value?.addLog('error', `编译错误: ${(e as Error).message}`)
  }
}

const handleGenerateWasm = async () => {
  if (!activeFile.value || !activeFile.value.endsWith('.rs')) {
    logPanelRef.value?.addLog('error', '请先选择一个 .rs 文件')
    return
  }
  
  logPanelRef.value?.addLog('info', '[生成WASM] 开始编译...')
  
  try {
    const result = await compileRustToWasm(currentCode.value)
    
    if (result.success && result.wasm) {
      const wasmFileName = activeFile.value.replace(/\.rs$/, '.wasm')
      const wasmContent = JSON.stringify(Array.from(result.wasm))
      
      if (addFile(wasmFileName, wasmContent)) {
        logPanelRef.value?.addLog('info', `✓ 已生成: ${wasmFileName}`)
        logPanelRef.value?.addLog('info', `  WAT: ${result.stats.watLines} 行`)
        logPanelRef.value?.addLog('info', `  WASM: ${result.stats.wasmBytes} 字节`)
        logPanelRef.value?.addLog('info', `  耗时: ${result.stats.compileTime.toFixed(0)}ms`)
      } else {
        logPanelRef.value?.addLog('error', `文件已存在: ${wasmFileName}`)
      }
    } else {
      logPanelRef.value?.addLog('error', `编译失败: ${result.error}`)
    }
  } catch (e) {
    logPanelRef.value?.addLog('error', `生成失败: ${(e as Error).message}`)
  }
}

const handleRunWasmFile = async (wasmPath: string) => {
  const content = loadFile(wasmPath)
  if (!content) {
    logPanelRef.value?.addLog('error', `无法加载: ${wasmPath}`)
    return
  }
  
  logPanelRef.value?.addLog('info', `[试运行] ${wasmPath}`)
  
  try {
    const wasmArray = JSON.parse(content)
    const wasmBinary = new Uint8Array(wasmArray)
    const result = await runCompiledWasm(wasmBinary, 'main', [])
    logPanelRef.value?.addLog('info', `✓ 运行成功`)
    logPanelRef.value?.addLog('info', `返回值: ${result}`)
  } catch (e) {
    logPanelRef.value?.addLog('error', `运行失败: ${(e as Error).message}`)
  }
}

const handleRunWasm = async () => {
  if (!lastCompiledWasm.value) {
    logPanelRef.value?.addLog('info', '[WASM] 尚未编译，正在编译...')
    await handleCompile()
    if (!lastCompiledWasm.value) {
      logPanelRef.value?.addLog('error', '编译失败，无法运行 WASM')
      return
    }
  }
  
  logPanelRef.value?.addLog('info', '[WASM] 开始运行编译后的 WASM...')
  
  try {
    const result = await runCompiledWasm(lastCompiledWasm.value, 'main', [])
    logPanelRef.value?.addLog('info', `✓ WASM 运行成功`)
    logPanelRef.value?.addLog('info', `返回值: ${result}`)
  } catch (e) {
    logPanelRef.value?.addLog('error', `WASM 运行失败: ${(e as Error).message}`)
  }
}

const handleFileSelect = (filename: string) => {
  if (activeFile.value) {
    saveFile(activeFile.value, currentCode.value)
  }
  setActiveFile(filename)
  currentCode.value = loadFile(filename) || ''
}

const handleCodeChange = (code: string) => {
  currentCode.value = code
}

const handleTerminalExecute = (command: string, args: string[]) => {
  if (command === 'cargo new') {
    const projectName = args[0]
    if (projectName) {
      addFile(`${projectName}/Cargo.toml`, `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"

[dependencies]
`)
      addFile(`${projectName}/src/main.rs`, `fn main() {
    println!("Hello, world!");
}
`)
      setActiveFile(`${projectName}/src/main.rs`)
      currentCode.value = `fn main() {
    println!("Hello, world!");
}
`
    }
  }
}

const handleTerminalLog = (level: string, message: string) => {
  const logLevel = level as 'info' | 'error' | 'warn'
  logPanelRef.value?.addLog(logLevel, message)
}

onMounted(async () => {
  const buildTime = new Date().toLocaleString('zh-CN')
  logPanelRef.value?.addLog('info', `构建时间: ${buildTime}`)
  
  loadProject()
  if (activeFile.value) {
    currentCode.value = loadFile(activeFile.value) || ''
  }
  
  logPanelRef.value?.addLog('info', '正在初始化 Rust 解释器...')
  try {
    await initRustInterpreter()
    interpreterReady.value = true
    logPanelRef.value?.addLog('info', 'Rust 解释器初始化完成')
  } catch (e) {
    logPanelRef.value?.addLog('error', `Rust 解释器初始化失败: ${(e as Error).message}`)
  }

  logPanelRef.value?.addLog('info', '正在检测 GPU 加速...')
  try {
    const gpuInit = await gpuExecutor.initialize()
    gpuReady.value = gpuInit
    if (gpuInit) {
      logPanelRef.value?.addLog('info', 'GPU 加速已启用（WebGPU）')
    } else {
      logPanelRef.value?.addLog('warn', 'GPU 加速不可用，将使用 CPU 执行')
    }
  } catch (e) {
    logPanelRef.value?.addLog('warn', `GPU 初始化失败: ${(e as Error).message}`)
  }

  logPanelRef.value?.addLog('info', '正在初始化多线程分析器...')
  threadManager.setErrorHandler((msg) => {
    logPanelRef.value?.addLog('info', msg)
  })
  try {
    await threadManager.initialize(4)
    threadReady.value = true
    const workerCount = threadManager.getWorkerCount()
    logPanelRef.value?.addLog('info', `多线程分析器已启用（${workerCount} 个 Worker）`)
  } catch (e) {
    logPanelRef.value?.addLog('warn', `多线程初始化失败: ${(e as Error).message}`)
  }
})

onBeforeUnmount(() => {
  gpuExecutor.destroy()
  threadManager.terminate()
})
</script>

<style scoped>
.main-layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100vh;
  background-color: #1e1e1e;
}

.toolbar-container {
  grid-row: 1;
  height: 48px;
  border-bottom: 1px solid #3c3c3c;
}

.content-container {
  grid-row: 2;
  display: grid;
  grid-template-columns: 240px 1fr 300px;
  overflow: hidden;
}

.sidebar {
  grid-column: 1;
  background-color: #252526;
  border-right: 1px solid #3c3c3c;
  overflow: auto;
}

.editor-area {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}

.log-container {
  grid-column: 3;
  background-color: #1e1e1e;
  border-left: 1px solid #3c3c3c;
  overflow: hidden;
}

.terminal-container {
  grid-row: 3;
  height: 200px;
  border-top: 2px solid #3c3c3c;
}
</style>
