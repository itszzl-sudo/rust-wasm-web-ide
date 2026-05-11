<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <span class="logo-icon">🦀</span>
        <span class="logo-text">Rust Web IDE</span>
      </div>
    </div>
    <div class="toolbar-center">
      <button class="toolbar-btn run-btn" @click="$emit('run')" :title="t('toolbar.run')">
        <span class="icon">▶</span>
        <span class="text">{{ t('toolbar.run') }}</span>
      </button>
      <button class="toolbar-btn" @click="$emit('save')" :title="t('toolbar.save')">
        <span class="icon">💾</span>
        <span class="text">{{ t('toolbar.save') }}</span>
      </button>
      <button class="toolbar-btn" @click="$emit('format')" :title="t('toolbar.format')">
        <span class="icon">📝</span>
        <span class="text">{{ t('toolbar.format') }}</span>
      </button>
      <button class="toolbar-btn" @click="$emit('newFile')" :title="t('toolbar.newFile')">
        <span class="icon">📄</span>
        <span class="text">{{ t('toolbar.newFile') }}</span>
      </button>
      <button class="toolbar-btn typecheck-btn" @click="$emit('typeCheck')" :title="t('toolbar.typeCheck')">
        <span class="icon">🔍</span>
        <span class="text">{{ t('toolbar.typeCheck') }}</span>
      </button>
    </div>
    <div class="toolbar-right">
      <button class="lang-btn" @click="toggleLanguage" :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'">
        {{ locale === 'zh-CN' ? 'EN' : '中' }}
      </button>
      <span class="status" :class="{ 'gpu-enabled': gpuEnabled }">
        {{ gpuEnabled ? 'GPU' : 'CPU' }}
      </span>
      <span class="status thread-status">
        {{ threadCount > 0 ? `${threadCount} ${t('toolbar.threads')}` : t('toolbar.singleThread') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  gpuEnabled?: boolean
  threadCount?: number
}

withDefaults(defineProps<Props>(), {
  gpuEnabled: false,
  threadCount: 0
})

defineEmits<{
  (e: 'run'): void
  (e: 'save'): void
  (e: 'format'): void
  (e: 'newFile'): void
  (e: 'typeCheck'): void
}>()

const { t, locale } = useI18n()

const toggleLanguage = () => {
  locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  localStorage.setItem('rust_ide_locale', locale.value)
}
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
  margin-left: 8px;
}

.status.gpu-enabled {
  color: #4fc3f7;
  background-color: rgba(79, 195, 247, 0.1);
}

.thread-status {
  color: #81c784;
  background-color: rgba(129, 199, 132, 0.1);
}

.lang-btn {
  padding: 4px 10px;
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 8px;
}

.lang-btn:hover {
  background-color: #3d3d3d;
  border-color: #666;
  color: #fff;
}
</style>
