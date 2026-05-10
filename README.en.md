# Rust Web IDE

English | [简体中文](README.md)

Browser-based Rust code editing and interpretation environment. Zero installation, zero compilation, instant execution.

**[Live Demo](https://itszzl-sudo.github.io/rust-wasm-web-ide/)**

## Features

- **In-browser interpretation**: Execute Rust source code directly in the browser without compilation
- **Monaco Editor**: VS Code-level editing experience with Rust syntax highlighting and auto-completion
- **Single project, single crate**: Simplified project management focused on a single Rust crate
- **GPU execution optimization**: (Planned) WebGPU acceleration for code execution
- **Multi-threaded code analysis**: (Planned) Parallel code analysis via multiple domains
- **localStorage storage**: Files automatically saved to browser local storage

## Tech Stack

- **Frontend Framework**: Vue 3 + TypeScript
- **Editor**: Monaco Editor
- **Rust Interpreter**: Custom Rust interpreter (compiled to Wasm)
- **Build Tool**: Vite

## Project Structure

```
rust-wasm-web-ide/
├── src/                        # Frontend source code
│   ├── components/            # Vue components
│   │   ├── Editor/           # Monaco editor wrapper
│   │   ├── Panel/            # Panels, file explorer, log panel
│   │   └── Layout/           # Main layout
│   ├── utils/                # Utility functions
│   │   ├── fileManager.ts    # File management (localStorage)
│   │   ├── projectManager.ts # Project management
│   │   └── rustInterpreter.ts # Rust interpreter interface
│   ├── i18n/                 # Internationalization
│   ├── App.vue               # Root component
│   └── main.ts               # Entry file
├── rust-interpreter/         # Rust interpreter source code
│   ├── src/
│   │   └── lib.rs           # Interpreter implementation
│   └── Cargo.toml           # Rust project configuration
├── .codeartsdoer/           # Specification and design documents
│   └── specs/
│       └── rust-wasm-web-ide/
│           ├── spec.md      # Requirements specification
│           └── design.md    # Technical design
└── package.json             # Node.js project configuration
```

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+ (for compiling the Rust interpreter)
- wasm-pack (Rust Wasm packaging tool)

### Install Dependencies

```bash
npm install
```

### Compile Rust Interpreter

```bash
cd rust-interpreter
wasm-pack build --target web --out-dir ../public/rust-interpreter/pkg
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

1. **Edit code**: Enter Rust code in the left editor
2. **Run code**: Click the "Run" button to interpret and execute in the browser
3. **Save file**: Click the "Save" button to save to localStorage
4. **New file**: Click the "New" button to create a new Rust file
5. **Format code**: Click the "Format" button to organize code style

## Supported Rust Features

### Currently Supported

- Variable declarations (`let`, `let mut`)
- Basic types (`i32`, `f64`, `bool`, `String`)
- Arithmetic operators (`+`, `-`, `*`, `/`, `%`)
- Comparison operators (`==`, `!=`, `<`, `<=`, `>`, `>=`)
- Logical operators (`&&`, `||`, `!`)
- Control flow (`if`/`else`, `while`, `for`)
- Function definitions (`fn`)
- Structs (`struct`)
- Enums (`enum`)
- Pattern matching (`match`)
- impl blocks
- `println!` macro

### Planned Support

- Closures
- Iterators
- More macros

## Future Features

- **Release compilation**: Compile Rust source code to Wasm binary artifacts
- **GPU execution optimization**: WebGPU acceleration for numerical computations
- **Multi-threaded code analysis**: Parallel syntax analysis and type checking via multiple domains
- **Code debugging**: Breakpoints, step execution, variable inspection

## Architecture

This project uses a hybrid approach:

- **Immediate execution**: syn-based interpreter (69KB Wasm) - instant startup, ~60% feature coverage
- **Optional type checking**: rust-analyzer (4MB lazy-loaded) - complete type inference

## Documentation

- [Requirements Specification](.codeartsdoer/specs/rust-wasm-web-ide/spec.md)
- [Technical Design](.codeartsdoer/specs/rust-wasm-web-ide/design.md)

## License

MIT
