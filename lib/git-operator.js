const simpleGit = require('simple-git');

class GitOperator {
  constructor(logger) {
    this.logger = logger;
    this.git = simpleGit();
  }

  /**
   * 检查是否为Git仓库
   */
  async checkRepository() {
    try {
      await this.git.status();
      return { isRepository: true };
    } catch (error) {
      return { isRepository: false, error: error.message };
    }
  }

  /**
   * 获取Git状态
   */
  async getStatus() {
    try {
      this.logger.info('获取Git状态', { service: 'git-push-mcp' });
      const status = await this.git.status();
      
      return {
        success: true,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        staged: status.staged,
        untracked: status.not_added,
        conflicted: status.conflicted,
        isClean: status.isClean(),
        currentBranch: status.current,
        tracking: status.tracking
      };
    } catch (error) {
      this.logger.error('获取状态失败', { 
        error: error?.message || '未知错误',
        stack: error?.stack,
        service: 'git-push-mcp' 
      });
      throw new Error(error?.message || '获取Git状态失败');
    }
  }

  /**
   * 添加文件到暂存区
   */
  async addFiles(files = '.') {
    try {
      this.logger.info(`添加文件到暂存区: ${files}`, { service: 'git-push-mcp' });
      
      if (files === '.' || files === 'all') {
        await this.git.add('.');
      } else if (Array.isArray(files)) {
        await this.git.add(files);
      } else {
        await this.git.add(files);
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error('添加文件失败', { 
        error: error?.message || '未知错误',
        files,
        service: 'git-push-mcp' 
      });
      throw new Error(error?.message || '添加文件失败');
    }
  }

  /**
   * 提交更改
   */
  async commit(message, options = {}) {
    try {
      this.logger.info(`提交更改: ${message}`);
      
      const commitOptions = {
        '--no-verify': options.noVerify || false
      };
      
      if (options.allowEmpty) {
        commitOptions['--allow-empty'] = true;
      }
      
      const result = await this.git.commit(message, undefined, commitOptions);
      
      return {
        success: true,
        data: {
          commit: result.commit,
          summary: result.summary
        },
        message: `提交成功: ${message}`
      };
    } catch (error) {
      this.logger.error('提交失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 推送到远程仓库
   */
  async push(options = {}) {
    try {
      this.logger.info('推送更改到远程仓库');
      
      const pushOptions = [];
      if (options.force) {
        pushOptions.push('--force');
      }
      
      const result = await this.git.push(pushOptions);
      
      return {
        success: true,
        data: result,
        message: '推送成功'
      };
    } catch (error) {
      this.logger.error('推送失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取提交日志
   */
  async getLog(limit = 10) {
    try {
      this.logger.info(`获取最近${limit}条提交日志`);
      
      const logs = await this.git.log({ maxCount: limit });
      
      return {
        success: true,
        data: logs.all.map(commit => ({
          hash: commit.hash,
          date: commit.date,
          message: commit.message,
          author: commit.author_name
        }))
      };
    } catch (error) {
      this.logger.error('获取日志失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取差异统计
   */
  async getDiff() {
    try {
      this.logger.info('获取差异统计');
      
      const diff = await this.git.diff(['--stat']);
      
      return {
        success: true,
        data: diff
      };
    } catch (error) {
      this.logger.error('获取差异失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 创建新分支
   */
  async createBranch(branchName) {
    try {
      this.logger.info(`创建分支: ${branchName}`);
      
      await this.git.checkoutLocalBranch(branchName);
      
      return {
        success: true,
        message: `分支创建成功: ${branchName}`
      };
    } catch (error) {
      this.logger.error('创建分支失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 切换分支
   */
  async checkoutBranch(branchName) {
    try {
      this.logger.info(`切换到分支: ${branchName}`);
      
      await this.git.checkout(branchName);
      
      return {
        success: true,
        message: `已切换到分支: ${branchName}`
      };
    } catch (error) {
      this.logger.error('切换分支失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取所有分支
   */
  async getBranches() {
    try {
      this.logger.info('获取分支列表');
      
      const branches = await this.git.branch();
      
      return {
        success: true,
        data: {
          current: branches.current,
          local: branches.all.filter(b => !b.startsWith('remotes/')),
          remote: branches.all.filter(b => b.startsWith('remotes/'))
        }
      };
    } catch (error) {
      this.logger.error('获取分支失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 撤销工作区更改
   */
  async resetWorkingDirectory(files = '.') {
    try {
      this.logger.info(`撤销工作区更改: ${files}`);
      
      if (files === '.') {
        await this.git.reset('hard');
      } else {
        await this.git.checkout(files);
      }
      
      return {
        success: true,
        message: '已撤销更改'
      };
    } catch (error) {
      this.logger.error('撤销更改失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 撤销暂存区更改
   */
  async unstageFiles(files = '.') {
    try {
      this.logger.info(`撤销暂存区更改: ${files}`);
      
      if (files === '.') {
        await this.git.reset();
      } else {
        await this.git.reset('HEAD', files);
      }
      
      return {
        success: true,
        message: '已撤销暂存'
      };
    } catch (error) {
      this.logger.error('撤销暂存失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取仓库根目录
   */
  async getRepoRoot() {
    try {
      const root = await this.git.revparse(['--show-toplevel']);
      return {
        success: true,
        root: root.trim()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行自定义Git命令
   */
  async executeCustomCommand(command, args = []) {
    try {
      this.logger.info(`执行自定义命令: git ${command} ${args.join(' ')}`);
      
      const result = await this.git.raw([command, ...args]);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('执行自定义命令失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { GitOperator };