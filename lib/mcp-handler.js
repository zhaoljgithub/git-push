class MCPHandler {
  constructor(nlpProcessor, gitOperator, logger) {
    this.nlpProcessor = nlpProcessor;
    this.gitOperator = gitOperator;
    this.logger = logger;
    
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
   * 处理MCP请求
   */
  async processRequest(request) {
    const { command, text, context = {} } = request;
    
    try {
      // 检查是否为Git仓库
      const repoCheck = await this.gitOperator.checkRepository();
      if (!repoCheck.isRepository) {
        return {
          success: false,
          error: '当前目录不是Git仓库',
          suggestion: '请在Git仓库目录中运行此工具',
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
      if (autoStage && ((status.not_added && status.not_added.length > 0) || 
                       (status.modified && status.modified.length > 0))) {
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
        pushResult = await this.gitOperator.push();
        if (!pushResult.success) {
          return {
            ...pushResult,
            warning: '提交成功但推送失败，请手动推送'
          };
        }
      }

      return {
        success: true,
        action: 'commit',
        message: formattedMessage,
        details: commitResult.data,
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
}

module.exports = { MCPHandler };