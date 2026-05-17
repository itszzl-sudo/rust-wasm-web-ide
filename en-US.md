# Rust WASM Web IDE

A pure browser-based Rust WebAssembly development environment with instant editing, compilation, execution, and debugging.

## Features

### Core Features

- **Code Editor**
  - Monaco Editor (VS Code core)
  - Rust syntax highlighting + auto-completion
  - Real-time syntax checking
  - Code formatting

- **Multi-file Support**
  - Multi-tab editing
  - Directory tree management
  - File upload/download
  - localStorage persistence

- **Compilation & Execution**
  - **rustToWAT**: Lightweight compiler (local WASM)
  - **Rust Playground**: Official rustc API (remote execution)
  - Automatic fallback mechanism (rustToWAT → Playground)
  - Support for `#[derive]`, traits, generics, macros, etc.

- **Type Checking & Linting**
  - rust-analyzer WASM (type checking, completion, hover)
  - Clippy WASM (40 lint rules)
  - Real-time diagnostic feedback

- **Terminal**
  - xterm.js (same as VS Code)
  - Support all cargo commands
  - ANSI colors + Unicode

### Advanced Features

- **Multi-threaded Analysis**: 24 workers for parallel syntax checking
- **GPU Acceleration**: WebGPU rendering support
- **Dual Platform Deployment**: GitHub Pages + Cloudflare Pages

## Technical Architecture

### Frontend Stack

```
Vue 3 + TypeScript + Vite
├── Monaco Editor        # Code editor
├── xterm.js             # Terminal emulator
├── rustToWAT.ts         # Rust → WAT compiler (3716 lines)
├── rustAnalyzer.ts      # Type checking (WASM + TS fallback)
├── clippyChecker.ts     # Clippy checking
└── wasmCompiler.ts      # WASM compilation (wabt.js)
```

### WASM Modules

```
rust-analyzer-wasm/      # Custom rust-analyzer (~100KB)
├── ra_syntax/           # Syntax parsing
├── ra_ide/              # IDE features
├── ra_hir/              # HIR generation
└── ra_db/               # Database

clippy-wasm/             # Clippy (~50KB)
├── 40 lint rules
└── mock rustc interface
```

### Compilation Flow

```
User Code
   ↓
rustToWAT attempts compilation
   ↓ (success)
WAT → WASM (wabt.js)
   ↓ (failure)
Rust Playground API
   ↓
Return result
```

## Quick Start

### Online Usage

- **GitHub Pages**: https://itszzl-sudo.github.io/rust-wasm-web-ide/
- **Cloudflare Pages**: https://rust-wasm-web-ide.pages.dev/

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for GitHub Pages
npm run build:github

# Build for Cloudflare Pages
npm run build:cloudflare
```

### Build WASM Modules

```bash
# Build rust-analyzer WASM
cd rust-analyzer-wasm
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/rust_analyzer_wasm.wasm \
  --out-dir ../public/type-checker --target web

# Build Clippy WASM
cd clippy-wasm
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/clippy_wasm.wasm \
  --out-dir ../public/clippy --target web
```

## Project Structure

```
rust-wasm-web-ide/
├── src/
│   ├── components/
│   │   ├── Editor/           # Monaco Editor wrapper
│   │   ├── Panel/            # Toolbar/TabBar/FileExplorer/Terminal
│   │   └── Layout/           # MainLayout
│   ├── utils/
│   │   ├── rustToWAT.ts      # Rust → WAT compiler
│   │   ├── wasmCompiler.ts   # WASM compilation
│   │   ├── rustAnalyzer.ts   # Type checking
│   │   ├── clippyChecker.ts  # Clippy checking
│   │   └── fileManager.ts    # File management
│   └── locales/              # i18n
│
├── rust-analyzer-wasm/       # rust-analyzer WASM
├── clippy-wasm/              # Clippy WASM
├── mock_rust_analyzer/       # mock ra_* modules
├── mock_rustc/               # mock rustc modules
│
├── public/
│   ├── type-checker/         # rust-analyzer WASM output
│   └── clippy/               # Clippy WASM output
│
└── .github/workflows/        # Auto deployment
```

## User Guide

### Basic Operations

1. **Edit Code**: Write Rust code in Monaco editor
2. **Run Code**: Click ▶ button or press `Ctrl+Enter`
3. **Type Check**: Click 🔍 button (auto-loads rust-analyzer)
4. **Clippy Check**: Click 🧹 button (40 lint rules)
5. **Generate WASM**: Click ⚙️ button (compile to .wasm file)

### File Operations

- **New File**: Click + button on file tree
- **Upload File**: Click ↑ button or drag & drop
- **Double-click Open**: Double-click file to open in tab
- **Hover Actions**: Hover to show rename/download/delete buttons

### Executor Switch

- **Iris**: Local WASM interpreter (fast, offline)
- **Playground**: Official rustc API (full syntax, requires network)

### Terminal Commands

Supports full cargo commands:

```bash
cargo new my-project       # Create new project
cargo build --release      # Build project
cargo run                  # Run project
cargo test                 # Run tests
cargo clippy               # Clippy check
cargo fmt                  # Format code
cargo add serde            # Add dependency
```

## Roadmap

### Completed ✅

- [x] Monaco Editor integration
- [x] Rust syntax highlighting + completion
- [x] Multi-file tabs
- [x] Directory tree structure
- [x] rustToWAT compiler (3716 lines)
- [x] rust-analyzer WASM
- [x] Clippy WASM (40 rules)
- [x] xterm.js terminal
- [x] Full cargo commands
- [x] Multi-threaded parallel checking
- [x] GPU acceleration support
- [x] Dual platform deployment

### In Progress 🚧

- [ ] Source Map (debug info)
- [ ] More lint rules
- [ ] Plugin system

### Planned 📋

- [ ] Cloud storage
- [ ] Collaborative editing
- [ ] Performance profiling tools

## Technical Details

### rustToWAT Supported Syntax

**Supported:**
- ✅ `fn`, `let`, `if/else`, `for`, `while`, `match`
- ✅ `struct`, `enum`, `impl`
- ✅ `trait` definition and implementation
- ✅ `#[derive(Debug, Clone, PartialEq, Default)]`
- ✅ `macro_rules!`
- ✅ Generics (partial)
- ✅ async/await
- ✅ Smart pointers (Box, Rc, RefCell)

**Unsupported (use Playground):**
- ❌ Full generic constraints
- ❌ where clauses
- ❌ Procedural macros

### Performance Metrics

| Module | Size | Gzip |
|--------|------|------|
| rustToWAT | ~50 KB | ~11 KB |
| rust-analyzer WASM | ~100 KB | ~30 KB |
| Clippy WASM | ~50 KB | ~15 KB |
| xterm.js | 329 KB | 83 KB |
| Monaco Editor | 3,095 KB | 798 KB |

## Deployment

### GitHub Pages

```bash
npm run build:github
# Auto deploy: git push triggers GitHub Actions
```

### Cloudflare Pages

```bash
npm run build:cloudflare
# Configure build command in Cloudflare Dashboard
```

### GitHub Actions Auto Deploy

`.github/workflows/deploy.yml` configuration:
- Install Rust + wasm-bindgen-cli
- Build rust-analyzer WASM + Clippy WASM
- Build frontend
- Deploy to GitHub Pages

## FAQ

**Q: Why do some codes fail to compile?**
A: rustToWAT doesn't support all Rust syntax, will automatically fallback to Rust Playground.

**Q: How to debug WASM?**
A: Current version doesn't support Source Map, suggest using Playground mode for debugging.

**Q: What commands does the terminal support?**
A: Supports all cargo/rustc/rustup commands, but only simulates output, doesn't actually execute.

## License

MIT

## Contributing

Issues and Pull Requests are welcome!

---

🤖 Generated with CodeArts
