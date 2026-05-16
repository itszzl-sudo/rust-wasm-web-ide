<template>
  <div class="terminal-wrapper">
    <div ref="terminalContainer" class="terminal-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import '@xterm/xterm/css/xterm.css'

const emit = defineEmits<{
  (e: 'execute', command: string, args: string[]): void
  (e: 'log', level: string, message: string): void
}>()

const terminalContainer = ref<HTMLElement>()
let terminal: any = null
let fitAddon: any = null
let currentLine = ''
let commandHistory: string[] = []
let historyIndex = -1

const cargoVersion = 'cargo 1.75.0 (distributed with rustc 1.75.0)'
const rustcVersion = 'rustc 1.75.0 (82e4f1f5c 2023-12-01)'

const initTerminal = async () => {
  const { Terminal } = await import('@xterm/xterm')
  
  const term = new Terminal({
    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
    fontSize: 13,
    lineHeight: 1.5,
    cursorBlink: true,
    cursorStyle: 'block',
    theme: {
      background: '#0c0c0c',
      foreground: '#cccccc',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selectionBackground: 'rgba(255, 255, 255, 0.3)',
      black: '#000000',
      red: '#cd3131',
      green: '#3bc84f',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    allowProposedApi: true
  })

  term.open(terminalContainer.value!)
  
  const fitTerminal = () => {
    if (!term.element || !term.element.parentElement) return
    const parent = term.element.parentElement
    const width = parent.clientWidth
    const height = parent.clientHeight
    const cols = Math.floor(width / 9)
    const rows = Math.floor(height / 19)
    if (cols > 0 && rows > 0) {
      term.resize(cols, rows)
    }
  }
  
  fitTerminal()

  term.writeln('\x1b[1;36mRust WASM Web IDE Terminal v0.1.0\x1b[0m')
  term.writeln('\x1b[90m支持命令: cargo new/build/run/check/test/clippy/fmt/add/doc\x1b[0m')
  term.writeln('\x1b[90m输入 "cargo help" 查看帮助\x1b[0m')
  term.writeln('')
  writePrompt(term)

  term.onData((data: string) => {
    handleInput(term, data)
  })

  window.addEventListener('resize', fitTerminal)

  terminal = term
  fitAddon = { fit: fitTerminal }
}

const writePrompt = (term: any) => {
  term.write('\x1b[1;32m$\x1b[0m ')
}

const handleInput = (term: any, data: string) => {
  const code = data.charCodeAt(0)

  if (code === 13) {
    term.writeln('')
    if (currentLine.trim()) {
      executeCommand(term, currentLine.trim())
    } else {
      writePrompt(term)
    }
    currentLine = ''
  } else if (code === 127) {
    if (currentLine.length > 0) {
      currentLine = currentLine.slice(0, -1)
      term.write('\b \b')
    }
  } else if (code === 27) {
    if (data === '\x1b[A') {
      if (historyIndex > 0) {
        historyIndex--
        clearLine(term)
        currentLine = commandHistory[historyIndex]
        term.write(currentLine)
      }
    } else if (data === '\x1b[B') {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++
        clearLine(term)
        currentLine = commandHistory[historyIndex]
        term.write(currentLine)
      } else if (historyIndex === commandHistory.length - 1) {
        historyIndex = commandHistory.length
        clearLine(term)
        currentLine = ''
      }
    }
  } else if (code === 9) {
    handleAutocomplete(term)
  } else if (code >= 32) {
    currentLine += data
    term.write(data)
  }
}

const clearLine = (term: any) => {
  term.write('\x1b[2K\r')
  writePrompt(term)
}

const handleAutocomplete = (term: any) => {
  const commands = [
    'cargo new', 'cargo build', 'cargo run', 'cargo check', 'cargo test',
    'cargo clippy', 'cargo fmt', 'cargo add', 'cargo doc', 'cargo clean',
    'cargo init', 'cargo tree', 'cargo update', 'cargo search',
    'cargo install', 'cargo version', 'cargo help',
    'rustc --version', 'rustup show', 'clear', 'help'
  ]
  
  const input = currentLine.toLowerCase()
  const matches = commands.filter(c => c.startsWith(input))
  
  if (matches.length === 1) {
    const remaining = matches[0].slice(input.length)
    currentLine = matches[0]
    term.write(remaining + ' ')
  } else if (matches.length > 1 && matches.length < 10) {
    term.writeln('')
    term.writeln(matches.join('  '))
    writePrompt(term)
    term.write(currentLine)
  }
}

const executeCommand = async (term: any, cmd: string) => {
  commandHistory.push(cmd)
  historyIndex = commandHistory.length

  const parts = cmd.split(/\s+/)
  const [mainCmd, subCmd, ...args] = parts

  if (mainCmd === 'cargo') {
    await handleCargoCommand(term, subCmd, args)
  } else if (mainCmd === 'rustc') {
    handleRustcCommand(term, subCmd, args)
  } else if (mainCmd === 'rustup') {
    handleRustupCommand(term, subCmd, args)
  } else if (mainCmd === 'clear') {
    term.clear()
    writePrompt(term)
    return
  } else if (mainCmd === 'help') {
    showHelp(term)
  } else {
    term.writeln(`\x1b[31merror:\x1b[0m 命令未找到: ${mainCmd}`)
  }

  writePrompt(term)
}

const handleCargoCommand = async (term: any, subCmd: string, args: string[]) => {
  switch (subCmd) {
    case 'version':
    case '-V':
    case '--version':
      term.writeln(cargoVersion)
      term.writeln(rustcVersion)
      break
    case 'new':
      await cargoNew(term, args)
      break
    case 'init':
      await cargoInit(term, args)
      break
    case 'build':
      await cargoBuild(term, args)
      break
    case 'run':
      await cargoRun(term, args)
      break
    case 'check':
      await cargoCheck(term, args)
      break
    case 'test':
      await cargoTest(term, args)
      break
    case 'clippy':
      await cargoClippy(term, args)
      break
    case 'fmt':
    case 'rustfmt':
      await cargoFmt(term, args)
      break
    case 'add':
      await cargoAdd(term, args)
      break
    case 'remove':
      cargoRemove(term, args)
      break
    case 'doc':
      await cargoDoc(term, args)
      break
    case 'clean':
      cargoClean(term, args)
      break
    case 'tree':
      cargoTree(term, args)
      break
    case 'metadata':
      cargoMetadata(term, args)
      break
    case 'update':
      cargoUpdate(term, args)
      break
    case 'search':
      await cargoSearch(term, args)
      break
    case 'install':
      await cargoInstall(term, args)
      break
    case 'uninstall':
      cargoUninstall(term, args)
      break
    case 'list':
      cargoList(term, args)
      break
    case 'help':
    case '--help':
    case '-h':
      showCargoHelp(term)
      break
    default:
      term.writeln(`\x1b[31merror:\x1b[0m 不支持的子命令 "${subCmd}"`)
      term.writeln('\x1b[90m使用 "cargo help" 查看可用命令\x1b[0m')
  }
}

const cargoNew = async (term: any, args: string[]) => {
  if (args.length === 0) {
    term.writeln('\x1b[31merror:\x1b[0m 需要 <path> 参数')
    term.writeln('\x1b[90m用法: cargo new <path> [options]\x1b[0m')
    return
  }

  const projectName = args[0]
  const isLib = args.includes('--lib')
  
  term.writeln(`     \x1b[32mCreated\x1b[0m ${(isLib ? 'library' : 'binary')} (application) \`${projectName}\` package`)
  
  emit('execute', 'cargo new', [projectName])
  emit('log', 'info', `创建项目: ${projectName}`)
}

const cargoInit = async (term: any, args: string[]) => {
  const isLib = args.includes('--lib')
  const projectName = 'rust-project'
  
  term.writeln(`     \x1b[32mCreated\x1b[0m ${(isLib ? 'library' : 'binary')} \`${projectName}\` package`)
  emit('log', 'info', '初始化项目')
}

const cargoBuild = async (term: any, args: string[]) => {
  const isRelease = args.includes('--release')
  const target = args.find(a => a.startsWith('--target'))?.split('=')[1] || 'wasm32-unknown-unknown'
  
  term.writeln('   \x1b[33mCompiling\x1b[0m rust-project v0.1.0 (...)')
  await delay(500)
  
  if (isRelease) {
    term.writeln('    \x1b[32mFinished\x1b[0m release [optimized] target(s) in 0.52s')
  } else {
    term.writeln('    \x1b[32mFinished\x1b[0m dev [unoptimized + debuginfo] target(s) in 0.38s')
  }
  
  emit('log', 'info', `构建完成 (release: ${isRelease})`)
  emit('execute', 'cargo build', args)
}

const cargoRun = async (term: any, args: string[]) => {
  term.writeln('   \x1b[33mCompiling\x1b[0m rust-project v0.1.0 (...)')
  await delay(300)
  term.writeln('    \x1b[32mFinished\x1b[0m dev [unoptimized + debuginfo] target(s) in 0.28s')
  term.writeln('     \x1b[34mRunning\x1b[0m `target\\debug\\rust-project.exe`')
  term.writeln('Hello, world!')
  
  emit('log', 'info', '运行成功')
}

const cargoCheck = async (term: any, args: string[]) => {
  term.writeln('    \x1b[33mChecking\x1b[0m rust-project v0.1.0 (...)')
  await delay(200)
  term.writeln('    \x1b[32mFinished\x1b[0m dev [unoptimized + debuginfo] target(s) in 0.15s')
  
  emit('log', 'info', '检查通过')
}

const cargoTest = async (term: any, args: string[]) => {
  term.writeln('   \x1b[33mCompiling\x1b[0m rust-project v0.1.0 (...)')
  await delay(300)
  term.writeln('    \x1b[32mFinished\x1b[0m dev [unoptimized + debuginfo] target(s) in 0.28s')
  term.writeln('     \x1b[34mRunning\x1b[0m unittests src\\lib.rs (target\\debug\\deps\\rust_project.exe)')
  term.writeln('')
  term.writeln('running 1 test')
  term.writeln('test tests::it_works ... \x1b[32mok\x1b[0m')
  term.writeln('')
  term.writeln('test result: \x1b[32mok\x1b[0m. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out')
  
  emit('log', 'info', '测试通过')
}

const cargoClippy = async (term: any, args: string[]) => {
  term.writeln('    \x1b[33mChecking\x1b[0m rust-project v0.1.0 (...)')
  await delay(250)
  term.writeln('    \x1b[32mFinished\x1b[0m dev [unoptimized + debuginfo] target(s) in 0.22s')
  
  emit('log', 'info', 'Clippy 检查完成')
}

const cargoFmt = async (term: any, args: string[]) => {
  const check = args.includes('--check')
  
  if (check) {
    term.writeln('\x1b[33mwarning:\x1b[0m rustfmt --check')
  } else {
    term.writeln('\x1b[32mok\x1b[0m: 已格式化 src/main.rs')
  }
  
  emit('log', 'info', '格式化完成')
}

const cargoAdd = async (term: any, args: string[]) => {
  if (args.length === 0) {
    term.writeln('\x1b[31merror:\x1b[0m 需要 <dep> 参数')
    return
  }
  
  const dep = args[0]
  const parts = dep.split('@')
  const name = parts[0]
  const version = parts[1] || '*'
  
  term.writeln('    \x1b[33mUpdating\x1b[0m crates.io index')
  await delay(200)
  term.writeln(`      \x1b[32mAdding\x1b[0m ${name} v${version} to dependencies.`)
  
  emit('log', 'info', `添加依赖: ${name}@${version}`)
}

const cargoRemove = (term: any, args: string[]) => {
  if (args.length === 0) {
    term.writeln('\x1b[31merror:\x1b[0m 需要 <dep> 参数')
    return
  }
  term.writeln(`    \x1b[32mRemoving\x1b[0m ${args[0]} from dependencies.`)
}

const cargoDoc = async (term: any, args: string[]) => {
  term.writeln(' \x1b[33mDocumenting\x1b[0m rust-project v0.1.0 (...)')
  await delay(400)
  term.writeln('    \x1b[32mFinished\x1b[0m dev [unoptimized + debuginfo] target(s) in 0.38s')
  
  emit('log', 'info', '文档生成完成')
}

const cargoClean = (term: any, args: string[]) => {
  term.writeln('\x1b[32mRemoved\x1b[0m target directory')
}

const cargoTree = (term: any, args: string[]) => {
  term.writeln('rust-project v0.1.0')
  term.writeln('└── (no dependencies)')
}

const cargoMetadata = (term: any, args: string[]) => {
  term.writeln('{')
  term.writeln('  "packages": [],')
  term.writeln('  "resolve": null,')
  term.writeln('  "target_directory": "target",')
  term.writeln('  "version": 1')
  term.writeln('}')
}

const cargoUpdate = (term: any, args: string[]) => {
  term.writeln('    \x1b[33mUpdating\x1b[0m crates.io index')
}

const cargoSearch = async (term: any, args: string[]) => {
  if (args.length === 0) {
    term.writeln('\x1b[31merror:\x1b[0m 需要 <query> 参数')
    return
  }
  term.writeln(`${args[0]} = "0.1.0"    # 模拟搜索结果`)
}

const cargoInstall = async (term: any, args: string[]) => {
  if (args.length === 0) {
    term.writeln('\x1b[31merror:\x1b[0m 需要 <crate> 参数')
    return
  }
  const crate = args[0]
  term.writeln('    \x1b[33mUpdating\x1b[0m crates.io index')
  await delay(300)
  term.writeln(`  \x1b[33mDownloading\x1b[0m ${crate} v1.0.0`)
  term.writeln(`   \x1b[33mCompiling\x1b[0m ${crate} v1.0.0`)
  term.writeln('    \x1b[32mFinished\x1b[0m release [optimized] target(s) in 0.82s')
  term.writeln(`   \x1b[32mInstalled\x1b[0m package ${crate} v1.0.0`)
}

const cargoUninstall = (term: any, args: string[]) => {
  if (args.length === 0) {
    term.writeln('\x1b[31merror:\x1b[0m 需要 <package> 参数')
    return
  }
  term.writeln(`    \x1b[32mRemoving\x1b[0m ${args[0]} v1.0.0`)
}

const cargoList = (term: any, args: string[]) => {
  term.writeln('已安装的包:')
  term.writeln('  rustfmt-preview (1.75.0)')
  term.writeln('  clippy-preview (1.75.0)')
}

const handleRustcCommand = (term: any, subCmd: string, args: string[]) => {
  if (!subCmd || subCmd === '--version' || subCmd === '-V') {
    term.writeln('rustc 1.75.0 (82e4f1f5c 2023-12-01)')
    term.writeln('binary: rustc')
    term.writeln('commit-hash: 82e4f1f5c86e85cb620ec5390c55b609d0a9b26e')
    term.writeln('commit-date: 2023-12-01')
    term.writeln('host: x86_64-pc-windows-msvc')
    term.writeln('release: 1.75.0')
    term.writeln('LLVM version: 17.0.4')
  } else if (subCmd === '--print' && args[0] === 'cfg') {
    term.writeln('debug_assertions')
    term.writeln('panic="unwind"')
    term.writeln('target_arch="x86_64"')
    term.writeln('target_endian="little"')
    term.writeln('target_os="windows"')
    term.writeln('target_pointer_width="64"')
  }
}

const handleRustupCommand = (term: any, subCmd: string, args: string[]) => {
  if (!subCmd || subCmd === '--version') {
    term.writeln('rustup 1.26.0 (5af9d10f8 2023-10-11)')
  } else if (subCmd === 'show') {
    term.writeln('Default host: x86_64-pc-windows-msvc')
    term.writeln('rustup home:  ~/.rustup')
    term.writeln('')
    term.writeln('installed toolchains')
    term.writeln('--------------------')
    term.writeln('stable-x86_64-pc-windows-msvc (default)')
    term.writeln('nightly-x86_64-pc-windows-msvc')
    term.writeln('')
    term.writeln('active toolchain')
    term.writeln('----------------')
    term.writeln('stable-x86_64-pc-windows-msvc (default)')
    term.writeln('rustc 1.75.0 (82e4f1f5c 2023-12-01)')
  } else if (subCmd === 'target' && args[0] === 'list') {
    term.writeln('Installed targets for active toolchain:')
    term.writeln('----')
    term.writeln('wasm32-unknown-unknown')
    term.writeln('x86_64-pc-windows-msvc (default)')
  }
}

const showHelp = (term: any) => {
  term.writeln('可用命令:')
  term.writeln('  cargo <command>  - Cargo 包管理器')
  term.writeln('  rustc            - Rust 编译器')
  term.writeln('  rustup           - Rust 工具链管理器')
  term.writeln('  clear            - 清空终端')
  term.writeln('  help             - 显示帮助')
}

const showCargoHelp = (term: any) => {
  term.writeln('Rust 的包管理器')
  term.writeln('')
  term.writeln('使用方法:')
  term.writeln('    cargo <command> [<args>...]')
  term.writeln('')
  term.writeln('常用命令:')
  term.writeln('    build, b    编译当前包')
  term.writeln('    check, c    检查当前包中的错误')
  term.writeln('    clean       移除构建产物')
  term.writeln('    doc         构建当前包及其依赖项的文档')
  term.writeln('    new         创建新的 cargo 包')
  term.writeln('    init        在现有目录中创建新的 cargo 包')
  term.writeln('    add         向清单添加依赖')
  term.writeln('    run, r      运行本地包的二进制文件')
  term.writeln('    test, t     运行测试')
  term.writeln('    fmt         格式化代码')
  term.writeln('    clippy      运行 clippy 检查')
  term.writeln('')
  term.writeln('查看命令的更多信息:')
  term.writeln('    cargo <command> --help')
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

onMounted(() => {
  nextTick(() => {
    initTerminal()
  })
})

onBeforeUnmount(() => {
  terminal?.dispose()
  window.removeEventListener('resize', () => {
    fitAddon?.fit()
  })
})

defineExpose({
  writeln: (text: string) => terminal?.writeln(text),
  clear: () => terminal?.clear(),
  fit: () => fitAddon?.fit()
})
</script>

<style scoped>
.terminal-wrapper {
  height: 100%;
  background-color: #0c0c0c;
  padding: 8px;
}

.terminal-container {
  height: 100%;
  width: 100%;
}
</style>
