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
  
  // 交互式输入 token
  const CF_TOKEN = await question('请输入 Cloudflare API Token: ')
  
  if (!CF_TOKEN || CF_TOKEN.trim().length === 0) {
    console.error('✗ Token 不能为空')
    rl.close()
    process.exit(1)
  }
  
  const ZONE_NAME = await question('请输入域名 (默认: irisverse.org): ') || 'irisverse.org'
  const PROJECT_NAME = await question('请输入项目名 (默认: rust-wasm-web-ide): ') || 'rust-wasm-web-ide'
  
  console.log(`\n配置信息:`)
  console.log(`  Token: ${CF_TOKEN.substring(0, 10)}...`)
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
  await setupCloudflare(CF_TOKEN.trim(), ZONE_NAME, PROJECT_NAME)
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

async function setupCloudflare(CF_TOKEN, ZONE_NAME, PROJECT_NAME) {
  try {
    // 1. 获取 Zone ID
    console.log('\n[1/5] 获取 Zone ID...')
    const zonesData = await fetchCF(CF_TOKEN, `/zones?name=${ZONE_NAME}`)
    const zone = zonesData.result?.[0]
    
    if (!zone) {
      throw new Error(`找不到域名 ${ZONE_NAME}`)
    }
    
    const zoneId = zone.id
    console.log(`✓ Zone ID: ${zoneId}`)
    
    // 2. 创建 24 个子域名
    console.log('\n[2/5] 创建 24 个子域名...')
    
    for (let i = 1; i <= 24; i++) {
      const name = `ide${String(i).padStart(2, '0')}`
      const subdomain = `${name}.${ZONE_NAME}`
      
      try {
        const githubPages = 'itszzl-sudo.github.io'
        const data = await fetchCF(CF_TOKEN, `/zones/${zoneId}/dns_records`, {
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
    
    // 3. 获取 Account ID
    console.log('\n[3/5] 获取 Account ID...')
    const accountsData = await fetchCF(CF_TOKEN, '/accounts')
    const account = accountsData.result?.[0]
    
    if (!account) {
      throw new Error('找不到 Account')
    }
    
    const accountId = account.id
    console.log(`✓ Account ID: ${accountId}`)
    
    // 4. 创建 Pages 项目
    console.log('\n[4/5] 创建 Pages 项目...')
    
    try {
      await fetchCF(CF_TOKEN, `/accounts/${accountId}/pages/projects/${PROJECT_NAME}`)
      console.log(`✓ 项目 ${PROJECT_NAME} 已存在`)
    } catch {
      try {
        await fetchCF(CF_TOKEN, `/accounts/${accountId}/pages/projects`, {
          method: 'POST',
          body: JSON.stringify({
            name: PROJECT_NAME,
            production_branch: 'main'
          })
        })
        console.log(`✓ 创建项目: ${PROJECT_NAME}`)
      } catch (e) {
        console.log(`⚠ 项目创建失败: ${e.message}`)
      }
    }
    
    // 5. 统计文件
    console.log('\n[5/5] 统计部署文件...')
    
    const docsDir = path.join(process.cwd(), 'docs')
    let fileCount = 0
    
    function countFiles(dir) {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          countFiles(fullPath)
        } else {
          fileCount++
        }
      }
    }
    
    if (fs.existsSync(docsDir)) {
      countFiles(docsDir)
    }
    
    console.log(`✓ 待部署文件: ${fileCount} 个`)
    
    // 完成
    console.log('\n=== 配置完成 ===')
    console.log(`✓ 域名: ${ZONE_NAME}`)
    console.log(`✓ 子域名: 24 个 (ide01-ide24.${ZONE_NAME})`)
    console.log(`✓ Pages 项目: ${PROJECT_NAME}`)
    console.log(`✓ 文件: ${fileCount} 个`)
    
    console.log('\n下一步:')
    console.log('  方式1: npx wrangler pages deploy docs --project-name=' + PROJECT_NAME)
    console.log('  方式2: 在 Cloudflare Dashboard 手动上传 docs/ 目录')
    
    console.log('\n访问地址:')
    console.log(`  主域名: https://itszzl-sudo.github.io/rust-wasm-web-ide/`)
    console.log(`  子域名: https://ide01.${ZONE_NAME}`)
    console.log(`  子域名: https://ide24.${ZONE_NAME}`)
    
  } catch (e) {
    console.error('\n✗ 配置失败:', e.message)
    process.exit(1)
  }
}

main()
