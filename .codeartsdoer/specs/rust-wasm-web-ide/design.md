# **1. 实现模型**

## **1.1 上下文视图**

本项目是一个纯浏览器端运行的 Rust Web IDE，无需后端服务。核心架构如下：

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器环境                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Rust Web IDE（主应用）                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │ UI 交互层   │  │ 核心逻辑层  │  │ 底层能力层   │  │  │
│  │  │             │  │             │  │              │  │  │
│  │  │ - 编辑器    │  │ - 解释器    │  │ - WebGPU     │  │  │
│  │  │ - 操作面板  │  │ - 文件管理  │  │ - localStorage│  │  │
│  │  │ - 日志展示  │  │ - 代码分析  │  │ - Service     │  │  │
│  │  │             │  │             │  │   Worker     │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Rust 解释器  │  │ Rust 语法    │  │ Monaco       │      │
│  │ (Wasm 模块)  │  │ 分析器       │  │ Editor       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## **1.2 服务/组件总体架构**

### **1.2.1 技术栈选型**

- **前端框架**：Vue 3 + TypeScript（单文件组件 SFC）
- **代码编辑器**：Monaco Editor（VS Code 核心）
- **Rust 解释器**：miri 或自定义 Rust 解释器（编译为 Wasm）
- **语法分析**：rust-analyzer（部分功能，编译为 Wasm）或 syn 库
- **样式**：CSS3 + CSS Grid Layout
- **构建工具**：Vite
- **国际化**：vue-i18n（中文为主）

### **1.2.2 组件划分**

```
src/
├── components/                 # Vue 组件
│   ├── Editor/                # 编辑器组件
│   │   ├── MonacoEditor.vue   # Monaco 编辑器封装
│   │   ├── RustLanguage.ts    # Rust 语言支持配置
│   │   └── SyntaxHighlight.ts # 语法高亮规则
│   ├── Panel/                 # 操作面板组件
│   │   ├── Toolbar.vue        # 工具栏（运行、保存、格式化）
│   │   ├── FileExplorer.vue   # 文件浏览器
│   │   └── LogPanel.vue       # 日志展示面板
│   └── Layout/                # 布局组件
│       ├── MainLayout.vue     # 主布局
│       └── SplitPane.vue      # 分割面板
├── core/                      # 核心逻辑（Rust 编译为 Wasm）
│   ├── interpreter/           # Rust 解释器
│   │   ├── mod.rs             # 解释器入口
│   │   ├── parser.rs          # 语法解析
│   │   ├── evaluator.rs       # 解释执行
│   │   └── env.rs             # 执行环境
│   ├── analyzer/              # 代码分析器
│   │   ├── mod.rs             # 分析器入口
│   │   ├── syntax.rs          # 语法校验
│   │   ├── type_check.rs      # 类型检查
│   │   └── completion.rs      # 自动补全
│   ├── file_manager/          # 文件管理
│   │   ├── mod.rs             # 文件管理入口
│   │   ├── storage.rs         # localStorage 封装
│   │   └── project.rs         # 项目管理
│   └── gpu/                   # GPU 执行优化
│       ├── mod.rs             # GPU 模块入口
│       ├── webgpu.rs          # WebGPU 封装
│       └── parallel.rs        # 并行任务调度
├── workers/                   # 多线程 Worker
│   ├── analyzer.worker.ts     # 代码分析 Worker
│   └── thread.manager.ts      # 线程管理器
├── utils/                     # 工具函数
│   ├── logger.ts              # 日志工具
│   └── config.ts              # 配置管理
├── i18n/                      # 国际化
│   ├── zh-CN.ts               # 中文
│   └── en-US.ts               # 英文
├── App.vue                    # 根组件
└── main.ts                    # 入口文件
```

## **1.3 实现设计文档**

### **1.3.1 Rust 解释器设计**

#### **解释器架构**

```
Rust 源码 → 词法分析 → 语法解析 → AST → 语义分析 → 解释执行 → 输出
```

#### **核心模块**

1. **Lexer（词法分析器）**
   - 输入：Rust 源码字符串
   - 输出：Token 流
   - 实现：基于 Rust 的 logoxide 库或自定义实现

2. **Parser（语法解析器）**
   - 输入：Token 流
   - 输出：AST（抽象语法树）
   - 实现：基于 syn 库或自定义递归下降解析器

3. **Evaluator（解释器）**
   - 输入：AST
   - 输出：执行结果
   - 实现：树遍历解释器（Tree-walking Interpreter）
   - 支持：
     - 基本类型（i32、f64、bool、String、Vec 等）
     - 控制流（if、loop、while、for）
     - 函数调用
     - 结构体和枚举
     - 宏（部分支持，如 println!）

4. **Environment（执行环境）**
   - 变量存储
   - 函数注册
   - 作用域管理

#### **与 JavaScript 交互**

```rust
#[wasm_bindgen]
pub struct RustInterpreter {
    env: Environment,
}

#[wasm_bindgen]
impl RustInterpreter {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self;

    pub fn execute(&mut self, code: &str) -> InterpretResult;

    pub fn reset(&mut self);
}

#[wasm_bindgen]
pub struct InterpretResult {
    pub output: String,
    pub error: Option<String>,
    pub execution_time: f64,
}
```

### **1.3.2 GPU 执行优化设计**

#### **WebGPU 集成**

```rust
pub struct GPUExecutor {
    device: Option<web_sys::GpuDevice>,
    queue: Option<web_sys::GpuQueue>,
}

impl GPUExecutor {
    pub fn is_available() -> bool;

    pub async fn initialize() -> Result<Self, GpuError>;

    pub fn execute_parallel_computation(
        &self,
        data: &[f64],
        operation: ComputeOperation,
    ) -> Result<Vec<f64>, GpuError>;
}

pub enum ComputeOperation {
    VectorAdd,
    VectorMul,
    MatrixMul,
    Custom(String), // WGSL shader code
}
```

#### **适用场景**

- 大量数值计算（如数组操作、矩阵运算）
- 可并行的循环体
- 数值算法（如排序、搜索）

#### **降级策略**

```
1. 检测 WebGPU 支持 → 不支持则纯 CPU 执行
2. 初始化 GPU 设备 → 失败则降级
3. 执行 GPU 计算 → 超时或失败则降级
```

### **1.3.3 多域名多 JS 线程设计**

#### **架构**

```
主线程 (ide.example.com)
    ├─ Worker 1 (thread1.ide.example.com)
    ├─ Worker 2 (thread2.ide.example.com)
    ├─ Worker 3 (thread3.ide.example.com)
    └─ Worker 4 (thread4.ide.example.com)
```

#### **线程管理器**

```typescript
class ThreadManager {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];

  async initialize(threadCount: number): Promise<void>;

  async distributeTask(task: AnalysisTask): Promise<AnalysisResult>;

  private handleMessage(workerId: number, message: WorkerMessage): void;

  terminate(): void;
}

interface AnalysisTask {
  type: 'syntax' | 'typeCheck' | 'completion';
  code: string;
  position?: Position;
}

interface AnalysisResult {
  errors: Diagnostic[];
  completions?: CompletionItem[];
}
```

#### **Service Worker 配置**

```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  // 处理跨域资源加载
  // 支持多域名下的资源请求
});
```

### **1.3.4 代码编辑器集成**

#### **Monaco Editor 配置**

```typescript
import * as monaco from 'monaco-editor';

// 注册 Rust 语言
monaco.languages.register({ id: 'rust' });

// 设置语法高亮
monaco.languages.setMonarchTokensProvider('rust', rustLanguage);

// 设置自动补全
monaco.languages.registerCompletionItemProvider('rust', {
  provideCompletionItems: (model, position) => {
    // 调用 Rust 分析器（Wasm）获取补全项
    return rustAnalyzer.getCompletions(model.getValue(), position);
  }
});

// 设置诊断信息
monaco.editor.onDidChangeModelContent(() => {
  // 调用 Rust 分析器（Wasm）进行语法校验
  const diagnostics = rustAnalyzer.checkSyntax(code);
  monaco.editor.setModelMarkers(model, 'rust', diagnostics);
});
```

#### **Rust 语言支持**

- 关键字高亮
- 字符串、注释、宏高亮
- 括号匹配
- 代码折叠
- 错误标记

### **1.3.5 项目管理设计**

#### **单项目单 crate 约束**

```typescript
class ProjectManager {
  private project: Project;

  constructor() {
    this.project = this.loadOrCreateProject();
  }

  private loadOrCreateProject(): Project {
    const stored = localStorage.getItem('project');
    if (stored) {
      return JSON.parse(stored);
    }
    return this.createDefaultProject();
  }

  private createDefaultProject(): Project {
    return {
      name: 'my-project',
      crateType: 'bin', // 或 'lib'
      files: {
        'Cargo.toml': this.generateCargoToml(),
        'src/main.rs': this.generateMainRs(),
      },
    };
  }

  private generateCargoToml(): string {
    return `[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
`;
  }
}
```

# **2. 接口设计**

## **2.1 总体设计**

所有核心功能通过 Wasm 模块暴露给 JavaScript，遵循 `#[wasm_bindgen]` 接口规范。

## **2.2 接口清单**

### **2.2.1 Rust 解释器接口**

```rust
#[wasm_bindgen]
pub fn interpret_rust_code(code: &str, config: InterpretConfig) -> InterpretResult;

#[wasm_bindgen]
pub fn reset_interpreter() -> void;

#[wasm_bindgen]
pub fn set_execution_timeout(timeout_ms: u32) -> void;
```

### **2.2.2 代码分析接口**

```rust
#[wasm_bindgen]
pub fn check_syntax(code: &str) -> Vec<Diagnostic>;

#[wasm_bindgen]
pub fn get_completions(code: &str, position: Position) -> Vec<CompletionItem>;

#[wasm_bindgen]
pub fn format_code(code: &str) -> Result<String, FormatError>;
```

### **2.2.3 文件管理接口**

```rust
#[wasm_bindgen]
pub fn save_file(path: &str, content: &str) -> Result<(), StorageError>;

#[wasm_bindgen]
pub fn load_file(path: &str) -> Result<String, StorageError>;

#[wasm_bindgen]
pub fn list_files() -> Vec<String>;

#[wasm_bindgen]
pub fn delete_file(path: &str) -> Result<(), StorageError>;
```

### **2.2.4 GPU 接口**

```rust
#[wasm_bindgen]
pub fn is_gpu_available() -> bool;

#[wasm_bindgen]
pub async fn initialize_gpu() -> Result<(), GpuError>;

#[wasm_bindgen]
pub fn execute_gpu_computation(data: &[f64], operation: &str) -> Result<Vec<f64>, GpuError>;
```

### **2.2.5 项目管理接口**

```rust
#[wasm_bindgen]
pub fn get_project() -> Project;

#[wasm_bindgen]
pub fn update_cargo_toml(content: &str) -> Result<(), ConfigError>;

#[wasm_bindgen]
pub fn export_project() -> Vec<u8>; // 返回 zip 文件
```

# **3. 数据模型**

## **3.1 设计目标**

- 轻量级存储（localStorage 限制约 5-10MB）
- 快速序列化/反序列化
- 支持增量更新

## **3.2 模型实现**

### **3.2.1 项目模型**

```typescript
interface Project {
  name: string;
  crateType: 'bin' | 'lib';
  files: Record<string, string>; // path -> content
  createdAt: number;
  updatedAt: number;
}
```

### **3.2.2 解释结果模型**

```typescript
interface InterpretResult {
  output: string;
  error: {
    message: string;
    line: number;
    column: number;
  } | null;
  executionTime: number; // ms
  memoryUsed: number; // bytes
}
```

### **3.2.3 诊断模型**

```typescript
interface Diagnostic {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}
```

### **3.2.4 配置模型**

```typescript
interface IDEConfig {
  theme: 'light' | 'dark';
  fontSize: number;
  autoSave: boolean;
  autoSaveInterval: number;
  enableGPU: boolean;
  threadCount: number;
  executionTimeout: number;
  memoryLimit: number;
}
```

### **3.2.5 日志模型**

```typescript
interface LogEntry {
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  source: 'interpreter' | 'analyzer' | 'gpu' | 'system';
  message: string;
}
```

# **4. 实现路线**

## **4.1 阶段划分**

### **阶段 1：基础框架（优先级 P0）**
- 项目初始化（Vue 3 + Vite + TypeScript）
- Monaco Editor 集成和 Rust 语言配置
- 基础 UI 布局（编辑器、工具栏、日志面板）
- localStorage 文件管理

### **阶段 2：Rust 解释器（优先级 P0）**
- Rust 解释器核心实现（词法分析、语法解析、解释执行）
- Wasm 绑定和 JavaScript 集成
- 基本类型和控制流支持
- println! 等基础宏支持

### **阶段 3：代码分析（优先级 P1）**
- 语法校验集成
- 自动补全功能
- 代码格式化
- 错误标记和提示

### **阶段 4：GPU 执行优化（优先级 P2）**
- WebGPU 检测和初始化
- GPU 计算封装
- 并行任务调度
- 降级策略实现

### **阶段 5：多线程代码分析（优先级 P2）**
- Service Worker 配置
- 多域名 Worker 管理
- 并行代码分析实现
- 结果汇总和展示

### **阶段 6：项目管理（优先级 P1）**
- 单项目单 crate 约束实现
- Cargo.toml 管理
- 项目导出功能

### **阶段 7：发布编译（优先级 P3，未来实现）**
- Rust 到 Wasm 编译器集成
- 编译流程实现
- 产物下载功能

## **4.2 技术风险与缓解**

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Rust 解释器性能不足 | 执行缓慢 | 优化 AST 遍历，启用 GPU 加速 |
| WebGPU 兼容性差 | GPU 加速不可用 | 提供 CPU 降级方案 |
| 多域名配置复杂 | 部署困难 | 提供详细部署文档和示例配置 |
| localStorage 容量限制 | 无法保存大项目 | 提示用户导出，限制项目规模 |
| Rust 解释器功能不完整 | 某些代码无法执行 | 明确支持范围，提示用户限制 |
