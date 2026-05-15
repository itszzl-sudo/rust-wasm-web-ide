# WASM 版本 vs Native Rust 编译器对比

**对比日期**：2026年5月15日

---

## 一、整体对比

| 维度 | Native Rust (rustc) | WASM 版本 | 差距 |
|------|---------------------|-----------|------|
| 代码量 | ~200 万行 | 3549 行 | 560x |
| 编译目标 | LLVM IR → 机器码 | WAT → WASM | 不同 |
| 类型检查 | 完整 borrow checker | 无 | ⚠️ 关键缺失 |
| 标准库 | 完整 std | 极简子集 | ⚠️ 重大限制 |
| 性能 | 原生速度 | ~2-10x 慢 | ⚠️ 可接受 |
| 工具链 | cargo, rustup, clippy | 无 | ⚠️ 缺失 |

---

## 二、类型系统差距

### Native Rust 完整支持

```rust
// 所有权系统
let s1 = String::from("hello");
let s2 = s1;  // s1 移动，编译器检查
// println!("{}", s1);  // 编译错误！

// 生命周期
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// 借用检查
let mut v = vec![1, 2, 3];
let r = &v[0];
v.push(4);  // 编译错误！不能同时有可变和不可变引用
```

### WASM 版本限制

```rust
// ❌ 无所有权检查 - 运行时可能出错
let s1 = String::from("hello");
let s2 = s1;  // 只是拷贝，不会报错
println!("{}", s1);  // 运行时可能访问无效内存

// ❌ 无生命周期检查
fn longest(x: &str, y: &str) -> &str {
    // 无法验证返回引用的生命周期
}

// ❌ 无借用检查
let mut v = vec![1, 2, 3];
let r = &v[0];
v.push(4);  // 允许，但可能造成 use-after-free
```

**缺失的关键特性**：
- ❌ 所有权系统 (ownership)
- ❌ 借用检查器 (borrow checker)
- ❌ 生命周期标注 ('a, 'static)
- ❌ 借用规则编译时检查
- ❌ 移动语义检查
- ❌ Copy/Clone trait 自动推导

---

## 三、标准库差距

### Native Rust 标准库 (~30 万行)

```
std::collections
├── Vec<T>          ✓ 完整
├── HashMap<K,V>    ✓ 完整
├── HashSet<T>      ✓ 完整
├── BTreeMap<K,V>   ✓ 完整
└── LinkedList<T>   ✓ 完整

std::io
├── File            ✓ 完整
├── BufReader       ✓ 完整
├── BufWriter       ✓ 完整
└── stdin/stdout    ✓ 完整

std::net
├── TcpStream       ✓ 完整
├── UdpSocket       ✓ 完整
└── IpAddr          ✓ 完整

std::thread
├── spawn           ✓ 完整
├── JoinHandle      ✓ 完整
└── Mutex<T>        ✓ 完整

std::fs
├── read            ✓ 完整
├── write           ✓ 完整
└── PathBuf         ✓ 完整
```

### WASM 版本标准库 (~500 行)

```
已实现：
├── Vec<T>          ✓ 基础实现（push, pop, len）
├── String          ✓ 基础方法（push, len, trim, split）
├── Box<T>          ✓ 堆分配
├── Rc<T>           ✓ 引用计数
├── RefCell<T>      ✓ 内部可变性
├── Option<T>       ✓ Some/None
├── Result<T,E>     ✓ Ok/Err
└── Iterator        ✓ 部分（map, filter, fold）

未实现：
├── HashMap/HashSet  ❌ 哈希表
├── File/IO          ❌ 文件系统
├── Network          ❌ 网络编程
├── Threads          ❌ 多线程
├── Channels         ❌ 消息传递
├── Arc<Mutex<T>>    ❌ 线程安全
├── Cow<T>           ❌ 写时克隆
├── Cell<T>          ❌ 内部可变性
└── 95%+ 标准库      ❌ 未实现
```

---

## 四、语法支持对比

### 完整支持 ✓

| 语法 | 示例 | 状态 |
|------|------|------|
| 函数定义 | `fn foo() {}` | ✓ |
| 结构体 | `struct Point { x: i32 }` | ✓ |
| 枚举 | `enum Option<T> { Some(T), None }` | ✓ |
| 泛型 | `fn id<T>(x: T) -> T` | ✓ |
| Trait | `trait Draw { fn draw(&self); }` | ✓ |
| impl | `impl Point { fn new() {} }` | ✓ |
| 模式匹配 | `match x { 0 => ..., _ => ... }` | ✓ |
| 闭包 | `\|x\| x + 1` | ✓ |
| 迭代器 | `.iter().map().filter()` | ✓ |
| 宏调用 | `vec![1, 2, 3]` | ✓ |
| 运算符重载 | `impl Add for Point` | ✓ |
| 智能指针 | `Box::new(x)` | ✓ |

### 部分支持 ⚠️

| 语法 | 限制 |
|------|------|
| 生命周期 | 无编译时检查，仅语法支持 |
| 泛型约束 | 仅基础支持，无 where clause |
| Trait 对象 | 简化版 vtable，无完整 dyn dispatch |
| 宏定义 | 简单模式匹配，无完整 macro_rules! |
| 属性 | 仅 #[derive]，无 #[cfg]、#[test] |

### 不支持 ❌

| 语法 | 原因 |
|------|------|
| async/await | 无 async runtime |
| const 泛型 | `Array<T, N>` 不支持 |
| 高级 trait bound | `T: Trait<Assoc = U>` 不完整 |
| 过程宏 | `#[proc_macro]` 不支持 |
| unsafe 块 | 无内存安全边界 |
| 原始指针 | `*const T`, `*mut T` 不支持 |
| FFI | 无外部函数接口 |
| SIMD | 无向量指令 |
| 原子操作 | `AtomicU32` 不支持 |

---

## 五、编译器架构对比

### Native Rust 编译流程

```
源代码 (.rs)
    ↓
词法分析 (lexer)
    ↓
语法解析 (parser) → AST
    ↓
名称解析 (name resolution)
    ↓
类型检查 (type checking)
    ├── 所有权检查
    ├── 借用检查
    └── 生命周期推断
    ↓
中间表示 (MIR)
    ↓
优化 (LLVM)
    ↓
代码生成 (machine code)
    ↓
链接 (linker)
    ↓
可执行文件
```

### WASM 版本编译流程

```
源代码 (.rs)
    ↓
简化的词法分析
    ↓
简化的语法解析 → AST (无完整 AST)
    ↓
直接生成 WAT
    ├── 无名称解析
    ├── 无类型检查
    ├── 无所有权检查
    └── 无借用检查
    ↓
WAT → WASM
    ↓
浏览器执行
```

**关键缺失**：
- ❌ 完整的 AST 表示
- ❌ 类型推断引擎
- ❌ 所有权系统
- ❌ 借用检查器
- ❌ 中间表示 (MIR)
- ❌ 优化 pass
- ❌ 错误诊断系统

---

## 六、运行时对比

### Native Rust 运行时

```
内存管理：
├── 栈分配          ✓ 自动
├── 堆分配          ✓ jemalloc/mimalloc
├── 内存布局优化    ✓ 对齐、padding
└── 零成本抽象      ✓ 编译时展开

线程模型：
├── 1:1 线程映射    ✓ OS 线程
├── work stealing   ✓ rayon 并行库
└── async runtime   ✓ tokio, async-std

panic 处理：
├── 栈展开          ✓ 完整
├── panic hook      ✓ 可自定义
└── catch_unwind    ✓ 异常捕获
```

### WASM 版本运行时

```
内存管理：
├── 栈分配          ✓ WASM 线性内存
├── 堆分配          ⚠️ 简单 bump allocator
├── 内存布局        ⚠️ 固定 4 字节对齐
└── 零成本抽象      ⚠️ 部分实现

线程模型：
├── 单线程          ✓ 仅主线程
├── Web Workers     ❌ 未使用
└── async runtime   ❌ 无

panic 处理：
├── 栈展开          ❌ 无
├── panic hook      ⚠️ 简单 console.error
└── catch_unwind    ❌ 无
```

---

## 七、性能对比

### 基准测试示例

| 操作 | Native Rust | WASM 版本 | 比率 |
|------|-------------|-----------|------|
| 整数加法 | 1 ns | ~10 ns | 10x |
| 字符串拼接 | 50 ns | ~500 ns | 10x |
| Vec push | 5 ns | ~50 ns | 10x |
| 函数调用 | 2 ns | ~20 ns | 10x |
| HashMap 插入 | 30 ns | ❌ 不支持 | - |
| 多线程计算 | 100 ms (4核) | ❌ 单线程 | - |

**性能瓶颈**：
1. 无 JIT 优化（WASM 解释执行）
2. 简单内存分配器（无池化）
3. 无内联优化
4. 无循环展开
5. 无 SIMD 向量化

---

## 八、开发体验对比

### Native Rust 工具链

```bash
# 完整工具链
rustc          # 编译器
cargo          # 包管理器
rustup         # 版本管理
rust-analyzer  # LSP
clippy         # linter
rustfmt        # 格式化
miri           # UB 检测
cargo test     # 测试框架
cargo doc      # 文档生成
```

### WASM 版本工具

```bash
# 极简工具
rustToWAT.ts   # 编译器
Monaco Editor  # 编辑器
浏览器控制台   # 调试

# 缺失工具
❌ cargo        # 无包管理
❌ rust-analyzer # 无类型提示
❌ clippy       # 无 lint
❌ rustfmt      # 无格式化
❌ test runner  # 无测试框架
❌ debugger     # 无调试器
```

---

## 九、错误处理对比

### Native Rust 编译错误

```
error[E0382]: use of moved value: `s1`
 --> src/main.rs:4:20
  |
2 |     let s1 = String::from("hello");
  |         -- move occurs because `s1` has type `String`
3 |     let s2 = s1;
  |             -- value moved here
4 |     println!("{}", s1);
  |                    ^^ value used here after move
  |
  = note: consider cloning the value
```

### WASM 版本错误

```
// 运行时错误，无编译时检查
RuntimeError: memory access out of bounds
  at wasm://wasmode...
  at ...
```

**差距**：
- ❌ 无编译时错误检查
- ❌ 无详细的错误诊断
- ❌ 无错误恢复建议
- ❌ 无源码位置映射

---

## 十、安全性对比

| 安全特性 | Native Rust | WASM 版本 |
|----------|-------------|-----------|
| 内存安全 | ✓ 编译时保证 | ❌ 无检查 |
| 线程安全 | ✓ Send/Sync trait | ❌ 单线程 |
| 类型安全 | ✓ 完整类型系统 | ⚠️ 运行时检查 |
| 空指针安全 | ✓ Option<T> | ⚠️ 可能 null |
| 数据竞争 | ✓ 编译时禁止 | ❌ 无检查 |
| 缓冲区溢出 | ✓ 编译时检查 | ❌ 运行时可能 |
| Use-after-free | ✓ 编译时检查 | ❌ 运行时可能 |

---

## 十一、总结

### 核心差距

1. **类型系统**：缺少所有权、借用检查、生命周期 - 这是 Rust 的核心价值
2. **标准库**：仅 ~2% 覆盖率，缺少关键数据结构和 IO
3. **工具链**：无 cargo、rust-analyzer、clippy 等开发工具
4. **性能**：~10x 性能损失，无优化
5. **安全性**：无编译时安全保证，退化到运行时检查

### 适用场景

**WASM 版本适合**：
- 学习 Rust 语法基础
- 快速原型验证
- 教学演示
- 简单算法实现

**不适合**：
- 生产环境开发
- 系统级编程
- 高性能计算
- 并发/网络编程
- 需要类型安全保证的项目

### 改进路径

如果要缩小差距，优先级：

1. **P0 - 类型检查**：实现基础的所有权和借用检查
2. **P0 - 错误诊断**：友好的编译错误信息
3. **P1 - 标准库**：HashMap、IO、网络
4. **P1 - 工具链**：集成 rust-analyzer
5. **P2 - 性能**：优化内存分配、内联
6. **P2 - async**：async/await 支持

---

**结论**：WASM 版本是一个"简化版的 Rust 语法编译器"，而非真正的 Rust 编译器。它适合学习和实验，但无法替代 native Rust 的核心价值（编译时内存安全保证）。
