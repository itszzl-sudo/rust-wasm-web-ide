<template>
  <div class="log-panel">
    <div class="log-header">
      <span class="header-title">{{ t('panel.logs') }}</span>
      <button class="clear-btn" @click="clearLogs">{{ t('panel.clear') }}</button>
    </div>
    <div ref="logContainer" class="log-container">
      <div
        v-for="(log, index) in logs"
        :key="index"
        class="log-entry"
        :class="`log-${log.level}`"
      >
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span class="log-level">🌈 {{ log.level.toUpperCase() }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

interface LogEntry {
  timestamp: number
  level: 'info' | 'error' | 'warn' | 'debug'
  message: string
}

const logs = ref<LogEntry[]>([])
const logContainer = ref<HTMLElement>()

const addLog = (level: LogEntry['level'], message: string) => {
  logs.value.push({
    timestamp: Date.now(),
    level,
    message
  })
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

const clearLogs = () => {
  logs.value = []
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

defineExpose({
  addLog,
  clearLogs
})
</script>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
}

.log-header {
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

.clear-btn {
  padding: 4px 12px;
  background-color: transparent;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.clear-btn:hover {
  background-color: #3c3c3c;
  color: #cccccc;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
}

.log-entry {
  display: grid;
  grid-template-columns: 70px 50px 1fr;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.log-entry:hover {
  background-color: #2a2d2e;
}

.log-time {
  color: #888;
}

.log-level {
  font-weight: 600;
  text-align: center;
}

.log-info .log-level {
  color: #4fc3f7;
}

.log-error .log-level {
  color: #ef5350;
}

.log-warn .log-level {
  color: #ffb74d;
}

.log-debug .log-level {
  color: #9575cd;
}

.log-message {
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-error {
  background-color: rgba(239, 83, 80, 0.1);
}

.log-warn {
  background-color: rgba(255, 183, 77, 0.1);
}
</style>
