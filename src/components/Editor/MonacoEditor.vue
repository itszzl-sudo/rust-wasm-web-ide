<template>
  <div v-if="!isSupported" class="unsupported-file">
    <div class="unsupported-content">
      <span class="unsupported-icon">📄</span>
      <span class="unsupported-text">暂不支持此文件类型</span>
      <span class="unsupported-filename">{{ filename }}</span>
    </div>
  </div>
  <div v-else ref="editorContainer" class="monaco-editor"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { rustLanguage } from './rustLanguage'

interface Props {
  modelValue: string
  filename?: string
}

const props = withDefaults(defineProps<Props>(), {
  filename: 'main.rs'
})

const emit = defineEmits<{
  (e: 'change', value: string): void
  (e: 'update:modelValue', value: string): void
}>()

const editorContainer = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let model: monaco.editor.ITextModel | null = null

const supportedExtensions = ['.rs', '.toml', '.md', '.txt', '.json', '.js', '.ts', '.vue', '.html', '.css']

const isSupported = computed(() => {
  if (!props.filename) return true
  const ext = '.' + props.filename.split('.').pop()?.toLowerCase()
  return supportedExtensions.includes(ext)
})

onMounted(() => {
  if (!editorContainer.value) return

  monaco.languages.register({ id: 'rust' })
  monaco.languages.setMonarchTokensProvider('rust', rustLanguage as any)

  monaco.languages.registerCompletionItemProvider('rust', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      const suggestions: monaco.languages.CompletionItem[] = [
        {
          label: 'fn',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'fn ${1:name}(${2:params}) {\n\t${3}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        },
        {
          label: 'println!',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'println!("${1:\\${:\\?\\}}", ${2:value});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        },
        {
          label: 'let',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'let ${1:name} = ${2:value};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        },
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'if ${1:condition} {\n\t${2}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'for ${1:i} in ${2:0}..${3:10} {\n\t${4}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }
      ]

      return { suggestions }
    }
  })

  model = monaco.editor.createModel(props.modelValue, 'rust', monaco.Uri.parse(props.filename))

  editor = monaco.editor.create(editorContainer.value, {
    model,
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderLineHighlight: 'all',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'on',
    lineNumbers: 'on',
    glyphMargin: true,
    folding: true,
    foldingHighlight: true,
    bracketPairColorization: { enabled: true }
  })

  editor.onDidChangeModelContent(() => {
    const value = editor!.getValue()
    emit('update:modelValue', value)
    emit('change', value)
  })
})

watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.getValue()) {
    editor.setValue(newValue)
  }
})

onBeforeUnmount(() => {
  editor?.dispose()
  model?.dispose()
})

defineExpose({
  getEditor: () => editor,
  getValue: () => editor?.getValue() || '',
  setValue: (value: string) => editor?.setValue(value),
  focus: () => editor?.focus()
})
</script>

<style scoped>
.monaco-editor {
  width: 100%;
  height: 100%;
}

.unsupported-file {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1e1e1e;
}

.unsupported-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #888;
}

.unsupported-icon {
  font-size: 64px;
  opacity: 0.5;
}

.unsupported-text {
  font-size: 16px;
  font-weight: 500;
}

.unsupported-filename {
  font-size: 13px;
  color: #666;
}
</style>
