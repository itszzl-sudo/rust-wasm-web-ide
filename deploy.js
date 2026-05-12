#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PLATFORM = process.argv[2] || 'all'

console.log('🚀 Rust WASM Web IDE Deployment')
console.log('================================\n')

function run(cmd, desc) {
  console.log(`📦 ${desc}...`)
  try {
    execSync(cmd, { stdio: 'inherit', env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' } })
    console.log(`✅ ${desc} 完成\n`)
  } catch (e) {
    console.error(`❌ ${desc} 失败:`, e.message)
    process.exit(1)
  }
}

function build(target) {
  const base = target === 'cloudflare' ? '/' : '/rust-wasm-web-ide/'
  
  console.log(`🔨 构建 (${target})...`)
  
  const indexHtml = path.join(__dirname, 'index.html')
  let html = fs.readFileSync(indexHtml, 'utf8')
  html = html.replace(/var base = '.*?';/, `var base = '${base}';`)
  fs.writeFileSync(indexHtml, html)
  
  const env = target === 'cloudflare' ? 'DEPLOY_TARGET=cloudflare' : ''
  run(`${env} npm run build`, `构建 ${target}`)
}

function deployGitHub() {
  console.log('\n📍 部署到 GitHub Pages')
  console.log('----------------------')
  
  build('github')
  
  run('git add docs/', '添加构建文件')
  run('git commit -m "deploy: GitHub Pages" || echo "No changes"', '提交')
  run('git push origin main', '推送到 GitHub')
  
  console.log('✅ GitHub Pages 部署完成')
  console.log('   URL: https://itszzl-sudo.github.io/rust-wasm-web-ide/\n')
}

function deployCloudflare() {
  console.log('\n📍 部署到 Cloudflare Pages')
  console.log('----------------------------')
  
  build('cloudflare')
  
  run('npx wrangler pages deploy docs --project-name=rust-wasm-web-ide --commit-dirty=true', '上传到 Cloudflare')
  
  console.log('✅ Cloudflare Pages 部署完成')
  console.log('   URL: https://rust-wasm-web-ide.pages.dev/\n')
}

function restoreHtml() {
  const indexHtml = path.join(__dirname, 'index.html')
  let html = fs.readFileSync(indexHtml, 'utf8')
  html = html.replace(/var base = '.*?';/, "var base = '/rust-wasm-web-ide/';")
  fs.writeFileSync(indexHtml, html)
}

if (PLATFORM === 'github') {
  deployGitHub()
} else if (PLATFORM === 'cloudflare') {
  deployCloudflare()
} else if (PLATFORM === 'all') {
  deployGitHub()
  deployCloudflare()
} else {
  console.log('用法: node deploy.js [github|cloudflare|all]')
  console.log('  github     - 部署到 GitHub Pages')
  console.log('  cloudflare - 部署到 Cloudflare Pages')
  console.log('  all        - 部署到双平台 (默认)')
  process.exit(1)
}

restoreHtml()
console.log('🎉 部署完成！')
