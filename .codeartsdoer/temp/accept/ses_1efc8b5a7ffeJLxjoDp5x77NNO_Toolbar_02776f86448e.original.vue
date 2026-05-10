<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <span class="logo-icon">🦀</span>
        <span class="logo-text">Rust Web IDE</span>
      </div>
    </div>
    <div class="toolbar-center">
      <button class="toolbar-btn run-btn" @click="$emit('run')" title="运行">
        <span class="icon">▶</span>
        <span class="text">运行</span>
      </button>
      <button class="toolbar-btn" @click="$emit('save')" title="保存">
        <span class="icon">💾</span>
        <span class="text">保存</span>
      </button>
      <button class="toolbar-btn" @click="$emit('format')" title="格式化">
        <span class="icon">📝</span>
        <span class="text">格式化</span>
      </button>
      <button class="toolbar-btn" @click="$emit('newFile')" title="新建文件">
        <span class="icon">📄</span>
        <span class="text">新建</span>
      </button>
    </div>
    <div class="toolbar-right">
      <span class="status">就绪</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'run'): void
  (e: 'save'): void
  (e: 'format'): void
  (e: 'newFile'): void
}>()
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background-color: #323233;
  color: #cccccc;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.logo-icon {
  font-size: 20px;
}

.logo-text {
  color: #e0e0e0;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: #0e639c;
  border: none;
  border-radius: 4px;
  color: #ffffff;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toolbar-btn:hover {
  background-color: #1177bb;
}

.toolbar-btn:active {
  background-color: #0d5a8a;
}

.run-btn {
  background-color: #388a34;
}

.run-btn:hover {
  background-color: #4ca448;
}

.run-btn:active {
  background-color: #2d6e2a;
}

.icon {
  font-size: 14px;
}

.text {
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.status {
  font-size: 12px;
  color: #888;
  padding: 4px 8px;
  background-color: #2d2d2d;
  border-radius: 4px;
}
</style>
