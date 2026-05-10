import { ref } from 'vue'
import { useFileManager } from './fileManager'

const projectFiles = ref<string[]>([])
const activeFile = ref<string>('')

export function useProjectManager() {
  const { listFiles, loadFile } = useFileManager()

  const loadProject = () => {
    projectFiles.value = listFiles()
    if (projectFiles.value.length > 0 && !activeFile.value) {
      activeFile.value = projectFiles.value[0]
    }
  }

  const setActiveFile = (filename: string) => {
    activeFile.value = filename
  }

  return {
    projectFiles,
    activeFile,
    setActiveFile,
    loadProject
  }
}
