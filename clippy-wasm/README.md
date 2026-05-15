# Clippy WASM 项目

## 架构说明

本项目通过 **mock rustc 接口**的方式，将 Clippy 编译到 WebAssembly。

### 为什么这样做？

1. **Clippy 依赖 rustc 内部 API**：无法直接编译到 WASM
2. **Mock rustc 接口**：只复刻公开的类型、结构体、枚举、trait、函数签名
3. **空实现**：内部全部 `unimplemented!()`
4. **劫持依赖**：通过 `[patch.crates-io]` 替换真实 rustc 为 mock 版本

### 目录结构

```
mock_rustc/
├── rustc_span/         # 源码位置、符号
├── rustc_errors/       # 错误报告
├── rustc_session/      # 编译会话
├── rustc_hir/          # 高级 IR
├── rustc_middle/       # 中间表示
├── rustc_mir/          # 中级 IR
├── rustc_ty/           # 类型系统扩展
├── rustc_lint/         # Lint 框架
├── rustc_infer/        # 类型推断
└── rustc_trait_selection/  # Trait 选择

clippy-wasm/            # Clippy WASM 包装
├── Cargo.toml          # 配置 patch
└── src/lib.rs          # 实现 lint 规则
```

### 已实现的 Lint 规则

| Lint 名称 | 说明 |
|-----------|------|
| `clone_on_copy` | 在 Copy 类型上调用 `.clone()` |
| `map_identity` | `.map(\|x\| x)` 冗余 |
| `single_match` | 单分支 match 可用 if let 替代 |
| `needless_bool` | `if true/false` 冗余 |
| `eq_op` | `x == x` 恒为真 |
| `double_neg` | `!!x` 可简化为 `x` |
| `absurd_comparison` | `.len() < 0` 恒为假 |
| `unused_unit` | 不必要的 `()` |
| `redundant_pattern` | 冗余模式匹配 |
| `unused_self` | 未使用 `self` 的方法 |

### 构建方法

```bash
# 方法 1: 使用脚本
./build-clippy.sh

# 方法 2: 手动构建
cd clippy-wasm
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/clippy_wasm.wasm \
  --out-dir ../public/clippy --target web
```

### 使用方法

```typescript
import init, { ClippyChecker } from './public/clippy/clippy_wasm.js';

await init();
const checker = new ClippyChecker();
const warnings = checker.check(rustCode);

console.log(warnings);
// [
//   { name: "clone_on_copy", message: "...", line: 10, severity: "warn" },
//   ...
// ]
```

### Cargo.toml Patch 示例

```toml
[patch.crates-io]
rustc_span = { path = "./mock_rustc/rustc_span" }
rustc_errors = { path = "./mock_rustc/rustc_errors" }
rustc_session = { path = "./mock_rustc/rustc_session" }
rustc_hir = { path = "./mock_rustc/rustc_hir" }
rustc_middle = { path = "./mock_rustc/rustc_middle" }
rustc_mir = { path = "./mock_rustc/rustc_mir" }
rustc_ty = { path = "./mock_rustc/rustc_ty" }
rustc_lint = { path = "./mock_rustc/rustc_lint" }
rustc_infer = { path = "./mock_rustc/rustc_infer" }
rustc_trait_selection = { path = "./mock_rustc/rustc_trait_selection" }
```

### 限制

- ❌ 无法使用需要真实类型信息的 lint
- ❌ 无法进行真实的语义分析
- ✓ 可实现基于语法模式的 lint
- ✓ 可实现简单的启发式 lint

### 扩展方法

要添加新的 lint 规则：

1. 在 `clippy-wasm/src/lib.rs` 中添加检测函数
2. 在 `run_clippy_lints()` 中调用
3. 触发条件时 push `LintWarning`

示例：

```rust
fn check_my_lint(&mut self, code: &str) {
    for (i, line) in code.lines().enumerate() {
        if line.contains("bad_pattern") {
            self.warnings.push(LintWarning {
                name: "my_lint".to_string(),
                message: "found bad pattern".to_string(),
                line: i + 1,
                column: 0,
                severity: "warn".to_string(),
            });
        }
    }
}
```
