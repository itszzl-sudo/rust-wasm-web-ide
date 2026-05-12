# 性能优化路线图

## 两类加速

| 类型 | 目标 | 当前方案 | 未来优化 |
|------|------|----------|----------|
| **加载加速** | wasm 文件下载 | C: 双主域名 | B: Workers 代理子域名 |
| **计算加速** | 代码执行/分析 | 主线程 wasm | Worker 内 wasm |

---

## 方案演进路线

### 方案 C：双主域名直接加载（当前 ✅）

**架构**：
```
GitHub Pages: itszzl-sudo.github.io/rust-wasm-web-ide/wasm/
Cloudflare Pages: rust-wasm-web-ide.pages.dev/wasm/
```

**特点**：
- ✅ 无 CORS 问题
- ✅ 立即可用
- ⚠️ 单域名并发限制 6 个
- ⚠️ 无多域名加速

**代码逻辑**：
```typescript
const isGitHub = window.location.hostname.includes('github.io')
const wasmPath = isGitHub 
  ? '/rust-wasm-web-ide/wasm/rust_interpreter.js'
  : '/wasm/rust_interpreter.js'
```

---

### 方案 B：Workers 代理子域名（下一步）

**架构**：
```
主域名: rust-wasm-web-ide.pages.dev (托管 wasm)
子域名: ide01.irisverse.org → Worker → 主域名/wasm
        ide02.irisverse.org → Worker → 主域名/wasm
        ... (×24)
```

**Worker 代码**：
```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = 'https://rust-wasm-web-ide.pages.dev' + url.pathname
    const response = await fetch(target)
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }
}
```

**优点**：
- ✅ 真正多域名加速（25 × 6 = 150 并发）
- ✅ 单一部署，维护简单
- ✅ Workers 全球边缘节点

**缺点**：
- ⚠️ Workers CPU 限制（免费 10ms）
- ⚠️ 大 wasm 可能超时

**DNS 配置**：
```
ide01.irisverse.org → ide-subdomain-proxy.workers.dev
ide02.irisverse.org → ide-subdomain-proxy.workers.dev
...
ide24.irisverse.org → ide-subdomain-proxy.workers.dev
```

---

### 方案 A：25 Pages + Worker wasm（未来）

**架构**：
```
主域名: rust-wasm-web-ide.pages.dev
子域名: ide01-rust-wasm.pages.dev, ide02-rust-wasm.pages.dev, ...

每个 Worker:
  - 独立 wasm 实例
  - 并行执行代码
  - 任务分片处理
```

**优点**：
- ✅ 加载加速：25 × 6 = 150 并发
- ✅ 计算加速：N 核 × Worker 并行
- ✅ 真正多域名 × 多核

**缺点**：
- ⚠️ 管理复杂（25 个项目）
- ⚠️ 部署成本高

**Worker 任务分片**：
```typescript
// 并行语法检查
const chunks = splitCode(code, workerCount)
const results = await Promise.all(
  workers.map((w, i) => w.checkSyntax(chunks[i]))
)
const errors = mergeErrors(results)
```

---

## 计算加速应用场景

| 场景 | 当前 | 方案 A |
|------|------|--------|
| 大文件语法检查 | 主线程（可能卡顿） | Worker 分片并行 |
| 批量代码补全 | 单点补全 | 多位置并行补全 |
| 类型推断 | 主线程 | Worker 并行推断 |
| 测试执行 | 串行 | 并行执行 |

---

## 方案对比

| 方案 | 加载加速 | 计算加速 | 复杂度 | 可靠性 | 维护成本 |
|------|----------|----------|--------|--------|----------|
| **C** | ⭐⭐ | ⭐ | 低 | 最高 | 最低 |
| **B** | ⭐⭐⭐⭐ | ⭐⭐ | 中 | 高 | 低 |
| **A** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 高 | 高 | 高 |

---

## 实施计划

### 已完成 ✅
- [x] 方案 C：双主域名直接加载
- [x] GitHub Pages 部署
- [x] Cloudflare Pages 部署

### 进行中 🔄
- [ ] 测试双平台功能

### 待实施 📋
- [ ] 方案 B：创建 Worker `ide-subdomain-proxy`
- [ ] 方案 B：配置 DNS 子域名指向 Worker
- [ ] 方案 B：更新 `rustInterpreter.ts` 支持多域名加载
- [ ] 方案 A：Worker 内加载 wasm
- [ ] 方案 A：任务分片逻辑

---

## 监控指标

| 指标 | 方案 C | 方案 B 目标 | 方案 A 目标 |
|------|--------|-------------|-------------|
| wasm 加载时间 | ~1s | ~0.3s | ~0.2s |
| 并发连接数 | 6 | 150 | 150 |
| CPU 利用率 | 单核 | 单核 | 多核 |
| 大文件检查 | 串行 | 串行 | 并行 |

---

## 文件位置

| 文件 | 作用 |
|------|------|
| `src/utils/rustInterpreter.ts` | wasm 加载逻辑 |
| `src/utils/threadManager.ts` | Worker 管理 |
| `workers/subdomain-proxy.js` | 方案 B Worker |
| `docs/domains.json` | 域名配置 |

---

*最后更新：2026-05-12*
