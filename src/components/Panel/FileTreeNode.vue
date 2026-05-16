<template>
  <div class="tree-node">
    <div
      class="node-content"
      :class="{ active: node.type === 'file' && path === activeFile }"
      :style="{ paddingLeft: (depth * 16 + 8) + 'px' }"
      @click="handleClick"
      @contextmenu.prevent="showContextMenu"
    >
      <span v-if="node.type === 'directory'" class="expand-icon">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span class="node-icon">{{ getIcon() }}</span>
      <span class="node-name" v-if="editingPath !== path">{{ name }}</span>
      <input
        v-else
        v-model="newName"
        class="rename-input"
        @blur="finishRename"
        @keyup.enter="finishRename"
        @keyup.escape="cancelRename"
        ref="renameInputRef"
      />
      <div class="node-actions" v-if="node.type === 'file' && path === activeFile && editingPath !== path">
        <button class="action-btn" @click.stop="startRename" title="重命名">✏️</button>
        <button class="action-btn" @click.stop="$emit('download', path)" title="下载">⬇️</button>
        <button class="action-btn" @click.stop="$emit('delete', path)" title="删除">🗑️</button>
        <button v-if="isWasmFile" class="action-btn run-btn" @click.stop="$emit('runWasm', path)" title="试运行">▶</button>
      </div>
    </div>
    
    <div v-if="node.type === 'directory' && isExpanded && node.children" class="children">
      <FileTreeNode
        v-for="(childNode, childName) in node.children"
        :key="childName"
        :name="childName"
        :node="childNode"
        :parent-path="path"
        :depth="depth + 1"
        :active-file="activeFile"
        :expanded-paths="expandedPaths"
        @select="$emit('select', $event)"
        @rename="(old, newP) => $emit('rename', old, newP)"
        @delete="$emit('delete', $event)"
        @download="$emit('download', $event)"
        @runWasm="$emit('runWasm', $event)"
        @toggle="$emit('toggle', $event)"
        @newFile="(p) => $emit('newFile', p)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface FileNode {
  type: 'file' | 'directory'
  children?: Record<string, FileNode>
}

interface Props {
  name: string
  node: FileNode
  parentPath?: string
  depth?: number
  activeFile?: string
  expandedPaths: Set<string>
}

const props = withDefaults(defineProps<Props>(), {
  parentPath: '',
  depth: 0
})

const emit = defineEmits<{
  (e: 'select', path: string): void
  (e: 'rename', oldPath: string, newPath: string): void
  (e: 'delete', path: string): void
  (e: 'download', path: string): void
  (e: 'runWasm', path: string): void
  (e: 'toggle', path: string): void
  (e: 'newFile', path?: string): void
}>()

const editingPath = ref<string | null>(null)
const newName = ref('')
const renameInputRef = ref<HTMLInputElement>()

const path = computed(() => {
  return props.parentPath ? `${props.parentPath}/${props.name}` : props.name
})

const isExpanded = computed(() => {
  return props.expandedPaths.has(path.value)
})

const isWasmFile = computed(() => {
  return props.node.type === 'file' && props.name.endsWith('.wasm')
})

const getIcon = (): string => {
  if (props.node.type === 'directory') {
    return isExpanded.value ? '📂' : '📁'
  }
  if (props.name.endsWith('.rs')) return '🦀'
  if (props.name.endsWith('.wasm')) return '⚙️'
  if (props.name.endsWith('.toml')) return '📦'
  if (props.name.endsWith('.md')) return '📄'
  return '📄'
}

const handleClick = () => {
  if (props.node.type === 'directory') {
    emit('toggle', path.value)
  } else {
    emit('select', path.value)
  }
}

const showContextMenu = (event: MouseEvent) => {
  if (props.node.type === 'file') {
    event.preventDefault()
  }
}

const startRename = () => {
  editingPath.value = path.value
  newName.value = props.name
  nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
}

const finishRename = () => {
  if (editingPath.value && newName.value && newName.value !== props.name) {
    const dir = props.parentPath ? props.parentPath + '/' : ''
    const newPath = dir + newName.value
    emit('rename', editingPath.value, newPath)
  }
  editingPath.value = null
}

const cancelRename = () => {
  editingPath.value = null
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
}

.node-content:hover {
  background-color: #2a2d2e;
}

.node-content.active {
  background-color: #37373d;
}

.expand-icon {
  font-size: 10px;
  color: #888;
  width: 12px;
  flex-shrink: 0;
}

.node-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  font-size: 13px;
  color: #cccccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-content.active .node-name {
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

.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.node-content:hover .node-actions {
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

.children {
  overflow: hidden;
}
</style>
