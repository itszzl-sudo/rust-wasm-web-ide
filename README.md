# Rust Web IDE

[English](README.en.md) | 简体中文

浏览器内 Rust 代码编辑、解释执行与编译环境，零安装、即时运行。

**[在线演示](https://itszzl-sudo.github.io/rust-wasm-web-ide/)**

## 特性

- **浏览器内解释执行**：无需后端，直接在浏览器内解释执行 Rust 源码
- **浏览器端编译**：Rust → WAT → WASM 完整编译流程（wabt.js）
- **24 线程并行检查**：多子域名加速，绕过浏览器并发限制
- **Monaco 编辑器**：VS Code 级别编辑体验，Rust 语法高亮、自动补全
- **国际化支持**：中文/英文双语界面
- **localStorage 存储**：文件自动保存到浏览器本地存储
- **wasm-bindgen 语法支持**：完整支持 WebAssembly 开发语法

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **编辑器**：Monaco Editor
- **Rust 解释器**：自定义解释器（编译为 Wasm，69KB）
- **Wasm 编译器**：Rust → WAT → WASM（wabt.js）
- **多线程加速**：24 子域名并行检查
- **构建工具**：Vite

## 项目结构

```
rust-wasm-web-ide/
├── src/                        # 前端源码
│   ├── components/            # Vue 组件
│   │   ├── Editor/           # Monaco 编辑器
│   │   ├── Panel/            # 工具栏、文件浏览器、日志
│   │   └── Layout/           # 主布局
│   ├── utils/                # 工具函数
│   │   ├── rustInterpreter.ts    # 解释器接口
│   │   ├── rustToWAT.ts          # Rust → WAT 转换器
│   │   ├── wasmCompiler.ts       # WAT → WASM 编译器
│   │   ├── parallelInterpreter.ts # 并行解释器池
│   │   └── multiDomainLoader.ts   # 多域名加载器
│   ├── i18n/                 # 国际化
│   └── main.ts               # 入口文件
├── rust-interpreter/         # Rust 解释器源码
│   ├── src/lib.rs           # 解释器实现（1347 行）
│   └── Cargo.toml
├── rust-type-checker/        # 类型检查器
├── docs/                     # GitHub Pages 部署目录
├── setup-cloudflare.js       # Cloudflare 配置脚本
└── wrangler.toml            # Wrangler 配置
```

## 开发

### 前置要求

- Node.js 18+
- Rust 1.70+
- wasm-pack

### 安装依赖

```bash
npm install
```

### 编译 Rust 解释器

```bash
cd rust-interpreter
wasm-pack build --target web --out-dir ../public/wasm
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

1. **编辑代码**：在编辑器中输入 Rust 代码
2. **运行代码**：点击"运行"按钮，解释执行
3. **编译代码**：点击"编译"按钮，生成 WASM 并下载
4. **并行检查**：点击"并行检查"按钮，24 线程语法检查
5. **下载代码**：点击"下载"按钮，下载源码文件
6. **切换语言**：点击右上角 "EN/中" 按钮

## 支持的 Rust 特性

### 已支持

- 变量声明（`let`、`let mut`、`const`、`static`）
- 基本类型（`i32`、`f64`、`bool`、`String`）
- 算术运算、比较运算、逻辑运算
- 控制流（`if`/`else`、`while`、`for`、`match`）
- 函数定义（`fn`、`pub fn`）
- 结构体（`struct`）
- 枚举（`enum`）
- impl 块
- trait 定义
- 模块系统（`use`、`mod`、`extern`）
- 类型别名（`type`）
- `println!` 宏
- wasm-bindgen 语法（`#[wasm_bindgen]`）

### 计划支持

- 闭包
- 迭代器
- async/await
- 更多宏展开

## 架构

### 编译流程

```
Rust源码
  ↓ (rustToWAT.ts)
WAT文本格式
  ↓ (wabt.js)
WASM二进制
```

### 执行模式

- **解释执行**：syn 解释器（69KB Wasm）- 即时启动
- **编译执行**：Rust → WAT → WASM - 浏览器端完整编译
- **并行检查**：24 子域名 × 6 并发 = 144 连接

### 多域名加速

```
主域名: https://itszzl-sudo.github.io/rust-wasm-web-ide/
子域名: ide01-ide24.irisverse.org → 主域名
```

## 部署

### GitHub Pages

已自动部署到 GitHub Pages：
- https://itszzl-sudo.github.io/rust-wasm-web-ide/

### Cloudflare DNS 加速

使用配置脚本创建 24 个子域名：

```bash
node setup-cloudflare.js
```

详见 [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md)

## 文档

- [需求规格](.codeartsdoer/specs/rust-wasm-web-ide/spec.md)
- [技术设计](.codeartsdoer/specs/rust-wasm-web-ide/design.md)
- [会话记录](.codeartsdoer/session_20260510_1708.md)

## 致谢

本项目由 **[华为云码道](https://www.huaweicloud.com/product/codearts.html)** 协助开发。

感谢以下开源项目：
- [Vue 3](https://vuejs.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [wabt](https://github.com/WebAssembly/wabt)
- [wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/)
- [syn](https://github.com/dtolnay/syn)

## 许可证

MIT
