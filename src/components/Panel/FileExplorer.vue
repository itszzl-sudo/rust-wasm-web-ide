<template>
  <div class="file-explorer">
    <div class="explorer-header">
      <span class="header-title">项目文件</span>
      <div class="header-actions">
        <button class="header-btn" @click="$emit('newFile')" title="新建文件">
          <span class="icon">+</span>
        </button>
        <button class="header-btn" @click="triggerUpload" title="上传文件">
          <span class="icon">↑</span>
        </button>
        <input ref="uploadInput" type="file" multiple @change="handleUpload" style="display: none" />
      </div>
    </div>
    <div class="file-tree">
      <FileTreeNode
        v-for="(node, name) in tree"
        :key="name"
        :name="name"
        :node="node"
        :active-file="activeFile"
        :expanded-paths="expandedPaths"
        @select="$emit('select', $event)"
        @rename="(old, newP) => $emit('rename', old, newP)"
        @delete="$emit('delete', $event)"
        @download="$emit('download', $event)"
        @runWasm="$emit('runWasm', $event)"
        @toggle="toggleExpand"
        @newFile="(path) => $emit('newFile', path)"
        @upload="(path) => triggerUpload(path)"
      />
    </div>
    
    <div v-if="contextMenu.show" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
      <div class="menu-item" @click="startRename(contextMenu.file)">重命名</div>
      <div class="menu-item" @click="$emit('download', contextMenu.file)">下载</div>
      <div v-if="isWasmFile(contextMenu.file)" class="menu-item" @click="$emit('runWasm', contextMenu.file)">试运行</div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="$emit('delete', contextMenu.file)">删除</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import FileTreeNode from './FileTreeNode.vue'

interface FileNode {
  type: 'file' | 'directory'
  children?: Record<string, FileNode>
}

interface Props {
  files: string[]
  activeFile?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', filename: string): void
  (e: 'rename', oldName: string, newName: string): void
  (e: 'delete', filename: string): void
  (e: 'download', filename: string): void
  (e: 'runWasm', filename: string): void
  (e: 'newFile', path?: string): void
  (e: 'upload', files: { path: string; content: string }[]): void
}>()

const expandedPaths = ref<Set<string>>(new Set(['src']))
const editingFile = ref<string | null>(null)
const newFileName = ref('')
const renameInput = ref<HTMLInputElement>()
const uploadInput = ref<HTMLInputElement>()
const uploadPath = ref<string>('')

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  file: ''
})

const tree = computed(() => {
  const root: Record<string, FileNode> = {}
  
  for (const file of props.files) {
    const parts = file.split('/')
    let current = root
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      
      if (!current[part]) {
        current[part] = isFile
          ? { type: 'file' }
          : { type: 'directory', children: {} }
      }
      
      if (!isFile && current[part].children) {
        current = current[part].children!
      }
    }
  }
  
  return root
})

const toggleExpand = (path: string) => {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
  } else {
    expandedPaths.value.add(path)
  }
  expandedPaths.value = new Set(expandedPaths.value)
}

const isWasmFile = (filename: string): boolean => {
  return filename.endsWith('.wasm')
}

const startRename = (file: string) => {
  editingFile.value = file
  const parts = file.split('/')
  newFileName.value = parts[parts.length - 1]
  contextMenu.value.show = false
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

const triggerUpload = (path?: string) => {
  uploadPath.value = path || ''
  uploadInput.value?.click()
}

const handleUpload = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (!files || files.length === 0) return
  
  const uploadedFiles: { path: string; content: string }[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const path = uploadPath.value ? `${uploadPath.value}/${file.name}` : file.name
    
    try {
      const content = await readFileContent(file)
      uploadedFiles.push({ path, content })
    } catch (e) {
      console.error(`Failed to read file ${file.name}:`, e)
    }
  }
  
  if (uploadedFiles.length > 0) {
    emit('upload', uploadedFiles)
  }
  
  if (uploadInput.value) {
    uploadInput.value.value = ''
  }
}

const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

document.addEventListener('click', () => {
  contextMenu.value.show = false
})
</script>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #252526;
  position: relative;
}

.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  color: #cccccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: #0e639c;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.header-btn:hover {
  background-color: #1177bb;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.context-menu {
  position: fixed;
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.menu-item {
  padding: 6px 16px;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
  transition: background-color 0.15s;
}

.menu-item:hover {
  background-color: #37373d;
}

.menu-item.danger {
  color: #f48771;
}

.menu-divider {
  height: 1px;
  background-color: #444;
  margin: 4px 0;
}
</style>
