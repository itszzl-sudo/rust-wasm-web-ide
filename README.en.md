# Rust Web IDE

English | [简体中文](README.md)

Browser-based Rust code editing, interpretation, and compilation environment. Zero installation, instant execution.

**[Live Demo](https://itszzl-sudo.github.io/rust-wasm-web-ide/)**

## Features

- **In-browser interpretation**: Execute Rust source code directly in the browser without backend
- **Browser-side compilation**: Complete Rust → WAT → WASM pipeline (wabt.js)
- **24-thread parallel checking**: Multi-subdomain acceleration bypassing browser concurrency limits
- **Monaco Editor**: VS Code-level editing experience with Rust syntax highlighting
- **i18n support**: Chinese/English bilingual interface
- **localStorage storage**: Files automatically saved to browser local storage
- **wasm-bindgen syntax**: Full WebAssembly development syntax support

## Tech Stack

- **Frontend Framework**: Vue 3 + TypeScript
- **Editor**: Monaco Editor
- **Rust Interpreter**: Custom interpreter (compiled to Wasm, 69KB)
- **Wasm Compiler**: Rust → WAT → WASM (wabt.js)
- **Multi-thread acceleration**: 24 subdomain parallel checking
- **Build Tool**: Vite

## Project Structure

```
rust-wasm-web-ide/
├── src/                        # Frontend source code
│   ├── components/            # Vue components
│   │   ├── Editor/           # Monaco editor
│   │   ├── Panel/            # Toolbar, file explorer, log
│   │   └── Layout/           # Main layout
│   ├── utils/                # Utilities
│   │   ├── rustInterpreter.ts    # Interpreter interface
│   │   ├── rustToWAT.ts          # Rust → WAT converter
│   │   ├── wasmCompiler.ts       # WAT → WASM compiler
│   │   ├── parallelInterpreter.ts # Parallel interpreter pool
│   │   └── multiDomainLoader.ts   # Multi-domain loader
│   ├── i18n/                 # Internationalization
│   └── main.ts               # Entry file
├── rust-interpreter/         # Rust interpreter source
│   ├── src/lib.rs           # Interpreter implementation (1347 lines)
│   └── Cargo.toml
├── rust-type-checker/        # Type checker
├── docs/                     # GitHub Pages deployment
├── setup-cloudflare.js       # Cloudflare setup script
└── wrangler.toml            # Wrangler config
```

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- wasm-pack

### Install Dependencies

```bash
npm install
```

### Compile Rust Interpreter

```bash
cd rust-interpreter
wasm-pack build --target web --out-dir ../public/wasm
cd ..
```

### Start Development Server

```bash
npm run dev
```

Visit http://localhost:5173

### Build for Production

```bash
npm run build
```

## Usage

1. **Edit code**: Enter Rust code in the editor
2. **Run code**: Click "Run" button for interpretation
3. **Compile code**: Click "Compile" button to generate WASM
4. **Parallel check**: Click "Parallel Check" for 24-thread syntax checking
5. **Download code**: Click "Download" to download source file
6. **Switch language**: Click "EN/中" button in top right

## Supported Rust Features

### Currently Supported

- Variable declarations (`let`, `let mut`, `const`, `static`)
- Basic types (`i32`, `f64`, `bool`, `String`)
- Arithmetic, comparison, logical operators
- Control flow (`if`/`else`, `while`, `for`, `match`)
- Function definitions (`fn`, `pub fn`)
- Structs (`struct`)
- Enums (`enum`)
- impl blocks
- trait definitions
- Module system (`use`, `mod`, `extern`)
- Type aliases (`type`)
- `println!` macro
- wasm-bindgen syntax (`#[wasm_bindgen]`)

### Planned Support

- Closures
- Iterators
- async/await
- More macro expansion

## Architecture

### Compilation Pipeline

```
Rust source
  ↓ (rustToWAT.ts)
WAT text format
  ↓ (wabt.js)
WASM binary
```

### Execution Modes

- **Interpretation**: syn interpreter (69KB Wasm) - instant startup
- **Compilation**: Rust → WAT → WASM - complete browser-side compilation
- **Parallel checking**: 24 subdomains × 6 concurrency = 144 connections

### Multi-domain Acceleration

```
Main domain: https://itszzl-sudo.github.io/rust-wasm-web-ide/
Subdomains: ide01-ide24.irisverse.org → main domain
```

## Deployment

### GitHub Pages

Automatically deployed to GitHub Pages:
- https://itszzl-sudo.github.io/rust-wasm-web-ide/

### Cloudflare DNS Acceleration

Use setup script to create 24 subdomains:

```bash
node setup-cloudflare.js
```

See [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md) for details.

## Documentation

- [Requirements Specification](.codeartsdoer/specs/rust-wasm-web-ide/spec.md)
- [Technical Design](.codeartsdoer/specs/rust-wasm-web-ide/design.md)
- [Session Record](.codeartsdoer/session_20260510_1708.md)

## Acknowledgments

This project was developed with assistance from **[Huawei Cloud CodeArts](https://www.huaweicloud.com/product/codearts.html)**.

Thanks to the following open source projects:
- [Vue 3](https://vuejs.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [wabt](https://github.com/WebAssembly/wabt)
- [wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/)
- [syn](https://github.com/dtolnay/syn)

## License

MIT
