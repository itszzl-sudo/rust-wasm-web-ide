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
      >
        <span class="file-icon">{{ getFileIcon(file) }}</span>
        <span class="file-name">{{ getFileName(file) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  files: string[]
  activeFile?: string
}

defineProps<Props>()

defineEmits<{
  (e: 'select', filename: string): void
}>()

const getFileIcon = (filename: string): string => {
  if (filename.endsWith('.rs')) return '🦀'
  if (filename.endsWith('.toml')) return '⚙️'
  if (filename.endsWith('.md')) return '📄'
  return '📄'
}

const getFileName = (filename: string): string => {
  const parts = filename.split('/')
  return parts[parts.length - 1]
}
</script>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #252526;
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
  font-size: 13px;
  color: #cccccc;
}

.file-item.active .file-name {
  color: #ffffff;
}
</style>
