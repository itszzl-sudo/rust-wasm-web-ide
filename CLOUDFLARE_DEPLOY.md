# Cloudflare 部署指南

## 方式一：使用 Wrangler CLI（推荐）

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署到 Pages
npx wrangler pages deploy docs --project-name=rust-wasm-web-ide

# 绑定自定义域名
npx wrangler pages domain add ide01.irisverse.org --project-name=rust-wasm-web-ide
npx wrangler pages domain add ide02.irisverse.org --project-name=rust-wasm-web-ide
# ... 重复到 ide24
```

## 方式二：使用自动化脚本

```bash
# Node.js 脚本
node setup-cloudflare.js

# 或 Bash 脚本（Linux/Mac）
chmod +x setup-cloudflare.sh
./setup-cloudflare.sh
```

## 方式三：手动配置

### 1. 创建 DNS 记录

在 Cloudflare Dashboard 中：

1. 进入 `irisverse.org` → DNS
2. 添加 24 条 CNAME 记录：

| 类型 | 名称 | 目标 | 代理状态 |
|------|------|------|----------|
| CNAME | ide01 | rust-wasm-web-ide.pages.dev | 已代理 |
| CNAME | ide02 | rust-wasm-web-ide.pages.dev | 已代理 |
| ... | ... | ... | ... |
| CNAME | ide24 | rust-wasm-web-ide.pages.dev | 已代理 |

### 2. 创建 Pages 项目

1. 进入 Pages → 创建项目
2. 项目名称：`rust-wasm-web-ide`
3. 上传 `docs/` 目录

### 3. 绑定自定义域名

在 Pages 项目设置中：

1. 自定义域名 → 添加域名
2. 添加 `ide01.irisverse.org` 到 `ide24.irisverse.org`

## 验证部署

部署完成后，访问以下地址：

- 主域名：https://rust-wasm-web-ide.pages.dev
- 子域名：https://ide01.irisverse.org
- 子域名：https://ide02.irisverse.org
- ... (共 24 个)

## 多域名加速原理

浏览器对单域名并发连接限制为 6 个，通过 24 个子域名：

- 总并发数：24 × 6 = 144 个连接
- 加速倍数：约 4-6 倍

## 安全提示

⚠️ **API Token 已暴露，请立即轮换！**

轮换步骤：
1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 找到对应 token → Revoke
3. 创建新 token（权限：Zone.DNS, Account.Workers Pages）
