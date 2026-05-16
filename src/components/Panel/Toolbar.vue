<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <span class="logo-icon">🦀</span>
        <span class="logo-text">Rust WASM Web IDE</span>
      </div>
    </div>
    <div class="toolbar-center">
      <button class="toolbar-btn" @click="$emit('save')" :title="t('toolbar.save')">
        <span class="icon">💾</span>
        <span class="text">{{ t('toolbar.save') }}</span>
      </button>
      <button class="toolbar-btn" @click="$emit('format')" :title="t('toolbar.format')">
        <span class="icon">📝</span>
        <span class="text">{{ t('toolbar.format') }}</span>
      </button>
      <button class="toolbar-btn typecheck-btn" @click="$emit('typeCheck')" :title="t('toolbar.typeCheck')">
        <span class="icon">🔍</span>
        <span class="text">{{ t('toolbar.typeCheck') }}</span>
      </button>
      <button class="toolbar-btn clippy-btn" @click="$emit('clippy')" :title="'Clippy 规范检查'">
        <span class="icon">🧹</span>
        <span class="text">Clippy</span>
      </button>
      <button class="toolbar-btn run-btn" @click="$emit('run')" :title="t('toolbar.run')">
        <span class="icon">▶</span>
        <span class="text">{{ t('toolbar.run') }}</span>
      </button>
      
      <div class="executor-switch" :title="executorTooltip">
        <label class="switch-label">
          <span class="switch-text" :class="{ active: !usePlayground }">Iris</span>
          <div class="switch">
            <input type="checkbox" v-model="usePlayground" @change="onExecutorChange">
            <span class="slider"></span>
          </div>
          <span class="switch-text" :class="{ active: usePlayground }">Playground</span>
        </label>
      </div>
      
      <button class="toolbar-btn generate-wasm-btn" @click="$emit('generateWasm')" :title="generateWasmTooltip">
        <span class="icon">⚙️</span>
        <span class="text">{{ t('toolbar.generateWasm') }}</span>
      </button>
    </div>
    <div class="toolbar-right">
      <a class="github-link" href="https://github.com/itszzl-sudo/rust-wasm-web-ide" target="_blank" rel="noopener">
        <span class="icon">📦</span>
        <span class="text">GitHub</span>
      </a>
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

import { ref, computed } from 'vue'

interface Props {
  gpuEnabled?: boolean
  threadCount?: number
}

withDefaults(defineProps<Props>(), {
  gpuEnabled: false,
  threadCount: 0
})

const emit = defineEmits<{
  (e: 'run'): void
  (e: 'save'): void
  (e: 'format'): void
  (e: 'newFile'): void
  (e: 'typeCheck'): void
  (e: 'clippy'): void
  (e: 'parallelCheck'): void
  (e: 'download'): void
  (e: 'generateWasm'): void
}>()

const { t, locale } = useI18n()

const usePlayground = ref<boolean>(localStorage.getItem('rust_ide_executor') === 'playground')

const executorTooltip = computed(() => {
  return usePlayground.value
    ? 'Rust Playground: 官方 rustc 编译器 API\n• 完整语法支持（struct/enum/macro/trait）\n• 类型检查和错误提示\n• 需要网络连接'
    : 'Iris Interpreter: 自研轻量级解释器 WASM (~70KB)\n• 即时解释执行，零延迟\n• 支持基本语法（fn/let/if/for/match）\n• 完全离线运行'
})

const generateWasmTooltip = computed(() => {
  return '生成 WASM: Rust → WAT → WASM\n' +
    '• 自研编译器，纯浏览器端执行\n' +
    '• WAT (WebAssembly Text) 中间表示\n' +
    '• 生成 .wasm 文件添加到文件列表\n' +
    '• 当前支持：基本语法、算术运算、函数调用'
})

const onExecutorChange = () => {
  const executor = usePlayground.value ? 'playground' : 'interpreter'
  localStorage.setItem('rust_ide_executor', executor)
}

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

.compile-btn {
  background-color: #6b4fa0;
}

.compile-btn:hover {
  background-color: #8b6bc0;
}

.compile-btn:active {
  background-color: #5a3d8a;
}

.typecheck-btn {
  background-color: #6b4fa0;
}

.typecheck-btn:hover {
  background-color: #8b6bc0;
}

.typecheck-btn:active {
  background-color: #5a3d8a;
}

.clippy-btn {
  background-color: #f4a261;
}

.clippy-btn:hover {
  background-color: #f6b27e;
}

.clippy-btn:active {
  background-color: #d88a4b;
}

.generate-wasm-btn {
  background-color: #c50;
}

.generate-wasm-btn:hover {
  background-color: #e60;
}

.generate-wasm-btn:active {
  background-color: #a40;
}

.executor-switch {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: #2d2d2d;
  border-radius: 4px;
  margin: 0 4px;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.switch-text {
  font-size: 12px;
  color: #888;
  transition: color 0.2s;
}

.switch-text.active {
  color: #fff;
  font-weight: 600;
}

.switch {
  position: relative;
  width: 36px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #0e639c;
  transition: 0.3s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #c50;
}

input:checked + .slider:before {
  transform: translateX(16px);
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

.github-link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 8px;
}

.github-link:hover {
  background-color: #3d3d3d;
  border-color: #666;
  color: #fff;
}
</style>
