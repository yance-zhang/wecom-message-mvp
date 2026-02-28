# 企业微信回调处理 MVP

使用 Next.js 的企业微信消息回调处理系统。

## 项目结构

```
wecom-message-mvp/
├── app/
│   └── api/
│       └── callback/
│           └── route.js          # 企业微信回调API端点
├── .env.local.example            # 环境变量示例
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入你的企业微信配置：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```
NEXT_PUBLIC_WECOM_TOKEN=your_token_here
NEXT_PUBLIC_WECOM_ENCODING_AES_KEY=your_aes_key_here
NEXT_PUBLIC_WECOM_CORP_ID=your_corp_id_here
```

这些值在企业微信应用详情页获取。

### 3. 启动开发服务器

```bash
npm run dev
```

服务器启动后，本地地址为：`http://localhost:3000`

### 4. 配置企业微信回调

在企业微信应用设置中，回调URL配置为：

```
https://your-domain.com/api/callback
```

## API 端点

### GET /api/callback

企业微信在配置回调URL时发送的验证请求。

**参数：**

- `msg_signature`: 企业微信签名
- `timestamp`: 时间戳
- `nonce`: 随机字符串
- `echostr`: 加密的随机字符串

**返回：**

- 解密后的 echostr 字符串

### POST /api/callback

处理企业微信推送的消息。

**参数：**

- `msg_signature`: 消息签名
- `timestamp`: 时间戳
- `nonce`: 随机字符串

**请求体：**
XML 格式的加密消息

**返回：**
XML 格式的加密回复

## 关键改进

✅ 使用Next.js App Router 现代化架构  
✅ 环境变量管理敏感配置  
✅ 完整的AES-128-CBC加解密  
✅ 正确的签名计算和验证  
✅ 错误处理和日志记录  
✅ 支持消息加密回复

## 环境需求

- Node.js 18+
- npm 或 yarn

## 生产部署

1. 构建生产版本：

```bash
npm run build
```

2. 启动生产服务器：

```bash
npm start
```

3. 确保设置正确的环境变量（使用 `.env.local` 或系统环境变量）

## 注意事项

- 敏感信息（Token、AES Key）必须通过环境变量配置，不要提交到版本控制
- 企业微信的回调验证GET请求和消息POST请求都需要签名验证
- 消息内容需要AES-128-CBC加密/解密
- 回复消息也需要加密并计算新的签名

## 调试

查看 Next.js 服务器日志来调试消息处理：

```bash
# 开发模式已显示详细日志
npm run dev
```

常见问题：

- ❌ "Signature verification failed" - 检查 Token 和 AES Key 是否正确
- ❌ "Failed to decrypt message" - AES Key 格式错误，应该是45个字符的Base64字符串
- ❌ 无法访问 API - 确保 Next.js 服务器正常运行，路由地址是否正确
