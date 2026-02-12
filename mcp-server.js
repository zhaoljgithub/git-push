#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

const { MCPHandler } = require('./lib/mcp-handler');

async function main() {
  // 创建MCP处理器实例
  const handler = new MCPHandler();

  // 创建服务器实例
  const server = new Server(
    {
      name: 'git-push-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {}
      }
    }
  );

  // 注册工具调用处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      let result;
      
      switch (name) {
        case 'process_natural_language':
          result = await handler.processNaturalLanguage(args.text, args.context || {});
          break;
        case 'get_git_status':
          result = await handler.getGitStatus();
          break;
        case 'commit_changes':
          result = await handler.commitChanges(args.message, args.files, args.stageAll);
          break;
        case 'push_changes':
          result = await handler.pushChanges(args.remote, args.branch);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              service: 'git-push-mcp'
            }, null, 2)
          }
        ]
      };
    }
  });

  // 注册工具列表处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'process_natural_language',
          description: '处理自然语言Git命令，如"提交所有更改"、"推送代码"等',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: '自然语言Git命令，如"提交所有更改"、"查看状态"等'
              },
              context: {
                type: 'object',
                description: '执行上下文配置',
                properties: {
                  autoStage: {
                    type: 'boolean',
                    description: '是否自动添加文件到暂存区',
                    default: true
                  },
                  autoPush: {
                    type: 'boolean',
                    description: '是否自动推送到远程仓库',
                    default: false
                  },
                  conventionalCommits: {
                    type: 'boolean',
                    description: '是否使用约定式提交格式',
                    default: true
                  }
                }
              }
            },
            required: ['text']
          }
        },
        {
          name: 'get_git_status',
          description: '获取Git仓库状态信息',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'commit_changes',
          description: '提交Git更改',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: '提交消息'
              },
              files: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: '要提交的文件列表'
              },
              stageAll: {
                type: 'boolean',
                description: '是否添加所有更改的文件',
                default: true
              }
            },
            required: ['message']
          }
        },
        {
          name: 'push_changes',
          description: '推送到远程仓库',
          inputSchema: {
            type: 'object',
            properties: {
              remote: {
                type: 'string',
                description: '远程仓库名称',
                default: 'origin'
              },
              branch: {
                type: 'string',
                description: '要推送的分支名称'
              }
            }
          }
        }
      ]
    };
  });

  // 注册资源和提示处理器（暂不实现）
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));
  server.setRequestHandler(ReadResourceRequestSchema, async () => ({ contents: [] }));
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
  server.setRequestHandler(GetPromptRequestSchema, async () => ({ messages: [] }));

  try {
    // 设置传输层并连接
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Git Push MCP Server running on stdio');
  } catch (error) {
    console.error('Server connection error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});