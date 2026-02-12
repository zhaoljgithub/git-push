const { NaturalLanguageProcessor } = require('./nlp-processor');
const { GitOperator } = require('./git-operator');
const winston = require('winston');

class MCPHandler {
  constructor() {
    // 配置日志
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'git-push-mcp' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    // 初始化组件，传入logger
    this.nlpProcessor = new NaturalLanguageProcessor(this.logger);
    this.gitOperator = new GitOperator(this.logger);

    // 支持的操作映射
    this.actionHandlers = {
      commit: this.handleCommit.bind(this),
      add: this.handleAdd.bind(this),
      status: this.handleStatus.bind(this),
      log: this.handleLog.bind(this),
      diff: this.handleDiff.bind(this),
      branch: this.handleBranch.bind(this)
    };
  }

  /**
   * 处理自然语言请求（新的SDK接口）
   */
  async processNaturalLanguage(text, context = {}) {
    try {
      // 确保在Git仓库中（如果不存在则初始化）
      const repoCheck = await this.gitOperator.ensureRepository();
      if (!repoCheck.success) {
        return {
          success: false,
          error: '无法初始化或访问Git仓库',
          details: repoCheck.error,
          service: 'git-push-mcp'
        };
      }

      // 解析自然语言命令
      const parsedCommand = this.nlpProcessor.parseCommand(text);
      this.logger.info('解析结果', { 
        ...parsedCommand, 
        originalText: text,
        service: 'git-push-mcp' 
      });

      // 处理命令
      const handler = this.actionHandlers[parsedCommand.command];
      if (handler) {
        const result = await handler(parsedCommand, context);
        return {
          success: true,
          action: parsedCommand.command,
          message: result.message,
          details: result.details,
          service: 'git-push-mcp'
        };
      } else {
        return {
          success: false,
          error: `不支持的命令: ${parsedCommand.command}`,
          service: 'git-push-mcp'
        };
      }
    } catch (error) {
      this.logger.error('处理请求失败', { 
        error: error.message,
        stack: error.stack,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error.message,
        service: 'git-push-mcp'
      };
    }
  }

  /**
   * 处理MCP请求
   */
  async processRequest(request) {
    const { command, text, context = {} } = request;
    
    try {
      // 确保在Git仓库中（如果不存在则初始化）
      const repoCheck = await this.gitOperator.ensureRepository();
      if (!repoCheck.success) {
        return {
          success: false,
          error: '无法初始化或访问Git仓库',
          details: repoCheck.error,
          suggestion: '请检查目录权限或手动初始化Git仓库',
          timestamp: new Date().toISOString()
        };
      }

      switch (command) {
        case 'process_natural_language':
          return await this.processNaturalLanguage(text, context);
        
        case 'execute_action':
          return await this.executeAction(request.action, request.params);
        
        case 'get_capabilities':
          return this.getCapabilities();
        
        default:
          return {
            success: false,
            error: `不支持的命令: ${command}`,
            timestamp: new Date().toISOString()
          };
      }
    } catch (error) {
      this.logger.error('处理请求时出错:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理自然语言输入
   */
  async processNaturalLanguage(text, context) {
    // 解析自然语言命令
    const parsedCommand = this.nlpProcessor.parseCommand(text);
    this.logger.info('解析结果:', parsedCommand);

    // 根据解析结果执行相应操作
    const handler = this.actionHandlers[parsedCommand.command];
    if (handler) {
      return await handler(parsedCommand, context);
    }

    return {
      success: false,
      error: `无法识别的命令: ${parsedCommand.command}`,
      parsed: parsedCommand,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 处理提交操作
   */
  async handleCommit(parsedCommand, context) {
    const { message, commitType } = parsedCommand;
    const { autoStage = true, autoPush = false, conventionalCommits = true } = context;

    try {
      // 获取当前状态
      const statusResult = await this.gitOperator.getStatus();
      if (!statusResult.success) {
        return statusResult;
      }

      const status = statusResult.data;
      
      // 检查是否有更改需要提交
      if (status.isClean) {
        return {
          success: false,
          error: '没有需要提交的更改',
          suggestion: '请先修改一些文件再提交',
          action: 'status_check',
          timestamp: new Date().toISOString()
        };
      }

      // 自动暂存文件（如果启用）
      if (autoStage && (status.not_added.length > 0 || status.modified.length > 0)) {
        const addResult = await this.gitOperator.addFiles('.');
        if (!addResult.success) {
          return addResult;
        }
      }

      // 格式化提交消息
      const formattedMessage = conventionalCommits 
        ? this.nlpProcessor.formatCommitMessage(parsedCommand, true)
        : message;

      // 执行提交
      const commitResult = await this.gitOperator.commit(formattedMessage);
      if (!commitResult.success) {
        return commitResult;
      }

      // 自动推送（如果启用）
      let pushResult = null;
      if (autoPush) {
        // 获取当前分支信息用于推送
        const statusResult = await this.gitOperator.getStatus();
        const currentBranch = statusResult.data?.current || 'master';
        
        pushResult = await this.gitOperator.push('origin', currentBranch);
        if (!pushResult.success) {
          return {
            ...pushResult,
            warning: '提交成功但推送失败，请手动推送'
          };
        }
      }

      return {
        success: true,
        action: 'commit_and_push',
        message: formattedMessage,
        details: {
          commit: commitResult.data,
          pushed: autoPush && pushResult?.success
        },
        changes: {
          filesChanged: (status.modified ? status.modified.length : 0) + 
                      (status.created ? status.created.length : 0) + 
                      (status.deleted ? status.deleted.length : 0),
          filesStaged: status.staged ? status.staged.length : 0
        },
        pushed: autoPush && pushResult?.success,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('提交过程中出错:', error);
      return {
        success: false,
        error: error.message,
        action: 'commit',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理添加文件操作
   */
  async handleAdd(parsedCommand, context) {
    try {
      const { message } = parsedCommand;
      const files = message || '.';
      
      const result = await this.gitOperator.addFiles(files);
      
      if (result.success) {
        return {
          success: true,
          action: 'add',
          message: result.message,
          files: files,
          timestamp: new Date().toISOString()
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        action: 'add',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理状态查询操作
   */
  async handleStatus(parsedCommand, context) {
    try {
      const result = await this.gitOperator.getStatus();
      
      if (result.success) {
        const status = result.data;
        
        return {
          success: true,
          action: 'status',
          message: status.isClean ? '工作区干净，没有待提交的更改' : '发现待提交的更改',
          details: {
            isClean: status.isClean,
            currentBranch: status.current,
            tracking: status.tracking,
            changes: {
              modified: status.modified.length,
              created: status.created.length,
              deleted: status.deleted.length,
              staged: status.staged.length,
              untracked: status.not_added.length
            }
          },
          files: {
            modified: status.modified,
            created: status.created,
            deleted: status.deleted,
            staged: status.staged,
            untracked: status.not_added
          },
          timestamp: new Date().toISOString()
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        action: 'status',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理日志查询操作
   */
  async handleLog(parsedCommand, context) {
    try {
      const { limit = 10 } = context;
      const result = await this.gitOperator.getLog(limit);
      
      if (result.success) {
        return {
          success: true,
          action: 'log',
          commits: result.data,
          count: result.data.length,
          timestamp: new Date().toISOString()
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        action: 'log',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理差异查询操作
   */
  async handleDiff(parsedCommand, context) {
    try {
      const result = await this.gitOperator.getDiff();
      
      if (result.success) {
        return {
          success: true,
          action: 'diff',
          diff: result.data,
          timestamp: new Date().toISOString()
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        action: 'diff',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理分支操作
   */
  async handleBranch(parsedCommand, context) {
    try {
      const { message } = parsedCommand;
      const { action = 'list' } = context;
      
      switch (action) {
        case 'create':
          if (!message) {
            return {
              success: false,
              error: '请指定分支名称',
              timestamp: new Date().toISOString()
            };
          }
          return await this.gitOperator.createBranch(message);
          
        case 'checkout':
          if (!message) {
            return {
              success: false,
              error: '请指定要切换的分支名称',
              timestamp: new Date().toISOString()
            };
          }
          return await this.gitOperator.checkoutBranch(message);
          
        case 'list':
        default:
          const result = await this.gitOperator.getBranches();
          if (result.success) {
            return {
              success: true,
              action: 'branch_list',
              branches: result.data,
              timestamp: new Date().toISOString()
            };
          }
          return result;
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        action: 'branch',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 直接执行特定操作
   */
  async executeAction(action, params = {}) {
    const handler = this.actionHandlers[action];
    if (!handler) {
      return {
        success: false,
        error: `不支持的操作: ${action}`,
        timestamp: new Date().toISOString()
      };
    }

    // 构造伪解析命令对象
    const pseudoCommand = {
      command: action,
      message: params.message || '',
      commitType: params.commitType || null
    };

    return await handler(pseudoCommand, params.context || {});
  }

  /**
   * 获取工具能力列表
   */
  getCapabilities() {
    return {
      success: true,
      capabilities: {
        naturalLanguage: true,
        gitOperations: [
          'commit',
          'add',
          'status',
          'log',
          'diff',
          'branch'
        ],
        features: [
          '约定式提交',
          '自动暂存',
          '自动推送',
          '智能解析'
        ]
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取Git状态（新的SDK接口）
   */
  async getGitStatus() {
    try {
      // 确保在Git仓库中
      const repoCheck = await this.gitOperator.ensureRepository();
      if (!repoCheck.success) {
        return {
          success: false,
          error: '无法访问Git仓库',
          details: repoCheck.error,
          service: 'git-push-mcp'
        };
      }

      this.logger.info('开始获取Git状态', { service: 'git-push-mcp' });
      const status = await this.gitOperator.getStatus();
      this.logger.info('Git状态获取成功', { status, service: 'git-push-mcp' });
      
      return {
        success: true,
        action: 'status',
        details: status,
        service: 'git-push-mcp'
      };
    } catch (error) {
      this.logger.error('获取状态失败详情', { 
        error: error.message,
        stack: error.stack,
        typeofError: typeof error,
        errorKeys: Object.keys(error || {}),
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error.message,
        service: 'git-push-mcp'
      };
    }
  }

  /**
   * 提交更改（新的SDK接口）
   */
  async commitChanges(message, files = [], stageAll = true, autoPush = false) {
    try {
      const repoCheck = await this.gitOperator.checkRepository();
      if (!repoCheck.isRepository) {
        return {
          success: false,
          error: '当前目录不是Git仓库',
          service: 'git-push-mcp'
        };
      }

      let result;
      if (stageAll) {
        result = await this.gitOperator.addAllAndCommit(message);
      } else if (files && files.length > 0) {
        result = await this.gitOperator.addFilesAndCommit(files, message);
      } else {
        result = await this.gitOperator.commit(message);
      }

      // 如果启用了自动推送，则推送当前分支
      let pushResult = null;
      if (autoPush) {
        const status = await this.gitOperator.getStatus();
        const currentBranch = status.data?.current || 'master';
        pushResult = await this.gitOperator.push('origin', currentBranch);
        
        if (!pushResult.success) {
          return {
            success: true,
            action: 'commit',
            message: result.summary,
            details: result,
            warning: '提交成功但推送失败，请手动推送',
            pushed: false,
            service: 'git-push-mcp'
          };
        }
      }

      return {
        success: true,
        action: autoPush ? 'commit_and_push' : 'commit',
        message: result.summary,
        details: result,
        pushed: autoPush && pushResult?.success,
        service: 'git-push-mcp'
      };
    } catch (error) {
      this.logger.error('提交失败', { 
        error: error.message,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error.message,
        service: 'git-push-mcp'
      };
    }
  }

  /**
   * 推送更改（新的SDK接口）
   */
  async pushChanges(remote = 'origin', branch) {
    try {
      // 确保在Git仓库中
      const repoCheck = await this.gitOperator.ensureRepository();
      if (!repoCheck.success) {
        return {
          success: false,
          error: '无法访问Git仓库',
          details: repoCheck.error,
          service: 'git-push-mcp'
        };
      }

      const result = await this.gitOperator.push(remote, branch);
      
      return {
        success: true,
        action: 'push',
        message: result.pushed ? '推送成功' : '无需推送',
        details: result,
        service: 'git-push-mcp'
      };
    } catch (error) {
      this.logger.error('推送失败', { 
        error: error.message,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error.message,
        service: 'git-push-mcp'
      };
    }
  }
}

module.exports = { MCPHandler };