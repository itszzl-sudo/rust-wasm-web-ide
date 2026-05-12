import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import zhCN from './i18n/zh-CN'
import enUS from './i18n/en-US'

const savedLocale = localStorage.getItem('rust_ide_locale') || 'zh-CN'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
