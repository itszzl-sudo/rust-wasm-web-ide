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
      return localStorage.getItem(STORAGE_FILE_PREFIX + path)
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

  return {
    saveFile,
    loadFile,
    deleteFile,
    fileExists,
    createFile,
    listFiles
  }
}

const STORAGE_FILE_PREFIX = STORAGE_KEY_PREFIX

export function useProjectManager() {
  const { saveFile, loadFile, listFiles, createFile } = useFileManager()

  const projectFiles = ref<string[]>([])
  const activeFile = ref<string>()

  const createDefaultProject = (): void => {
    const defaultFiles = {
      'Cargo.toml': `[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
`,
      'src/main.rs': `fn main() {
    println!("Hello, Rust!");
    
    let x = 42;
    println!("x = {}", x);
    
    for i in 0..5 {
        println!("i = {}", i);
    }
}
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
      activeFile.value = mainRs || projectFiles.value[0]
    }
  }

  const setActiveFile = (filename: string): void => {
    activeFile.value = filename
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
    loadProject,
    setActiveFile,
    exportProject,
    createFile
  }
}

import { ref } from 'vue'
