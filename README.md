# Rust Web IDE

浏览器内 Rust 代码编辑与解释执行环境，零安装、零编译、即时运行。

## 特性

- **浏览器内解释执行**：无需编译，直接在浏览器内解释执行 Rust 源码
- **Monaco 编辑器**：提供 VS Code 级别的编辑体验，支持 Rust 语法高亮、自动补全
- **单项目单 crate**：简化的项目管理，专注于单个 Rust crate
- **GPU 执行优化**：（计划中）利用 WebGPU 加速代码执行
- **多线程代码分析**：（计划中）通过多域名实现并行代码分析
- **localStorage 存储**：文件自动保存到浏览器本地存储

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **编辑器**：Monaco Editor
- **Rust 解释器**：自定义 Rust 解释器（编译为 Wasm）
- **构建工具**：Vite

## 项目结构

```
rust-wasm-web-ide/
├── src/                        # 前端源码
│   ├── components/            # Vue 组件
│   │   ├── Editor/           # Monaco 编辑器封装
│   │   ├── Panel/            # 操作面板、文件浏览器、日志面板
│   │   └── Layout/           # 主布局
│   ├── utils/                # 工具函数
│   │   ├── fileManager.ts    # 文件管理（localStorage）
│   │   ├── projectManager.ts # 项目管理
│   │   └── rustInterpreter.ts # Rust 解释器接口
│   ├── i18n/                 # 国际化
│   ├── App.vue               # 根组件
│   └── main.ts               # 入口文件
├── rust-interpreter/         # Rust 解释器源码
│   ├── src/
│   │   └── lib.rs           # 解释器实现
│   └── Cargo.toml           # Rust 项目配置
├── .codeartsdoer/           # 规格与设计文档
│   └── specs/
│       └── rust-wasm-web-ide/
│           ├── spec.md      # 需求规格
│           └── design.md    # 技术设计
└── package.json             # Node.js 项目配置
```

## 开发

### 前置要求

- Node.js 18+
- Rust 1.70+（用于编译 Rust 解释器）
- wasm-pack（Rust Wasm 打包工具）

### 安装依赖

```bash
npm install
```

### 编译 Rust 解释器

```bash
cd rust-interpreter
wasm-pack build --target web --out-dir ../public/rust-interpreter/pkg
cd ..
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

## 使用说明

1. **编辑代码**：在左侧编辑器中输入 Rust 代码
2. **运行代码**：点击"运行"按钮，在浏览器内解释执行
3. **保存文件**：点击"保存"按钮，文件保存到 localStorage
4. **新建文件**：点击"新建"按钮创建新的 Rust 文件
5. **格式化代码**：点击"格式化"按钮整理代码风格

## 支持的 Rust 特性

### 已支持

- 变量声明（`let`、`let mut`）
- 基本类型（`i32`、`f64`、`bool`、`String`）
- 算术运算（`+`、`-`、`*`、`/`、`%`）
- 比较运算（`==`、`!=`、`<`、`<=`、`>`、`>=`）
- 逻辑运算（`&&`、`||`、`!`）
- 控制流（`if`/`else`、`while`、`for`）
- 函数定义（`fn`）
- `println!` 宏

### 计划支持

- 结构体（`struct`）
- 枚举（`enum`）
- 模式匹配（`match`）
- 闭包
- 迭代器
- 更多宏

## 未来功能

- **发布编译**：将 Rust 源码编译为 Wasm 二进制产物
- **GPU 执行优化**：利用 WebGPU 加速数值计算
- **多线程代码分析**：通过多域名实现并行语法分析和类型检查
- **代码调试**：断点、单步执行、变量查看

## 文档

- [需求规格](.codeartsdoer/specs/rust-wasm-web-ide/spec.md)
- [技术设计](.codeartsdoer/specs/rust-wasm-web-ide/design.md)

## 许可证

MIT
