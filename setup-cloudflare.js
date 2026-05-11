#!/usr/bin/env node

import readline from 'readline'
import fs from 'fs'
import path from 'path'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function main() {
  console.log('\n=== Cloudflare Setup for rust-wasm-web-ide ===\n')
  
  // 交互式输入
  const CF_TOKEN = await question('请输入 Cloudflare API Token: ')
  
  if (!CF_TOKEN || CF_TOKEN.trim().length === 0) {
    console.error('✗ Token 不能为空')
    rl.close()
    process.exit(1)
  }
  
  const ZONE_ID = await question('请输入 Zone ID: ')
  
  if (!ZONE_ID || ZONE_ID.trim().length === 0) {
    console.error('✗ Zone ID 不能为空')
    rl.close()
    process.exit(1)
  }
  
  const ZONE_NAME = await question('请输入域名 (默认: irisverse.org): ') || 'irisverse.org'
  const PROJECT_NAME = await question('请输入项目名 (默认: rust-wasm-web-ide): ') || 'rust-wasm-web-ide'
  
  console.log(`\n配置信息:`)
  console.log(`  Token: ${CF_TOKEN.substring(0, 10)}...`)
  console.log(`  Zone ID: ${ZONE_ID}`)
  console.log(`  域名: ${ZONE_NAME}`)
  console.log(`  项目: ${PROJECT_NAME}`)
  
  const confirm = await question('\n确认继续? (y/n): ')
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消')
    rl.close()
    return
  }
  
  rl.close()
  
  // 执行配置
  await setupCloudflare(CF_TOKEN.trim(), ZONE_ID.trim(), ZONE_NAME, PROJECT_NAME)
}

async function fetchCF(token, endpoint, options = {}) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  const data = await res.json()
  if (!data.success && !data.result) {
    console.error('Cloudflare API error:', data.errors || data)
    throw new Error(data.errors?.[0]?.message || 'API error')
  }
  return data
}

async function setupCloudflare(CF_TOKEN, ZONE_ID, ZONE_NAME, PROJECT_NAME) {
  try {
    // 1. 验证 Zone ID
    console.log('\n[1/4] 验证 Zone ID...')
    const zoneData = await fetchCF(CF_TOKEN, `/zones/${ZONE_ID}`)
    console.log(`✓ Zone ID: ${ZONE_ID}`)
    
    // 2. 创建 24 个子域名
    console.log('\n[2/4] 创建 24 个子域名...')
    
    for (let i = 1; i <= 24; i++) {
      const name = `ide${String(i).padStart(2, '0')}`
      const subdomain = `${name}.${ZONE_NAME}`
      
      try {
        const githubPages = 'itszzl-sudo.github.io'
        const data = await fetchCF(CF_TOKEN, `/zones/${ZONE_ID}/dns_records`, {
          method: 'POST',
          body: JSON.stringify({
            type: 'CNAME',
            name: name,
            content: githubPages,
            ttl: 3600,
            proxied: true
          })
        })
        console.log(`✓ ${subdomain} → ${githubPages}`)
      } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('81057')) {
          console.log(`⚠ ${subdomain} 已存在，跳过`)
        } else {
          console.log(`✗ ${subdomain} 创建失败: ${e.message}`)
        }
      }
    }
    
    // 完成
    console.log('\n=== 配置完成 ===')
    console.log(`✓ Zone ID: ${ZONE_ID}`)
    console.log(`✓ 域名: ${ZONE_NAME}`)
    console.log(`✓ 子域名: 24 个 (ide01-ide24.${ZONE_NAME})`)
    console.log(`✓ 所有子域名指向: GitHub Pages`)
    
    console.log('\n访问地址:')
    console.log(`  主域名: https://itszzl-sudo.github.io/rust-wasm-web-ide/`)
    console.log(`  子域名: https://ide01.${ZONE_NAME}`)
    console.log(`          https://ide02.${ZONE_NAME}`)
    console.log(`          ...`)
    console.log(`          https://ide24.${ZONE_NAME}`)
    
  } catch (e) {
    console.error('\n✗ 配置失败:', e.message)
    process.exit(1)
  }
}

main()
