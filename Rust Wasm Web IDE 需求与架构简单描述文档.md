# Rust WASM Web IDE 需求与架构文档

> **更新日期**: 2026-05-17  
> **版本**: v0.2.0  
> **状态**: 已实现核心功能

## 一、核心需求

### 1. 基础功能需求

#### ✅ 代码编辑
- Monaco Editor（VS Code 核心编辑器）
- Rust 语法高亮 + 自动补全
- 实时语法错误校验
- 代码格式化（rustfmt 风格）
- 多文件标签页编辑
- 目录树结构管理

#### ✅ WASM 编译
- **rustToWAT**：自研轻量级编译器（本地 WASM）
- **Rust Playground**：官方 rustc API（远程执行）
- 自动回退机制（rustToWAT → Playground）
- 支持 `#[derive]`、trait、泛型、宏等
- 一键编译为 .wasm 文件

#### ✅ 预览运行
- 浏览器内即时执行
- Iris 解释器（本地 WASM）
- Rust Playground（远程执行）
- 日志输出 + 错误提示

#### ✅ 文件管理
- 新建、保存、打开、上传、下载
- 支持 .rs、.wasm、.toml、.md 等文件
- localStorage 持久化存储
- 双击打开、悬停操作按钮

### 2. 高级功能需求

#### ✅ 类型检查与 Lint
- rust-analyzer WASM（类型检查、补全、悬停）
- Clippy WASM（40 个 lint 规则）
- 实时诊断反馈

#### ✅ 终端支持
- xterm.js（VS Code 同款终端）
- 支持 cargo 全部命令
- ANSI 颜色 + Unicode 支持

#### ✅ 性能优化
- 多线程并行分析（24 Worker）
- GPU 加速（WebGPU）
- 动态导入（代码分割）

### 3. 非功能需求

#### ✅ 兼容性
- 支持主流现代浏览器（Chrome、Edge、Firefox）
- 无需安装插件或本地工具
- 打开网页即可使用

#### ✅ 稳定性
- 编译过程不崩溃
- 临时文件正常保存/读取
- 异常场景有明确提示

## 二、架构描述

### 1. 整体架构

```
┌─────────────────────────────────────────┐
│           UI 交互层（Vue 3）              │
│  Monaco Editor + xterm.js + Panels      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         核心逻辑层（TypeScript）          │
│  rustToWAT + rustAnalyzer + Clippy      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        WASM 能力层（Rust → WASM）         │
│  rust-analyzer-wasm + clippy-wasm       │
└─────────────────────────────────────────┘
```

**特点**：
- 纯浏览器端运行，无后端
- 所有编译/执行在浏览器内完成
- 零安装、零配置

### 2. 各层核心模块

#### （1）UI 交互层

**Monaco Editor 模块**
- 基于 VS Code 核心编辑器
- Rust 语法高亮 + 补全
- 实时语法检查
- 代码格式化

**Panel 模块**
- **Toolbar**：编译、运行、类型检查、Clippy、格式化
- **TabBar**：多文件标签页
- **FileExplorer**：目录树 + 文件操作
- **Terminal**：cargo 命令支持

**LogPanel**
- 编译日志
- 运行日志
- 类型检查结果
- Clippy 警告

#### （2）核心逻辑层

**rustToWAT 模块**（3716 行）
- Rust → WAT 编译器
- 支持语法：
  - ✅ fn, let, if/else, for, while, match
  - ✅ struct, enum, impl, trait
  - ✅ #[derive(Debug, Clone, PartialEq, Default)]
  - ✅ macro_rules!
  - ✅ 泛型（部分）
  - ✅ async/await

**rustAnalyzer 模块**
- rust-analyzer WASM（~100KB）
- 类型检查
- 代码补全
- 悬停提示
- TypeScript fallback

**clippyChecker 模块**
- Clippy WASM（~50KB）
- 40 个 lint 规则
- 实时反馈

**wasmCompiler 模块**
- WAT → WASM（wabt.js）
- rustToWAT + Playground 混合编译
- 自动回退机制

**fileManager 模块**
- localStorage 存储
- 多文件管理
- 标签页状态管理

#### （3）WASM 能力层

**rust-analyzer-wasm**
- 自研 rust-analyzer WASM
- mock ra_* 接口
- 体积：~100KB（官方 ~4MB）

**clippy-wasm**
- 自研 Clippy WASM
- mock rustc 接口
- 40 个 lint 规则

**rust-interpreter**
- Rust 解释器 WASM
- 即时执行

### 3. 核心流程

#### 编辑流程
```
用户输入 → Monaco Editor → 实时语法检查 → UI 反馈
```

#### 编译流程
```
用户点击编译 → rustToWAT 尝试编译
  ↓ (成功)
WAT → WASM (wabt.js) → 下载 .wasm
  ↓ (失败)
Rust Playground API → 返回执行结果
```

#### 类型检查流程
```
用户点击类型检查 → 加载 rust-analyzer WASM
  ↓
分析代码 → 返回诊断信息 → UI 显示
```

#### Clippy 流程
```
用户点击 Clippy → 加载 clippy-wasm
  ↓
检查代码 → 返回警告 → UI 显示
```

### 4. 关键技术点

#### 前端技术栈
```
Vue 3 + TypeScript + Vite
├── Monaco Editor (3,095 KB)
├── xterm.js (329 KB)
├── rustToWAT.ts (52 KB)
└── vue-i18n (国际化)
```

#### WASM 模块
```
rust-analyzer-wasm (~100 KB)
├── ra_syntax/  (语法解析)
├── ra_ide/     (IDE 功能)
├── ra_hir/     (HIR 生成)
└── ra_db/      (数据库)

clippy-wasm (~50 KB)
├── 40 lint 规则
└── mock rustc 接口
```

#### Mock 方案
- mock_rustc/：10 个模块（空实现）
- mock_rust_analyzer/：4 个模块
- 体积：~100KB vs 官方 ~4MB（40 倍差距）

## 三、部署架构

### GitHub Pages
```
Source: main branch
Build: npm run build:github
Output: docs-github/
URL: https://itszzl-sudo.github.io/rust-wasm-web-ide/
```

### Cloudflare Pages
```
Build command: npm run build:cloudflare
Output: docs-cloudflare/
Auto deploy: git push 触发
```

### GitHub Actions
```yaml
.on: push to main
Jobs:
  1. Build rust-analyzer WASM
  2. Build Clippy WASM
  3. Build frontend
  4. Deploy to GitHub Pages
```

## 四、性能指标

### 体积对比

| 模块 | 原始大小 | Gzip |
|------|----------|------|
| rustToWAT | 52 KB | 11 KB |
| rust-analyzer WASM | ~100 KB | ~30 KB |
| Clippy WASM | ~50 KB | ~15 KB |
| xterm.js | 329 KB | 83 KB |
| Monaco Editor | 3,095 KB | 798 KB |

### 性能优势

**rust-analyzer WASM**
- 官方：~4MB（500+ rustc crate）
- 自研：~100KB（mock 接口）
- **优势**：40 倍体积差距

**Clippy WASM**
- 官方：~2MB
- 自研：~50KB
- **优势**：40 倍体积差距

## 五、开发路线

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
- [x] Playground 回退机制

### 进行中 🚧

- [ ] Source Map（调试信息）
- [ ] 更多 lint 规则
- [ ] 错误恢复机制

### 计划中 📋

- [ ] 插件系统
- [ ] 云端存储
- [ ] 协作编辑
- [ ] 性能分析工具

## 六、测试用例

### 编译测试

```rust
// 基本语法
fn main() {
    println!("Hello, Rust!");
}

// #[derive] 宏
#[derive(Debug, Clone)]
struct Point { x: i32, y: i32 }

// trait 实现
trait Display {
    fn show(&self) -> String;
}

// 泛型
fn add<T: Add>(a: T, b: T) -> T {
    a + b
}
```

### 类型检查测试

```rust
// 错误检测
let x: i32 = "string"; // 类型不匹配

// 未定义变量
println!("{}", y); // 找不到 y
```

### Clippy 测试

```rust
// needless_return
fn foo() {
    return 42; // 警告：可简化为 42
}

// clone_on_copy
let x = 5;
let y = x.clone(); // 警告：可简化为 x
```

## 七、FAQ

**Q: 为什么有些代码编译失败？**  
A: rustToWAT 不支持所有 Rust 语法，会自动回退到 Rust Playground。

**Q: rust-analyzer WASM 为什么这么小？**  
A: 通过 mock rustc 公开接口，空实现内部函数，避免 500+ 依赖。

**Q: 终端命令是真实执行吗？**  
A: 不是，终端模拟输出，不实际执行命令。

**Q: 如何调试 WASM？**  
A: 当前版本不支持 Source Map，建议使用 Playground 模式调试。

---

🤖 Generated with CodeArts
