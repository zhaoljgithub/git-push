# Git Push MCP - 基于自然语言的代码提交工具

一个智能化的Git操作工具，让你可以通过自然语言指令来自动化处理代码提交流程。

## 功能特性

- 🗣️ **自然语言交互** - 使用中文或英文自然语言指令操作Git
- 🤖 **智能解析** - 自动识别用户意图并执行相应操作
- 📝 **约定式提交** - 支持Conventional Commits规范
- ⚡ **自动化流程** - 可配置自动暂存、自动推送等功能
- 🔧 **多种操作** - 支持提交、添加、状态查询、日志查看等操作
- 🛡️ **安全可靠** - 完善的错误处理和状态检查

## 快速开始

### 安装依赖

```bash
npm install
```

### 复制配置文件

```bash
cp .env.example .env
```

### 基本使用

```bash
# 启动交互模式
npm start

# 或者直接运行
node index.js
```

## 使用示例

在交互模式下，你可以使用以下自然语言指令：

### 提交代码
```
> 提交添加了登录功能
> commit fix bug in user authentication
> 把所有修改提交上去
```

### 查看状态
```
> 查看当前状态
> status
> 有什么变化吗
```

### 添加文件
```
> 添加所有文件
> add package.json
> 把src目录加到暂存区
```

### 查看历史
```
> 查看提交历史
> log
> 最近的提交记录
```

### 分支操作
```
> 创建新分支 feature/login
> 切换到develop分支
> 查看所有分支
```

## 配置选项

在 `.env` 文件中可以配置以下选项：

```env
# 日志级别
LOG_LEVEL=info

# 自动暂存更改
AUTO_STAGE=true

# 自动推送提交
AUTO_PUSH=false

# 使用约定式提交格式
CONVENTIONAL_COMMITS=true

# 提交消息长度限制
MAX_COMMIT_LENGTH=72
```

## 支持的命令模式

### 提交相关
- 提交 [消息]
- commit [message]
- 把[内容]提交
- 推送 [消息]
- 发布 [消息]

### 添加文件
- 添加 [文件]
- add [files]
- 把[文件]加到暂存区
- 暂存 [文件]

### 状态查询
- 状态
- status
- 查看修改
- 有什么变化

### 日志查看
- 日志
- log
- 提交历史
- 历史记录

### 分支操作
- 分支
- branch
- 切换分支 [名称]
- 新建分支 [名称]

## 约定式提交支持

工具支持自动识别提交类型：

- **feat**: 新功能、feature、功能
- **fix**: 修复、bug、修复bug
- **docs**: 文档、document、说明
- **style**: 格式、样式
- **refactor**: 重构
- **perf**: 性能、优化
- **test**: 测试
- **chore**: 杂项、维护

## API使用

除了交互模式，你也可以在代码中直接使用：

```javascript
const { GitPushMCP } = require('./index');

const app = new GitPushMCP();

// 处理自然语言请求
const result = await app.handleRequest({
  command: 'process_natural_language',
  text: '提交修复了登录bug',
  context: {
    autoStage: true,
    autoPush: false,
    conventionalCommits: true
  }
});

console.log(result);
```

## 开发指南

### 项目结构
```
git-push-mcp/
├── index.js           # 主入口文件
├── lib/
│   ├── nlp-processor.js  # 自然语言处理器
│   ├── git-operator.js   # Git操作执行器
│   └── mcp-handler.js    # MCP处理器
├── package.json       # 项目配置
├── .env.example      # 配置示例
└── README.md         # 说明文档
```

### 扩展功能

1. **添加新的命令模式**：在 `nlp-processor.js` 的 `patterns` 对象中添加新的正则表达式
2. **新增Git操作**：在 `git-operator.js` 中添加新的方法，并在 `mcp-handler.js` 中注册对应的处理器
3. **自定义提交类型**：修改 `nlp-processor.js` 中的 `commitTypes` 映射

## 注意事项

- 需要在Git仓库目录中运行
- 确保有足够的权限执行Git操作
- 建议先在测试环境中验证配置
- 自动推送功能需谨慎使用

## 贡献

欢迎提交Issue和Pull Request来改进这个工具！

## 许可证

MIT License