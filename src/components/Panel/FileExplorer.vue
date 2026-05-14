<template>
  <div class="file-explorer">
    <div class="explorer-header">
      <span class="header-title">项目文件</span>
      <span class="file-count">{{ files.length }}</span>
    </div>
    <div class="file-list">
      <div
        v-for="file in files"
        :key="file"
        class="file-item"
        :class="{ active: file === activeFile }"
        @click="$emit('select', file)"
        @contextmenu.prevent="showContextMenu($event, file)"
      >
        <span class="file-icon">{{ getFileIcon(file) }}</span>
        <span class="file-name" v-if="editingFile !== file">{{ getFileName(file) }}</span>
        <input
          v-else
          v-model="newFileName"
          class="rename-input"
          @blur="finishRename"
          @keyup.enter="finishRename"
          @keyup.escape="cancelRename"
          ref="renameInput"
        />
        <div class="file-actions" v-if="file === activeFile && editingFile !== file">
          <button class="action-btn" @click.stop="startRename(file)" title="重命名">✏️</button>
          <button class="action-btn" @click.stop="$emit('download', file)" title="下载">⬇️</button>
          <button class="action-btn" @click.stop="$emit('delete', file)" title="删除">🗑️</button>
          <button v-if="isWasmFile(file)" class="action-btn run-btn" @click.stop="$emit('runWasm', file)" title="试运行">▶</button>
        </div>
      </div>
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
import { ref, nextTick } from 'vue'

interface Props {
  files: string[]
  activeFile?: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', filename: string): void
  (e: 'rename', oldName: string, newName: string): void
  (e: 'delete', filename: string): void
  (e: 'download', filename: string): void
  (e: 'runWasm', filename: string): void
}>()

const editingFile = ref<string | null>(null)
const newFileName = ref('')
const renameInput = ref<HTMLInputElement>()

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  file: ''
})

const getFileIcon = (filename: string): string => {
  if (filename.endsWith('.rs')) return '🦀'
  if (filename.endsWith('.wasm')) return '⚙️'
  if (filename.endsWith('.toml')) return '📦'
  if (filename.endsWith('.md')) return '📄'
  return '📄'
}

const getFileName = (filename: string): string => {
  const parts = filename.split('/')
  return parts[parts.length - 1]
}

const isWasmFile = (filename: string): boolean => {
  return filename.endsWith('.wasm')
}

const startRename = (file: string) => {
  editingFile.value = file
  newFileName.value = getFileName(file)
  contextMenu.value.show = false
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

const finishRename = () => {
  if (editingFile.value && newFileName.value && newFileName.value !== getFileName(editingFile.value)) {
    const dir = editingFile.value.substring(0, editingFile.value.lastIndexOf('/') + 1)
    const newPath = dir + newFileName.value
    emit('rename', editingFile.value, newPath)
  }
  editingFile.value = null
}

const cancelRename = () => {
  editingFile.value = null
}

const showContextMenu = (event: MouseEvent, file: string) => {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    file
  }
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

.file-count {
  font-size: 11px;
  color: #888;
  background-color: #1e1e1e;
  padding: 2px 6px;
  border-radius: 10px;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
}

.file-item:hover {
  background-color: #2a2d2e;
}

.file-item.active {
  background-color: #37373d;
}

.file-icon {
  font-size: 14px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #cccccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item.active .file-name {
  color: #ffffff;
}

.rename-input {
  flex: 1;
  font-size: 13px;
  padding: 2px 6px;
  background-color: #3c3c3c;
  border: 1px solid #0e639c;
  border-radius: 2px;
  color: #fff;
  outline: none;
}

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .file-actions {
  opacity: 1;
}

.action-btn {
  padding: 2px 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 1;
}

.run-btn {
  color: #4ca448;
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
