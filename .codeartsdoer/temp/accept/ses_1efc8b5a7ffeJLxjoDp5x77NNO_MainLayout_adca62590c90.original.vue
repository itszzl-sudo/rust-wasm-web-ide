<template>
  <div class="main-layout">
    <div class="toolbar-container">
      <Toolbar
        @run="handleRun"
        @save="handleSave"
        @format="handleFormat"
        @newFile="handleNewFile"
      />
    </div>
    <div class="content-container">
      <div class="sidebar">
        <FileExplorer
          :files="projectFiles"
          :active-file="activeFile"
          @select="handleFileSelect"
        />
      </div>
      <div class="editor-container">
        <MonacoEditor
          ref="editorRef"
          v-model="currentCode"
          :filename="activeFile"
          @change="handleCodeChange"
        />
      </div>
      <div class="log-container">
        <LogPanel ref="logPanelRef" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Toolbar from '../Panel/Toolbar.vue'
import FileExplorer from '../Panel/FileExplorer.vue'
import MonacoEditor from '../Editor/MonacoEditor.vue'
import LogPanel from '../Panel/LogPanel.vue'
import { useProjectManager } from '@/utils/projectManager'
import { useFileManager } from '@/utils/fileManager'
import { initRustInterpreter, interpretRustCode, formatRustCode } from '@/utils/rustInterpreter'

const editorRef = ref<InstanceType<typeof MonacoEditor>>()
const logPanelRef = ref<InstanceType<typeof LogPanel>>()

const { projectFiles, activeFile, setActiveFile, loadProject } = useProjectManager()
const { saveFile, loadFile, createFile } = useFileManager()

const currentCode = ref('')
const interpreterReady = ref(false)

const handleRun = async () => {
  if (!interpreterReady.value) {
    logPanelRef.value?.addLog('error', 'Rust 解释器尚未初始化，请稍候...')
    return
  }
  
  logPanelRef.value?.addLog('info', '开始执行代码...')
  logPanelRef.value?.addLog('info', `代码行数: ${currentCode.value.split('\n').length}`)
  
  try {
    const result = interpretRustCode(currentCode.value)
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

const handleSave = () => {
  if (activeFile.value) {
    saveFile(activeFile.value, currentCode.value)
    logPanelRef.value?.addLog('info', `已保存: ${activeFile.value}`)
  }
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
  const filename = `src/new_${Date.now()}.rs`
  createFile(filename, '// New Rust file\nfn main() {\n    println!("Hello, Rust!");\n}\n')
  loadProject()
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

onMounted(async () => {
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
})
</script>

<style scoped>
.main-layout {
  display: grid;
  grid-template-rows: auto 1fr;
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

.editor-container {
  grid-column: 2;
  overflow: hidden;
}

.log-container {
  grid-column: 3;
  background-color: #1e1e1e;
  border-left: 1px solid #3c3c3c;
  overflow: hidden;
}
</style>
