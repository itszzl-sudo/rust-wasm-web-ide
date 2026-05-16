<template>
  <div class="terminal">
    <div class="terminal-header">
      <span class="header-icon">⚡</span>
      <span class="header-title">Terminal</span>
      <div class="header-actions">
        <button class="action-btn" @click="clearOutput" title="清空">🗑️</button>
      </div>
    </div>
    <div ref="outputRef" class="terminal-output">
      <div
        v-for="(line, index) in output"
        :key="index"
        class="output-line"
        :class="line.type"
      >
        <span v-if="line.type === 'command'" class="prompt">$ </span>{{ line.text }}
      </div>
    </div>
    <div class="terminal-input">
      <span class="prompt">$ </span>
      <input
        ref="inputRef"
        v-model="command"
        type="text"
        class="input-field"
        placeholder="输入 cargo 命令..."
        @keydown.enter="executeCommand"
        @keydown.up="historyUp"
        @keydown.down="historyDown"
        @keydown.tab.prevent="autocomplete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'

interface OutputLine {
  text: string
  type: 'command' | 'output' | 'error' | 'success' | 'warning'
}

const emit = defineEmits<{
  (e: 'execute', command: string, args: string[]): void
  (e: 'log', level: string, message: string): void
}>()

const output = ref<OutputLine[]>([
  { text: 'Rust WASM Web IDE Terminal v0.1.0', type: 'output' },
  { text: '支持命令: cargo new/build/run/check/test/clippy/fmt/add/doc', type: 'output' },
  { text: '输入 "cargo help" 查看帮助', type: 'output' },
])

const command = ref('')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)
const outputRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()

const cargoVersion = 'cargo 1.75.0 (distributed with rustc 1.75.0)'

const projectFiles = ref<Map<string, string>>(new Map())

const addOutput = (text: string, type: OutputLine['type'] = 'output') => {
  output.value.push({ text, type })
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
}

const clearOutput = () => {
  output.value = [
    { text: 'Rust WASM Web IDE Terminal v0.1.0', type: 'output' },
  ]
}

const executeCommand = async () => {
  const cmd = command.value.trim()
  if (!cmd) return

  addOutput(cmd, 'command')
  commandHistory.value.push(cmd)
  historyIndex.value = commandHistory.value.length
  command.value = ''

  const parts = cmd.split(/\s+/)
  const [mainCmd, subCmd, ...args] = parts

  if (mainCmd === 'cargo') {
    await handleCargoCommand(subCmd, args)
  } else if (mainCmd === 'rustc') {
    await handleRustcCommand(subCmd, args)
  } else if (mainCmd === 'rustup') {
    handleRustupCommand(subCmd, args)
  } else if (mainCmd === 'clear') {
    clearOutput()
  } else if (mainCmd === 'help') {
    showHelp()
  } else {
    addOutput(`命令未找到: ${mainCmd}`, 'error')
  }
}

const handleCargoCommand = async (subCmd: string, args: string[]) => {
  switch (subCmd) {
    case 'version':
    case '-V':
    case '--version':
      addOutput(cargoVersion, 'output')
      addOutput('rustc 1.75.0 (82e4f1f5c 2023-12-01)', 'output')
      break

    case 'new':
      await cargoNew(args)
      break

    case 'init':
      await cargoInit(args)
      break

    case 'build':
      await cargoBuild(args)
      break

    case 'run':
      await cargoRun(args)
      break

    case 'check':
      await cargoCheck(args)
      break

    case 'test':
      await cargoTest(args)
      break

    case 'clippy':
      await cargoClippy(args)
      break

    case 'fmt':
    case 'rustfmt':
      await cargoFmt(args)
      break

    case 'add':
      await cargoAdd(args)
      break

    case 'remove':
      await cargoRemove(args)
      break

    case 'doc':
      await cargoDoc(args)
      break

    case 'clean':
      cargoClean(args)
      break

    case 'tree':
      cargoTree(args)
      break

    case 'metadata':
      cargoMetadata(args)
      break

    case 'update':
      cargoUpdate(args)
      break

    case 'search':
      await cargoSearch(args)
      break

    case 'install':
      await cargoInstall(args)
      break

    case 'uninstall':
      cargoUninstall(args)
      break

    case 'list':
      cargoList(args)
      break

    case 'help':
    case '--help':
    case '-h':
      showCargoHelp()
      break

    default:
      addOutput(`error: 不支持的子命令 "${subCmd}"`, 'error')
      addOutput('使用 "cargo help" 查看可用命令', 'output')
  }
}

const cargoNew = async (args: string[]) => {
  if (args.length === 0) {
    addOutput('error: 需要 <path> 参数', 'error')
    addOutput('用法: cargo new <path> [options]', 'output')
    return
  }

  const projectName = args[0]
  const isLib = args.includes('--lib')
  
  addOutput(`     Created ${(isLib ? 'library' : 'binary')} (application) \`${projectName}\` package`, 'success')
  
  projectFiles.value.set(`${projectName}/Cargo.toml`, `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"

[dependencies]
`)
  
  if (isLib) {
    projectFiles.value.set(`${projectName}/src/lib.rs`, `pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
`)
  } else {
    projectFiles.value.set(`${projectName}/src/main.rs`, `fn main() {
    println!("Hello, world!");
}
`)
  }
  
  emit('log', 'info', `创建项目: ${projectName}`)
  emit('execute', 'cargo new', [projectName])
}

const cargoInit = async (args: string[]) => {
  const isLib = args.includes('--lib')
  const projectName = 'rust-project'
  
  addOutput(`     Created ${(isLib ? 'library' : 'binary')} \`${projectName}\` package`, 'success')
  
  projectFiles.value.set('Cargo.toml', `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"

[dependencies]
`)
  
  if (isLib) {
    projectFiles.value.set('src/lib.rs', `pub fn add(left: u64, right: u64) -> u64 {
    left + right
}
`)
  } else {
    projectFiles.value.set('src/main.rs', `fn main() {
    println!("Hello, world!");
}
`)
  }
  
  emit('log', 'info', '初始化项目')
}

const cargoBuild = async (args: string[]) => {
  const isRelease = args.includes('--release')
  const target = args.find(a => a.startsWith('--target'))?.split('=')[1] || 'wasm32-unknown-unknown'
  
  addOutput('   Compiling rust-project v0.1.0 (...)', 'output')
  
  await new Promise(resolve => setTimeout(resolve, 500))
  
  if (isRelease) {
    addOutput('    Finished release [optimized] target(s) in 0.52s', 'success')
  } else {
    addOutput('    Finished dev [unoptimized + debuginfo] target(s) in 0.38s', 'success')
  }
  
  addOutput(`     Running \`rustc --crate-name rust_project --edition=2021 --target=${target}\``, 'output')
  
  emit('log', 'info', `构建完成 (release: ${isRelease}, target: ${target})`)
  emit('execute', 'cargo build', args)
}

const cargoRun = async (args: string[]) => {
  const isRelease = args.includes('--release')
  
  addOutput('   Compiling rust-project v0.1.0 (...)', 'output')
  await new Promise(resolve => setTimeout(resolve, 300))
  
  addOutput('    Finished dev [unoptimized + debuginfo] target(s) in 0.28s', 'success')
  addOutput('     Running `target\\debug\\rust-project.exe`', 'output')
  addOutput('Hello, world!', 'output')
  
  emit('log', 'info', '运行成功')
  emit('execute', 'cargo run', args)
}

const cargoCheck = async (args: string[]) => {
  addOutput('    Checking rust-project v0.1.0 (...)', 'output')
  
  await new Promise(resolve => setTimeout(resolve, 200))
  
  addOutput('    Finished dev [unoptimized + debuginfo] target(s) in 0.15s', 'success')
  
  emit('log', 'info', '检查通过')
  emit('execute', 'cargo check', args)
}

const cargoTest = async (args: string[]) => {
  addOutput('   Compiling rust-project v0.1.0 (...)', 'output')
  await new Promise(resolve => setTimeout(resolve, 300))
  
  addOutput('    Finished dev [unoptimized + debuginfo] target(s) in 0.28s', 'success')
  addOutput('     Running unittests src\\lib.rs (target\\debug\\deps\\rust_project.exe)', 'output')
  addOutput('', 'output')
  addOutput('running 1 test', 'output')
  addOutput('test tests::it_works ... ok', 'success')
  addOutput('', 'output')
  addOutput('test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out', 'success')
  addOutput('', 'output')
  addOutput('   Doc-tests rust-project', 'output')
  addOutput('', 'output')
  addOutput('running 0 tests', 'output')
  addOutput('', 'output')
  addOutput('test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out', 'success')
  
  emit('log', 'info', '测试通过')
  emit('execute', 'cargo test', args)
}

const cargoClippy = async (args: string[]) => {
  addOutput('    Checking rust-project v0.1.0 (...)', 'output')
  
  await new Promise(resolve => setTimeout(resolve, 250))
  
  addOutput('    Finished dev [unoptimized + debuginfo] target(s) in 0.22s', 'success')
  addOutput('     Running `\\target\\debug\\rust-project.exe`', 'output')
  
  emit('log', 'info', 'Clippy 检查完成')
  emit('execute', 'cargo clippy', args)
}

const cargoFmt = async (args: string[]) => {
  const check = args.includes('--check')
  
  if (check) {
    addOutput('rustfmt --check', 'output')
    addOutput('Diff in src/main.rs at line 1:', 'warning')
    addOutput('-fn main( ){', 'output')
    addOutput('+fn main() {', 'output')
  } else {
    addOutput('rustfmt', 'output')
    addOutput('已格式化 src/main.rs', 'success')
  }
  
  emit('log', 'info', '格式化完成')
  emit('execute', 'cargo fmt', args)
}

const cargoAdd = async (args: string[]) => {
  if (args.length === 0) {
    addOutput('error: 需要 <dep> 参数', 'error')
    addOutput('用法: cargo add <dep>[@<version>]', 'output')
    return
  }
  
  const dep = args[0]
  const parts = dep.split('@')
  const name = parts[0]
  const version = parts[1] || '*'
  
  addOutput(`    Updating crates.io index`, 'output')
  await new Promise(resolve => setTimeout(resolve, 200))
  addOutput(`      Adding ${name} v${version} to dependencies.`, 'success')
  addOutput(`    Updating crates.io index`, 'output')
  
  emit('log', 'info', `添加依赖: ${name}@${version}`)
  emit('execute', 'cargo add', [name, version])
}

const cargoRemove = async (args: string[]) => {
  if (args.length === 0) {
    addOutput('error: 需要 <dep> 参数', 'error')
    return
  }
  
  const dep = args[0]
  addOutput(`    Removing ${dep} from dependencies.`, 'success')
  
  emit('log', 'info', `移除依赖: ${dep}`)
}

const cargoDoc = async (args: string[]) => {
  const open = args.includes('--open')
  
  addOutput(' Documenting rust-project v0.1.0 (...)', 'output')
  await new Promise(resolve => setTimeout(resolve, 400))
  addOutput('    Finished dev [unoptimized + debuginfo] target(s) in 0.38s', 'success')
  
  if (open) {
    addOutput('Generated documentation for `rust-project`', 'success')
  }
  
  emit('log', 'info', '文档生成完成')
}

const cargoClean = (args: string[]) => {
  addOutput('Removed target directory', 'success')
  emit('log', 'info', '清理完成')
}

const cargoTree = (args: string[]) => {
  addOutput('rust-project v0.1.0', 'output')
  addOutput('└── (no dependencies)', 'output')
}

const cargoMetadata = (args: string[]) => {
  addOutput('{', 'output')
  addOutput('  "packages": [],', 'output')
  addOutput('  "resolve": null,', 'output')
  addOutput('  "target_directory": "target",', 'output')
  addOutput('  "version": 1', 'output')
  addOutput('}', 'output')
}

const cargoUpdate = (args: string[]) => {
  addOutput('    Updating crates.io index', 'output')
  addOutput('    Updating `Cargo.lock`', 'success')
}

const cargoSearch = async (args: string[]) => {
  if (args.length === 0) {
    addOutput('error: 需要 <query> 参数', 'error')
    return
  }
  
  const query = args[0]
  addOutput(`${query} = "0.1.0"    # 模拟搜索结果`, 'output')
  addOutput(`类似的包:`, 'output')
  addOutput(`  ${query}-derive = "0.1.0"`, 'output')
  addOutput(`  ${query}-async = "0.1.0"`, 'output')
}

const cargoInstall = async (args: string[]) => {
  if (args.length === 0) {
    addOutput('error: 需要 <crate> 参数', 'error')
    return
  }
  
  const crate = args[0]
  addOutput(`    Updating crates.io index`, 'output')
  await new Promise(resolve => setTimeout(resolve, 300))
  addOutput(`  Downloading ${crate} v1.0.0`, 'output')
  addOutput(`   Compiling ${crate} v1.0.0`, 'output')
  addOutput(`    Finished release [optimized] target(s) in 0.82s`, 'success')
  addOutput(`  Installing ${crate} v1.0.0`, 'output')
  addOutput(`   Installed package ${crate} v1.0.0 (executable ${crate})`, 'success')
  
  emit('log', 'info', `安装: ${crate}`)
}

const cargoUninstall = (args: string[]) => {
  if (args.length === 0) {
    addOutput('error: 需要 <package> 参数', 'error')
    return
  }
  
  const pkg = args[0]
  addOutput(`    Removing ${pkg} v1.0.0`, 'success')
}

const cargoList = (args: string[]) => {
  addOutput('已安装的包:', 'output')
  addOutput('  rustfmt-preview (1.75.0)', 'output')
  addOutput('  clippy-preview (1.75.0)', 'output')
}

const handleRustcCommand = async (subCmd: string, args: string[]) => {
  if (!subCmd || subCmd === '--version' || subCmd === '-V') {
    addOutput('rustc 1.75.0 (82e4f1f5c 2023-12-01)', 'output')
    addOutput('binary: rustc', 'output')
    addOutput('commit-hash: 82e4f1f5c86e85cb620ec5390c55b609d0a9b26e', 'output')
    addOutput('commit-date: 2023-12-01', 'output')
    addOutput('host: x86_64-pc-windows-msvc', 'output')
    addOutput('release: 1.75.0', 'output')
    addOutput('LLVM version: 17.0.4', 'output')
  } else if (subCmd === '--print') {
    const target = args[0] || 'cfg'
    if (target === 'cfg') {
      addOutput('debug_assertions', 'output')
      addOutput('panic="unwind"', 'output')
      addOutput('target_arch="x86_64"', 'output')
      addOutput('target_endian="little"', 'output')
      addOutput('target_env="msvc"', 'output')
      addOutput('target_family="windows"', 'output')
      addOutput('target_feature="fxsr"', 'output')
      addOutput('target_feature="sse"', 'output')
      addOutput('target_feature="sse2"', 'output')
      addOutput('target_os="windows"', 'output')
      addOutput('target_pointer_width="64"', 'output')
      addOutput('target_vendor="pc"', 'output')
      addOutput('windows', 'output')
    } else if (target === 'target-list') {
      addOutput('x86_64-unknown-linux-gnu', 'output')
      addOutput('x86_64-apple-darwin', 'output')
      addOutput('x86_64-pc-windows-msvc', 'output')
      addOutput('wasm32-unknown-unknown', 'output')
      addOutput('wasm32-wasi', 'output')
    }
  } else {
    addOutput('rustc: 编译 Rust 源文件', 'output')
  }
}

const handleRustupCommand = (subCmd: string, args: string[]) => {
  if (!subCmd || subCmd === '--version') {
    addOutput('rustup 1.26.0 (5af9d10f8 2023-10-11)', 'output')
  } else if (subCmd === 'show') {
    addOutput('Default host: x86_64-pc-windows-msvc', 'output')
    addOutput('rustup home:  ~/.rustup', 'output')
    addOutput('', 'output')
    addOutput('installed toolchains', 'output')
    addOutput('--------------------', 'output')
    addOutput('stable-x86_64-pc-windows-msvc (default)', 'output')
    addOutput('nightly-x86_64-pc-windows-msvc', 'output')
    addOutput('', 'output')
    addOutput('active toolchain', 'output')
    addOutput('----------------', 'output')
    addOutput('stable-x86_64-pc-windows-msvc (default)', 'output')
    addOutput('rustc 1.75.0 (82e4f1f5c 2023-12-01)', 'output')
  } else if (subCmd === 'target') {
    if (args[0] === 'list') {
      addOutput('Installed targets for active toolchain:', 'output')
      addOutput('----', 'output')
      addOutput('wasm32-unknown-unknown', 'output')
      addOutput('x86_64-pc-windows-msvc (default)', 'output')
    }
  } else {
    addOutput('rustup: Rust 工具链管理器', 'output')
  }
}

const showHelp = () => {
  addOutput('可用命令:', 'output')
  addOutput('  cargo <command>  - Cargo 包管理器', 'output')
  addOutput('  rustc            - Rust 编译器', 'output')
  addOutput('  rustup           - Rust 工具链管理器', 'output')
  addOutput('  clear            - 清空终端', 'output')
  addOutput('  help             - 显示帮助', 'output')
}

const showCargoHelp = () => {
  addOutput('Rust 的包管理器', 'output')
  addOutput('', 'output')
  addOutput('使用方法:', 'output')
  addOutput('    cargo <command> [<args>...]', 'output')
  addOutput('', 'output')
  addOutput('常用命令:', 'output')
  addOutput('    build, b    编译当前包', 'output')
  addOutput('    check, c    检查当前包中的错误', 'output')
  addOutput('    clean       移除构建产物', 'output')
  addOutput('    doc         构建当前包及其依赖项的文档', 'output')
  addOutput('    new         创建新的 cargo 包', 'output')
  addOutput('    init        在现有目录中创建新的 cargo 包', 'output')
  addOutput('    add         向清单添加依赖', 'output')
  addOutput('    run, r      运行本地包的二进制文件', 'output')
  addOutput('    test, t     运行测试', 'output')
  addOutput('    fmt         格式化代码', 'output')
  addOutput('    clippy      运行 clippy 检查', 'output')
  addOutput('', 'output')
  addOutput('查看命令的更多信息:', 'output')
  addOutput('    cargo <command> --help', 'output')
}

const historyUp = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    command.value = commandHistory.value[historyIndex.value]
  }
}

const historyDown = () => {
  if (historyIndex.value < commandHistory.value.length - 1) {
    historyIndex.value++
    command.value = commandHistory.value[historyIndex.value]
  } else {
    historyIndex.value = commandHistory.value.length
    command.value = ''
  }
}

const autocomplete = () => {
  const commands = [
    'cargo new', 'cargo build', 'cargo run', 'cargo check', 'cargo test',
    'cargo clippy', 'cargo fmt', 'cargo add', 'cargo doc', 'cargo clean',
    'cargo init', 'cargo tree', 'cargo update', 'cargo search',
    'cargo install', 'cargo version', 'cargo help',
    'rustc --version', 'rustup show', 'clear', 'help'
  ]
  
  const input = command.value.toLowerCase()
  const matches = commands.filter(c => c.startsWith(input))
  
  if (matches.length === 1) {
    command.value = matches[0] + ' '
  } else if (matches.length > 1) {
    addOutput(matches.join('  '), 'output')
  }
}

onMounted(() => {
  inputRef.value?.focus()
})

defineExpose({
  addOutput,
  clearOutput,
  executeCommand
})
</script>

<style scoped>
.terminal {
  display: flex;
  flex-direction: column;
  height: 200px;
  background-color: #0c0c0c;
  border-top: 2px solid #3c3c3c;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: linear-gradient(to bottom, #2d2d2d, #1e1e1e);
  border-bottom: 1px solid #3c3c3c;
}

.header-icon {
  font-size: 14px;
}

.header-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #cccccc;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 2px 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.terminal-output {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #cccccc;
}

.output-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.output-line.command {
  color: #4ec9b0;
}

.output-line.error {
  color: #f48771;
}

.output-line.success {
  color: #89d185;
}

.output-line.warning {
  color: #dcdcaa;
}

.prompt {
  color: #4ec9b0;
  font-weight: 600;
}

.terminal-input {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #1e1e1e;
  border-top: 1px solid #3c3c3c;
}

.input-field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #cccccc;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  caret-color: #aeafad;
}

.input-field::placeholder {
  color: #6a6a6a;
}

.terminal-output::-webkit-scrollbar {
  width: 8px;
}

.terminal-output::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-output::-webkit-scrollbar-thumb {
  background-color: #424242;
  border-radius: 4px;
}

.terminal-output::-webkit-scrollbar-thumb:hover {
  background-color: #4f4f4f;
}
</style>
