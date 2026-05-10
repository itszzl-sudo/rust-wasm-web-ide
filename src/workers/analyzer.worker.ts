import type { AnalysisTask, AnalysisResult } from '../utils/threadManager'

self.onmessage = (e: MessageEvent) => {
  const { id, task } = e.data as { id: number; task: AnalysisTask }
  
  try {
    const result = analyze(task)
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: (error as Error).message })
  }
}

function analyze(task: AnalysisTask): AnalysisResult {
  const errors: AnalysisResult['errors'] = []
  
  const lines = task.code.split('\n')
  
  lines.forEach((line, lineIndex) => {
    if (line.includes('println!(')) {
      const match = line.match(/println!\(([^)]*)\)/)
      if (match) {
        const content = match[1]
        if (!content.startsWith('"')) {
          errors.push({
            message: 'println! requires a format string as first argument',
            line: lineIndex + 1,
            column: line.indexOf('println!') + 1,
            severity: 'error'
          })
        }
      }
    }

    if (line.includes('fn ')) {
      const fnMatch = line.match(/fn\s+(\w+)/)
      if (fnMatch) {
        const afterFn = line.substring(line.indexOf(fnMatch[1]) + fnMatch[1].length)
        if (!afterFn.trim().startsWith('(')) {
          errors.push({
            message: 'Function declaration missing parameter list',
            line: lineIndex + 1,
            column: line.indexOf('fn ') + 1,
            severity: 'error'
          })
        }
      }
    }

    const openParens = (line.match(/\(/g) || []).length
    const closeParens = (line.match(/\)/g) || []).length
    if (openParens !== closeParens) {
      if (openParens > closeParens) {
        errors.push({
          message: 'Unmatched opening parenthesis',
          line: lineIndex + 1,
          column: line.length,
          severity: 'warning'
        })
      } else {
        errors.push({
          message: 'Unmatched closing parenthesis',
          line: lineIndex + 1,
          column: line.length,
          severity: 'warning'
        })
      }
    }

    const openBrackets = (line.match(/\[/g) || []).length
    const closeBrackets = (line.match(/\]/g) || []).length
    if (openBrackets !== closeBrackets) {
      errors.push({
        message: 'Unmatched brackets',
        line: lineIndex + 1,
        column: line.length,
        severity: 'warning'
      })
    }
  })

  let braceCount = 0
  lines.forEach((line, lineIndex) => {
    const opens = (line.match(/{/g) || []).length
    const closes = (line.match(/}/g) || []).length
    braceCount += opens - closes
    
    if (braceCount < 0) {
      errors.push({
        message: 'Unmatched closing brace',
        line: lineIndex + 1,
        column: line.indexOf('}') + 1,
        severity: 'error'
      })
      braceCount = 0
    }
  })
  
  if (braceCount > 0) {
    errors.push({
      message: 'Unmatched opening brace',
      line: lines.length,
      column: lines[lines.length - 1].length,
      severity: 'error'
    })
  }

  if (task.type === 'completion' && task.position) {
    const line = lines[task.position.line - 1] || ''
    const beforeCursor = line.substring(0, task.position.column)
    const completions = getCompletions(beforeCursor)
    return { errors, completions }
  }

  return { errors }
}

function getCompletions(beforeCursor: string): AnalysisResult['completions'] {
  const completions: AnalysisResult['completions'] = []
  
  const wordMatch = beforeCursor.match(/(\w+)$/)
  const partialWord = wordMatch ? wordMatch[1].toLowerCase() : ''

  const keywords = [
    { label: 'fn', insertText: 'fn ${1:name}(${2:params}) {\n\t${3}\n}' },
    { label: 'let', insertText: 'let ${1:name} = ${2:value};' },
    { label: 'let mut', insertText: 'let mut ${1:name} = ${2:value};' },
    { label: 'if', insertText: 'if ${1:condition} {\n\t${2}\n}' },
    { label: 'if else', insertText: 'if ${1:condition} {\n\t${2}\n} else {\n\t${3}\n}' },
    { label: 'while', insertText: 'while ${1:condition} {\n\t${2}\n}' },
    { label: 'for', insertText: 'for ${1:i} in ${2:0}..${3:10} {\n\t${4}\n}' },
    { label: 'loop', insertText: 'loop {\n\t${1}\n}' },
    { label: 'match', insertText: 'match ${1:value} {\n\t${2}\n}' },
    { label: 'return', insertText: 'return ${1:value};' },
    { label: 'struct', insertText: 'struct ${1:Name} {\n\t${2}\n}' },
    { label: 'enum', insertText: 'enum ${1:Name} {\n\t${2}\n}' },
    { label: 'impl', insertText: 'impl ${1:Type} {\n\t${2}\n}' },
    { label: 'trait', insertText: 'trait ${1:Name} {\n\t${2}\n}' },
  ]

  const builtins = [
    { label: 'println!', insertText: 'println!("${1:\\${:\\?\\}}", ${2:value});' },
    { label: 'print!', insertText: 'print!("${1:\\${:\\?\\}}", ${2:value});' },
    { label: 'vec!', insertText: 'vec![${1:elements}]' },
    { label: 'format!', insertText: 'format!("${1:pattern}", ${2:args})' },
    { label: 'panic!', insertText: 'panic!("${1:message}");' },
  ]

  const types = [
    { label: 'i32', insertText: 'i32' },
    { label: 'i64', insertText: 'i64' },
    { label: 'u32', insertText: 'u32' },
    { label: 'u64', insertText: 'u64' },
    { label: 'f32', insertText: 'f32' },
    { label: 'f64', insertText: 'f64' },
    { label: 'bool', insertText: 'bool' },
    { label: 'String', insertText: 'String' },
    { label: 'Vec', insertText: 'Vec<${1:T}>' },
    { label: 'Option', insertText: 'Option<${1:T}>' },
    { label: 'Result', insertText: 'Result<${1:Ok}, ${2:Err}>' },
  ]

  keywords.forEach(kw => {
    if (!partialWord || kw.label.toLowerCase().startsWith(partialWord)) {
      completions.push({ label: kw.label, kind: 'keyword', insertText: kw.insertText })
    }
  })

  builtins.forEach(builtin => {
    if (!partialWord || builtin.label.toLowerCase().startsWith(partialWord)) {
      completions.push({ label: builtin.label, kind: 'function', insertText: builtin.insertText })
    }
  })

  types.forEach(type => {
    if (!partialWord || type.label.toLowerCase().startsWith(partialWord)) {
      completions.push({ label: type.label, kind: 'type', insertText: type.insertText })
    }
  })

  return completions
}

export {}
