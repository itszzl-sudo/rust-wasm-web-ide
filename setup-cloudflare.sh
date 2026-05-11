#!/bin/bash
# Cloudflare Setup Script for rust-wasm-web-ide
# Usage: ./setup-cloudflare.sh

echo "=== Cloudflare Setup for rust-wasm-web-ide ==="
echo ""

# 交互式输入
read -p "请输入 Cloudflare API Token: " CF_TOKEN
if [ -z "$CF_TOKEN" ]; then
  echo "✗ Token 不能为空"
  exit 1
fi

read -p "请输入域名 (默认: irisverse.org): " ZONE_NAME
ZONE_NAME=${ZONE_NAME:-irisverse.org}

read -p "请输入项目名 (默认: rust-wasm-web-ide): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-rust-wasm-web-ide}

echo ""
echo "配置信息:"
echo "  Token: ${CF_TOKEN:0:10}..."
echo "  域名: $ZONE_NAME"
echo "  项目: $PROJECT_NAME"
echo ""

read -p "确认继续? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "已取消"
  exit 0
fi

# 1. Get Zone ID
echo -e "\n[1/5] 获取 Zone ID..."
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json")

ZONE_ID=$(echo "$ZONE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ZONE_ID" ]; then
  echo "✗ 找不到域名 $ZONE_NAME"
  exit 1
fi

echo "✓ Zone ID: $ZONE_ID"

# 2. Create subdomains
echo -e "\n[2/5] 创建 24 个子域名..."

for i in $(seq -w 1 24); do
  SUBDOMAIN="ide$i"
  FULL_DOMAIN="$SUBDOMAIN.$ZONE_NAME"
  
  RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{
      \"type\": \"CNAME\",
      \"name\": \"$SUBDOMAIN\",
      \"content\": \"$PROJECT_NAME.pages.dev\",
      \"ttl\": 3600,
      \"proxied\": true
    }")
  
  if echo "$RESULT" | grep -q '"success":true'; then
    echo "✓ $FULL_DOMAIN → $PROJECT_NAME.pages.dev"
  else
    echo "⚠ $FULL_DOMAIN 可能已存在，跳过"
  fi
done

# 3. Get Account ID
echo -e "\n[3/5] 获取 Account ID..."
ACCOUNT_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json")

ACCOUNT_ID=$(echo "$ACCOUNT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✓ Account ID: $ACCOUNT_ID"

# 4. Create Pages Project
echo -e "\n[4/5] 创建 Pages 项目..."

PROJECT_RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"name\": \"$PROJECT_NAME\"}")

if echo "$PROJECT_RESULT" | grep -q '"success":true'; then
  echo "✓ 创建项目: $PROJECT_NAME"
else
  echo "⚠ 项目可能已存在，跳过"
fi

# 5. Count files
echo -e "\n[5/5] 统计部署文件..."
FILE_COUNT=$(find docs -type f 2>/dev/null | wc -l)
echo "✓ 待部署文件: $FILE_COUNT 个"

# Done
echo -e "\n=== 配置完成 ==="
echo "✓ 域名: $ZONE_NAME"
echo "✓ 子域名: 24 个 (ide01-ide24.$ZONE_NAME)"
echo "✓ Pages 项目: $PROJECT_NAME"
echo "✓ 文件: $FILE_COUNT 个"

echo -e "\n下一步:"
echo "  方式1: npx wrangler pages deploy docs --project-name=$PROJECT_NAME"
echo "  方式2: 在 Cloudflare Dashboard 手动上传 docs/ 目录"

echo -e "\n访问地址:"
echo "  主域名: https://$PROJECT_NAME.pages.dev"
echo "  子域名: https://ide01.$ZONE_NAME"
echo "  子域名: https://ide24.$ZONE_NAME"
