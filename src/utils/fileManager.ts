import { ref, watch } from 'vue'

const STORAGE_KEY_PREFIX = 'rust_ide_file_'
const PROJECT_KEY = 'rust_ide_project'

interface Project {
  name: string
  crateType: 'bin' | 'lib'
  files: string[]
  createdAt: number
  updatedAt: number
}

export function useFileManager() {
  const saveFile = (path: string, content: string): boolean => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + path, content)
      return true
    } catch (e) {
      console.error('Failed to save file:', e)
      return false
    }
  }

  const loadFile = (path: string): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEY_PREFIX + path)
    } catch (e) {
      console.error('Failed to load file:', e)
      return null
    }
  }

  const deleteFile = (path: string): boolean => {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + path)
      return true
    } catch (e) {
      console.error('Failed to delete file:', e)
      return false
    }
  }

  const fileExists = (path: string): boolean => {
    return localStorage.getItem(STORAGE_KEY_PREFIX + path) !== null
  }

  const createFile = (path: string, content: string): boolean => {
    if (fileExists(path)) {
      return false
    }
    return saveFile(path, content)
  }

  const renameFile = (oldPath: string, newPath: string): boolean => {
    const content = loadFile(oldPath)
    if (content === null) return false
    if (fileExists(newPath)) return false
    
    if (!saveFile(newPath, content)) return false
    return deleteFile(oldPath)
  }

  const listFiles = (): string[] => {
    const files: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        files.push(key.substring(STORAGE_KEY_PREFIX.length))
      }
    }
    return files.sort()
  }

  const getFileType = (path: string): 'rust' | 'wasm' | 'toml' | 'other' => {
    if (path.endsWith('.rs')) return 'rust'
    if (path.endsWith('.wasm')) return 'wasm'
    if (path.endsWith('.toml')) return 'toml'
    return 'other'
  }

  const downloadFile = (path: string): void => {
    const content = loadFile(path)
    if (content === null) return
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path.split('/').pop() || path
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadWasm = (path: string, wasmBinary: Uint8Array): void => {
    const blob = new Blob([wasmBinary], { type: 'application/wasm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path.split('/').pop() || path
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    saveFile,
    loadFile,
    deleteFile,
    fileExists,
    createFile,
    renameFile,
    listFiles,
    getFileType,
    downloadFile,
    downloadWasm
  }
}

export function useProjectManager() {
  const { saveFile, loadFile, listFiles, createFile, deleteFile, renameFile, downloadFile, downloadWasm } = useFileManager()

  const projectFiles = ref<string[]>([])
  const activeFile = ref<string>()
  const openTabs = ref<{ path: string; modified?: boolean }[]>([])
  const autoSaveEnabled = ref(true)

  const createDefaultProject = (): void => {
    const defaultFiles = {
      'src/main.rs': `// Rust WASM Web IDE
// 
// 执行器说明：
// • Iris Interpreter: 本地 WASM 解释器，快速离线执行
// • Rust Playground: 官方 rustc 编译器，完整语法支持
// 
// 快捷键：
// • Ctrl+S: 保存
// • Ctrl+Enter: 运行
// • Ctrl+Shift+F: 格式化
// 

fn main() {
    println!("Hello, Rust!");
    
    let x = 42;
    println!("x = {}", x);
    
    for i in 0..5 {
        println!("i = {}", i);
    }
}
`,
      'Cargo.toml': `[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
`
    }

    Object.entries(defaultFiles).forEach(([path, content]) => {
      saveFile(path, content)
    })

    const project: Project = {
      name: 'my-project',
      crateType: 'bin',
      files: Object.keys(defaultFiles),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    localStorage.setItem(PROJECT_KEY, JSON.stringify(project))
  }

  const loadProject = (): void => {
    const projectData = localStorage.getItem(PROJECT_KEY)
    if (!projectData) {
      createDefaultProject()
    }

    projectFiles.value = listFiles()
    if (projectFiles.value.length > 0 && !activeFile.value) {
      const mainRs = projectFiles.value.find(f => f === 'src/main.rs')
      const untitledRs = projectFiles.value.find(f => f === 'untitled.rs')
      const firstRs = projectFiles.value.find(f => f.endsWith('.rs'))
      activeFile.value = mainRs || untitledRs || firstRs || projectFiles.value[0]
      
      if (activeFile.value) {
        openTab(activeFile.value)
      }
    }
  }

  const setActiveFile = (filename: string): void => {
    activeFile.value = filename
  }

  const openTab = (path: string): void => {
    if (!openTabs.value.find(t => t.path === path)) {
      openTabs.value.push({ path })
    }
    activeFile.value = path
  }

  const closeTab = (path: string): void => {
    const index = openTabs.value.findIndex(t => t.path === path)
    if (index === -1) return
    
    openTabs.value.splice(index, 1)
    
    if (activeFile.value === path) {
      if (openTabs.value.length > 0) {
        const newIndex = Math.min(index, openTabs.value.length - 1)
        activeFile.value = openTabs.value[newIndex].path
      } else {
        activeFile.value = undefined
      }
    }
  }

  const addFile = (path: string, content: string): boolean => {
    if (!createFile(path, content)) return false
    projectFiles.value = listFiles()
    openTab(path)
    return true
  }

  const removeFile = (path: string): boolean => {
    if (!deleteFile(path)) return false
    projectFiles.value = listFiles()
    closeTab(path)
    return true
  }

  const renameActiveFile = (newPath: string): boolean => {
    if (!activeFile.value) return false
    const oldPath = activeFile.value
    
    if (!renameFile(oldPath, newPath)) return false
    projectFiles.value = listFiles()
    
    const tab = openTabs.value.find(t => t.path === oldPath)
    if (tab) {
      tab.path = newPath
    }
    activeFile.value = newPath
    return true
  }

  const renameFileInTabs = (oldPath: string, newPath: string): boolean => {
    if (!renameFile(oldPath, newPath)) return false
    projectFiles.value = listFiles()
    
    const tab = openTabs.value.find(t => t.path === oldPath)
    if (tab) {
      tab.path = newPath
    }
    if (activeFile.value === oldPath) {
      activeFile.value = newPath
    }
    return true
  }

  const exportProject = (): Blob => {
    const files = listFiles()
    const projectData: Record<string, string> = {}

    files.forEach(file => {
      const content = loadFile(file)
      if (content !== null) {
        projectData[file] = content
      }
    })

    return new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json'
    })
  }

  return {
    projectFiles,
    activeFile,
    openTabs,
    autoSaveEnabled,
    loadProject,
    setActiveFile,
    openTab,
    closeTab,
    addFile,
    removeFile,
    renameActiveFile,
    renameFileInTabs,
    exportProject,
    saveFile,
    loadFile,
    deleteFile,
    downloadFile,
    downloadWasm
  }
}
