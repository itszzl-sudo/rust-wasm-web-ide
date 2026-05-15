# rust-analyzer WASM 项目

## 架构说明

本项目通过 **mock rust-analyzer 接口**的方式，实现轻量级类型检查 WASM。

### 为什么这样做？

1. **官方 rust-analyzer 依赖复杂**：编译到 WASM 困难
2. **Mock ra_* 接口**：只复刻核心功能
3. **实现关键分析**：诊断、补全、悬停提示
4. **轻量级**：~100KB WASM（vs 官方 ~4MB）

### 目录结构

```
mock_rust_analyzer/
├── ra_syntax/       # 语法树（~250 行）
├── ra_hir/          # 高级 IR（~80 行）
├── ra_ide/          # IDE 功能（~300 行）
└── ra_db/           # 数据库（~60 行）

rust-analyzer-wasm/  # WASM 包装
├── Cargo.toml
└── src/lib.rs       # WASM 接口（~200 行）
```

### 已实现功能

| 功能 | 说明 |
|------|------|
| 语法解析 | 简化的 AST 生成 |
| 诊断检查 | unimplemented!()、unwrap()、未闭合括号 |
| 代码补全 | 关键字、类型、方法补全 |
| 悬停提示 | 关键字和类型说明 |
| Go to Def | 桩实现（返回 null） |
| Find Refs | 桩实现（返回空数组） |

### 构建方法

```bash
# 方法 1: 使用脚本
./build-rust-analyzer.sh

# 方法 2: 手动构建
cd rust-analyzer-wasm
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/rust_analyzer_wasm.wasm \
  --out-dir ../public/type-checker --target web
```

### 使用方法

```typescript
import init, { RustAnalyzer } from './public/type-checker/rust_analyzer_wasm.js';

await init();

const analyzer = new RustAnalyzer();

// 类型检查
const diagnostics = analyzer.check(rustCode);
// [
//   { message: "calling `.unwrap()` may panic", severity: "warning", line: 10, ... },
//   ...
// ]

// 代码补全
const completions = analyzer.complete(rustCode, 10, 15);
// [
//   { label: "len()", kind: "function", detail: "fn len(&self) -> usize" },
//   ...
// ]

// 悬停提示
const hover = analyzer.hover(rustCode, 5, 10);
// { contents: "```rust\nfn\n```\n\nKeyword: function definition", ... }
```

### 诊断规则

| 规则 | 检测内容 | 严重度 |
|------|----------|--------|
| unimplemented!() | 运行时 panic | warning |
| .unwrap() | 可能 panic | warning |
| 未闭合括号 | 语法错误 | error |

### 补全触发

- **普通位置**：关键字 + 类型
  - fn, let, mut, if, else, match, while, for, loop, return, struct, enum, impl, trait, mod, use, pub, async, await
  - i32, i64, u32, u64, f32, f64, bool, char, str, String, Vec, Option, Result, Box, Rc

- **`.` 之后**：方法补全
  - len(), clone(), iter()

### 悬停提示

| 内容 | 示例 |
|------|------|
| 关键字 | `fn` → "Keyword: function definition" |
| 类型 | `i32` → "32-bit signed integer" |
| 高级类型 | `Vec` → "growable heap-allocated list" |

### 限制

- ❌ 无完整类型推断
- ❌ 无借用检查
- ❌ 无真实语义分析
- ✓ 快速语法检查
- ✓ 基础 IDE 功能

### 与官方 rust-analyzer 对比

| 维度 | 官方 | 本实现 |
|------|------|--------|
| 体积 | ~4MB | ~100KB |
| 类型推断 | 完整 | 无 |
| 借用检查 | 完整 | 无 |
| 语义分析 | 完整 | 简化 |
| 补全质量 | 高 | 基础 |
| 加载时间 | ~2s | ~0.1s |

### 扩展方法

要添加新的诊断规则：

```rust
// 在 ra_ide/src/lib.rs 的 collect_diagnostics 中添加
if line.contains("bad_pattern") {
    diagnostics.push(Diagnostic {
        message: "found bad pattern".to_string(),
        severity: Severity::Warning,
        range: (i as u32 * 100, i as u32 * 100 + line.len() as u32),
    });
}
```

要添加新的补全项：

```rust
// 在 collect_completions 中添加
items.push(CompletionItem {
    label: "new_method()".to_string(),
    kind: CompletionKind::Function,
    detail: Some("fn new_method(&self)".to_string()),
});
```
