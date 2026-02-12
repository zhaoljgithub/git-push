const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

class GitOperator {
  constructor(logger) {
    this.logger = logger;
    this.git = simpleGit();
  }

  /**
   * 检查是否为Git仓库（优化版本）
   */
  async checkRepository() {
    try {
      // 首先检查.git目录是否存在
      const repoRoot = await this.findRepoRoot();
      if (!repoRoot) {
        return { 
          success: false, 
          isRepository: false, 
          error: '未找到.git目录，当前目录不是Git仓库' 
        };
      }

      // 如果有.git目录，再尝试执行git status验证
      await this.git.status();
      return { 
        success: true, 
        isRepository: true,
        root: repoRoot
      };
    } catch (error) {
      return { 
        success: false, 
        isRepository: false, 
        error: error.message || 'Git仓库检测失败' 
      };
    }
  }

  /**
   * 查找仓库根目录
   */
  async findRepoRoot(startDir = process.cwd()) {
    let currentDir = startDir;
    
    // 向上遍历目录树寻找.git目录
    while (currentDir && currentDir !== path.parse(currentDir).root) {
      const gitDir = path.join(currentDir, '.git');
      if (fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory()) {
        return currentDir;
      }
      const parentDir = path.dirname(currentDir);
      // 防止无限循环
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
    
    // 检查当前目录是否就是仓库根目录
    const gitDir = path.join(startDir, '.git');
    if (fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory()) {
      return startDir;
    }
    
    return null;
  }

  /**
   * 初始化Git仓库
   */
  async initializeRepository() {
    try {
      // 先检查是否已经是Git仓库
      const repoCheck = await this.checkRepository();
      if (repoCheck.isRepository) {
        this.logger.info('仓库已存在，跳过初始化', { 
          root: repoCheck.root,
          service: 'git-push-mcp' 
        });
        return {
          success: true,
          message: '仓库已存在',
          root: repoCheck.root
        };
      }

      this.logger.info('初始化新的Git仓库', { service: 'git-push-mcp' });
      
      // 执行git init
      await this.git.init();
      
      // 获取新的仓库根目录
      const newRoot = await this.findRepoRoot();
      
      this.logger.info('Git仓库初始化成功', { 
        root: newRoot,
        service: 'git-push-mcp' 
      });
      
      return {
        success: true,
        message: 'Git仓库初始化成功',
        root: newRoot
      };
    } catch (error) {
      this.logger.error('初始化Git仓库失败', { 
        error: error?.message || '未知错误',
        stack: error?.stack,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error?.message || '初始化Git仓库失败'
      };
    }
  }

  /**
   * 确保在Git仓库中（如果没有则初始化）
   */
  async ensureRepository() {
    const repoCheck = await this.checkRepository();
    
    if (!repoCheck.isRepository) {
      this.logger.info('检测到非Git仓库，正在初始化...', { service: 'git-push-mcp' });
      return await this.initializeRepository();
    }
    
    return repoCheck;
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
        data: {
          modified: status.modified,
          created: status.created,
          deleted: status.deleted,
          staged: status.staged,
          not_added: status.not_added,
          conflicted: status.conflicted,
          isClean: status.isClean(),
          current: status.current,
          tracking: status.tracking
        }
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
   * 添加所有文件并提交
   */
  async addAllAndCommit(message, options = {}) {
    try {
      this.logger.info(`添加所有文件并提交: ${message}`, { service: 'git-push-mcp' });
      
      // 添加所有文件
      await this.git.add('.');
      
      // 提交更改
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
      this.logger.error('添加并提交失败', { 
        error: error?.message || '未知错误',
        message,
        service: 'git-push-mcp' 
      });
      throw new Error(error?.message || '添加并提交失败');
    }
  }

  /**
   * 添加指定文件并提交
   */
  async addFilesAndCommit(files, message, options = {}) {
    try {
      this.logger.info(`添加指定文件并提交: ${message}`, { 
        files,
        service: 'git-push-mcp' 
      });
      
      // 添加指定文件
      if (Array.isArray(files)) {
        await this.git.add(files);
      } else {
        await this.git.add(files);
      }
      
      // 提交更改
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
      this.logger.error('添加文件并提交失败', { 
        error: error?.message || '未知错误',
        files,
        message,
        service: 'git-push-mcp' 
      });
      throw new Error(error?.message || '添加文件并提交失败');
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
  async push(remote = 'origin', branch, options = {}) {
    try {
      this.logger.info('推送更改到远程仓库', { 
        remote,
        branch,
        service: 'git-push-mcp' 
      });
      
      const pushOptions = [];
      if (options.force) {
        pushOptions.push('--force');
      }
      
      let result;
      if (branch) {
        result = await this.git.push(remote, branch, pushOptions);
      } else {
        result = await this.git.push(remote, pushOptions);
      }
      
      return {
        success: true,
        pushed: true,
        data: result,
        message: '推送成功'
      };
    } catch (error) {
      this.logger.error('推送失败', { 
        error: error?.message || '未知错误',
        remote,
        branch,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        pushed: false,
        error: error?.message || '推送失败'
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