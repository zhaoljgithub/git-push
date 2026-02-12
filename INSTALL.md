# Git Push MCP 安装指南

## 🚀 快速安装

### 方法一：全局安装（推荐）

```bash
# 克隆或下载项目后进入目录
cd git-push-mcp

# 全局安装
npm run install-service

# 卸载服务
npm run uninstall-service
```

### 方法二：本地使用

```bash
# 直接运行
npm start

# 或者直接执行
node index.js
```

### 方法三：作为npm包安装

```bash
# 本地打包
npm pack

# 安装打包的包
npm install -g git-push-mcp-1.0.0.tgz
```

## 🛠️ 使用方式

### 1. 交互模式
```bash
git-push-mcp
# 然后输入自然语言命令，如："提交所有更改"
```

### 2. 命令行模式
```bash
git-push-mcp "查看状态"
git-push-mcp "提交所有更改"
git-push-mcp "推送代码到远程"
```

### 3. MCP服务器模式
```bash
git-push-mcp --server
# 或者
node mcp-server.js
```

## 🔧 支持的自然语言命令

- 查看状态 / status
- 提交所有更改 / commit all
- 推送代码 / push
- 查看提交历史 / history
- 切换分支 / checkout branch
- 创建新分支 / create branch
- 查看分支 / branches

## ⚙️ 配置

复制 `.env.example` 到 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

## 📦 打包发布

### 本地打包
```bash
npm pack
```

### 发布到npm
```bash
# 首先登录npm
npm login

# 发布
npm publish
```

## 🔒 权限要求

- 需要Git仓库的读写权限
- 需要执行Git命令的权限
- 建议在已初始化的Git仓库中使用

## 🐛 故障排除

### 常见问题

1. **权限被拒绝**
   ```bash
   # Linux/Mac
   chmod +x install.js
   
   # Windows可能需要管理员权限
   ```

2. **找不到命令**
   ```bash
   # 检查npm全局路径
   npm config get prefix
   
   # 将bin目录添加到PATH
   export PATH=$PATH:$(npm config get prefix)/bin
   ```

3. **Git命令失败**
   ```bash
   # 确保Git已安装并配置
   git --version
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

## 📝 开发者指南

### 项目结构
```
git-push-mcp/
├── index.js          # 主入口文件
├── mcp-server.js     # MCP服务器实现
├── install.js        # 安装脚本
├── lib/              # 核心模块
│   ├── nlp-processor.js  # 自然语言处理
│   ├── git-operator.js   # Git操作
│   └── mcp-handler.js    # MCP处理逻辑
├── __tests__/        # 测试文件
└── package.json      # 包配置
```

### 扩展功能

可以通过修改 `lib/nlp-processor.js` 来添加更多自然语言命令的支持。

## 📄 许可证

MIT License