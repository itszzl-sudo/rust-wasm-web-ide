<template>
  <div class="tab-bar">
    <div class="tabs-container">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        class="tab"
        :class="{ active: tab.path === activeTab }"
        @click="$emit('select', tab.path)"
      >
        <span class="tab-icon">{{ getFileIcon(tab.path) }}</span>
        <span class="tab-name">{{ getFileName(tab.path) }}</span>
        <button
          class="tab-close"
          @click.stop="$emit('close', tab.path)"
          title="关闭"
        >×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  path: string
  modified?: boolean
}

interface Props {
  tabs: Tab[]
  activeTab?: string
}

defineProps<Props>()

defineEmits<{
  (e: 'select', path: string): void
  (e: 'close', path: string): void
}>()

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
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  height: 35px;
  background-color: #252526;
  border-bottom: 1px solid #3c3c3c;
  overflow-x: auto;
}

.tabs-container {
  display: flex;
  align-items: center;
  height: 100%;
  flex: 1;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 100%;
  min-width: 120px;
  max-width: 200px;
  background-color: #2d2d2d;
  border-right: 1px solid #3c3c3c;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
}

.tab:hover {
  background-color: #37373d;
}

.tab.active {
  background-color: #1e1e1e;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #0e639c;
}

.tab-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tab-name {
  flex: 1;
  font-size: 13px;
  color: #cccccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab.active .tab-name {
  color: #ffffff;
}

.tab-close {
  width: 18px;
  height: 18px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 3px;
  color: #888;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}

.tab:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background-color: #5a5a5a;
  color: #fff;
}

.tab-bar::-webkit-scrollbar {
  height: 3px;
}

.tab-bar::-webkit-scrollbar-track {
  background: transparent;
}

.tab-bar::-webkit-scrollbar-thumb {
  background-color: #424242;
  border-radius: 2px;
}
</style>
