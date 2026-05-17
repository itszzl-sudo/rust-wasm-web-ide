# Rust WASM Web IDE

纯浏览器端运行的 Rust WebAssembly 开发环境，支持即时编辑、编译、执行和调试。

## 功能特性

### 核心功能

- **代码编辑器**
  - Monaco Editor（VS Code 核心）
  - Rust 语法高亮 + 自动补全
  - 实时语法检查
  - 代码格式化

- **多文件支持**
  - 多文件标签页编辑
  - 目录树结构管理
  - 文件上传/下载
  - localStorage 持久化

- **编译与执行**
  - **rustToWAT**：自研轻量级编译器（本地 WASM）
  - **Rust Playground**：官方 rustc API（远程执行）
  - 自动回退机制（rustToWAT → Playground）
  - 支持 `#[derive]`、trait、泛型、宏等

- **类型检查与 Lint**
  - rust-analyzer WASM（类型检查、补全、悬停）
  - Clippy WASM（40 个 lint 规则）
  - 实时诊断反馈

- **终端**
  - xterm.js（VS Code 同款）
  - 支持 cargo 全部命令
  - ANSI 颜色 + Unicode

### 高级特性

- **多线程分析**：24 Worker 并行语法检查
- **GPU 加速**：WebGPU 渲染支持
- **双平台部署**：GitHub Pages + Cloudflare Pages

## 技术架构

### 前端技术栈

```
Vue 3 + TypeScript + Vite
├── Monaco Editor        # 代码编辑器
├── xterm.js             # 终端模拟器
├── rustToWAT.ts         # Rust → WAT 编译器（3716 行）
├── rustAnalyzer.ts      # 类型检查（WASM + TS fallback）
├── clippyChecker.ts     # Clippy 检查
└── wasmCompiler.ts      # WASM 编译（wabt.js）
```

### WASM 模块

```
rust-analyzer-wasm/      # 自研 rust-analyzer (~100KB)
├── ra_syntax/           # 语法解析
├── ra_ide/              # IDE 功能
├── ra_hir/              # HIR 生成
└── ra_db/               # 数据库

clippy-wasm/             # Clippy (~50KB)
├── 40 个 lint 规则
└── mock rustc 接口
```

### 编译流程

```
用户代码
   ↓
rustToWAT 尝试编译
   ↓ (成功)
WAT → WASM (wabt.js)
   ↓ (失败)
Rust Playground API
   ↓
返回结果
```

## 快速开始

### 在线使用

- **GitHub Pages**: https://itszzl-sudo.github.io/rust-wasm-web-ide/
- **Cloudflare Pages**: https://rust-wasm-web-ide.pages.dev/

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建 GitHub Pages 版本
npm run build:github

# 构建 Cloudflare Pages 版本
npm run build:cloudflare
```

### 构建 WASM 模块

```bash
# 构建 rust-analyzer WASM
cd rust-analyzer-wasm
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/rust_analyzer_wasm.wasm \
  --out-dir ../public/type-checker --target web

# 构建 Clippy WASM
cd clippy-wasm
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/clippy_wasm.wasm \
  --out-dir ../public/clippy --target web
```

## 项目结构

```
rust-wasm-web-ide/
├── src/
│   ├── components/
│   │   ├── Editor/           # Monaco Editor 封装
│   │   ├── Panel/            # Toolbar/TabBar/FileExplorer/Terminal
│   │   └── Layout/           # MainLayout
│   ├── utils/
│   │   ├── rustToWAT.ts      # Rust → WAT 编译器
│   │   ├── wasmCompiler.ts   # WASM 编译
│   │   ├── rustAnalyzer.ts   # 类型检查
│   │   ├── clippyChecker.ts  # Clippy 检查
│   │   └── fileManager.ts    # 文件管理
│   └── locales/              # i18n
│
├── rust-analyzer-wasm/       # rust-analyzer WASM
├── clippy-wasm/              # Clippy WASM
├── mock_rust_analyzer/       # mock ra_* 模块
├── mock_rustc/               # mock rustc 模块
│
├── public/
│   ├── type-checker/         # rust-analyzer WASM 产物
│   └── clippy/               # Clippy WASM 产物
│
└── .github/workflows/        # 自动部署
```

## 使用指南

### 基本操作

1. **编辑代码**：在 Monaco 编辑器中编写 Rust 代码
2. **运行代码**：点击 ▶ 按钮或按 `Ctrl+Enter`
3. **类型检查**：点击 🔍 按钮（自动加载 rust-analyzer）
4. **Clippy 检查**：点击 🧹 按钮（40 个 lint 规则）
5. **生成 WASM**：点击 ⚙️ 按钮（编译为 .wasm 文件）

### 文件操作

- **新建文件**：点击文件树上的 + 按钮
- **上传文件**：点击 ↑ 按钮或拖拽文件
- **双击打开**：双击文件在标签页中打开
- **悬停操作**：鼠标悬停显示重命名/下载/删除按钮

### 执行器切换

- **Iris**：本地 WASM 解释器（快速，离线）
- **Playground**：官方 rustc API（完整语法，需网络）

### 终端命令

支持完整的 cargo 命令：

```bash
cargo new my-project       # 创建新项目
cargo build --release      # 构建项目
cargo run                  # 运行项目
cargo test                 # 运行测试
cargo clippy               # Clippy 检查
cargo fmt                  # 格式化代码
cargo add serde            # 添加依赖
```

## 开发路线

### 已完成 ✅

- [x] Monaco Editor 集成
- [x] Rust 语法高亮 + 补全
- [x] 多文件标签页
- [x] 目录树结构
- [x] rustToWAT 编译器（3716 行）
- [x] rust-analyzer WASM
- [x] Clippy WASM（40 规则）
- [x] xterm.js 终端
- [x] cargo 全部命令
- [x] 多线程并行检查
- [x] GPU 加速支持
- [x] 双平台部署

### 进行中 🚧

- [ ] Source Map（调试信息）
- [ ] 更多 lint 规则
- [ ] 插件系统

### 计划中 📋

- [ ] 云端存储
- [ ] 协作编辑
- [ ] 性能分析工具

## 技术细节

### rustToWAT 支持的语法

**已支持：**
- ✅ `fn`, `let`, `if/else`, `for`, `while`, `match`
- ✅ `struct`, `enum`, `impl`
- ✅ `trait` 定义和实现
- ✅ `#[derive(Debug, Clone, PartialEq, Default)]`
- ✅ `macro_rules!`
- ✅ 泛型（部分）
- ✅ async/await
- ✅ 智能指针（Box, Rc, RefCell）

**未支持（使用 Playground）：**
- ❌ 完整泛型约束
- ❌ where 子句
- ❌ 过程宏

### 性能指标

| 模块 | 体积 | Gzip |
|------|------|------|
| rustToWAT | ~50 KB | ~11 KB |
| rust-analyzer WASM | ~100 KB | ~30 KB |
| Clippy WASM | ~50 KB | ~15 KB |
| xterm.js | 329 KB | 83 KB |
| Monaco Editor | 3,095 KB | 798 KB |

## 部署

### GitHub Pages

```bash
npm run build:github
# 自动部署：git push 触发 GitHub Actions
```

### Cloudflare Pages

```bash
npm run build:cloudflare
# 在 Cloudflare Dashboard 配置构建命令
```

### GitHub Actions 自动部署

`.github/workflows/deploy.yml` 配置：
- 安装 Rust + wasm-bindgen-cli
- 构建 rust-analyzer WASM + Clippy WASM
- 打包前端
- 部署到 GitHub Pages

## 常见问题

**Q: 为什么有些代码编译失败？**
A: rustToWAT 不支持所有 Rust 语法，会自动回退到 Rust Playground。

**Q: 如何调试 WASM？**
A: 当前版本不支持 Source Map，建议使用 Playground 模式调试。

**Q: 终端支持哪些命令？**
A: 支持 cargo/rustc/rustup 全部命令，但仅模拟输出，不实际执行。

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

---

🤖 Generated with CodeArts
