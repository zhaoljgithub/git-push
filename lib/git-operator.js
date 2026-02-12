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
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }

  /**
   * 确保在Git仓库中（自动初始化如果需要）
   */
  async ensureRepository() {
    const checkResult = await this.checkRepository();
    
    if (checkResult.isRepository) {
      return { success: true, message: '已在Git仓库中' };
    }
    
    // 尝试初始化仓库
    try {
      await this.git.init();
      return { success: true, message: '仓库初始化成功' };
    } catch (error) {
      return { 
        success: false, 
        error: `仓库初始化失败: ${error.message}` 
      };
    }
  }

  /**
   * 获取Git状态
   */
  async getStatus() {
    try {
      this.logger.info('获取Git状态', { service: 'git-push-mcp' });
      const status = await this.git.status();
      
      // 确保返回的数据结构一致
      return {
        success: true,
        data: {
          modified: status.modified || [],
          created: status.created || [],
          deleted: status.deleted || [],
          staged: status.staged || [],
          not_added: status.not_added || [],
          conflicted: status.conflicted || [],
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
      return {
        success: false,
        error: error?.message || '获取Git状态失败'
      };
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
      
      return { 
        success: true,
        message: `已添加文件: ${Array.isArray(files) ? files.join(', ') : files}`
      };
    } catch (error) {
      this.logger.error('添加文件失败', { 
        error: error?.message || '未知错误',
        files,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error?.message || '添加文件失败'
      };
    }
  }

  /**
   * 提交更改
   */
  async commit(message, options = {}) {
    try {
      this.logger.info(`提交更改: ${message}`, { service: 'git-push-mcp' });
      
      // 确保有文件被暂存
      const status = await this.getStatus();
      if (status.success && status.data.staged.length === 0) {
        this.logger.warn('没有文件被暂存，尝试添加所有文件', { service: 'git-push-mcp' });
        const addResult = await this.addFiles('.');
        if (!addResult.success) {
          return addResult;
        }
      }
      
      const commitOptions = {
        '--no-verify': options.noVerify || false
      };
      
      if (options.allowEmpty) {
        commitOptions['--allow-empty'] = true;
      }
      
      const result = await this.git.commit(message, undefined, commitOptions);
      
      // 获取提交统计信息
      const stats = {
        changes: result.summary.changes || 0,
        insertions: result.summary.insertions || 0,
        deletions: result.summary.deletions || 0
      };
      
      return {
        success: true,
        data: {
          commit: result.commit,
          summary: result.summary,
          stats: stats
        },
        message: `提交成功: ${message}`,
        stats: stats
      };
    } catch (error) {
      this.logger.error('提交失败', { 
        error: error?.message || '未知错误',
        message,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error?.message || '提交失败'
      };
    }
  }

  /**
   * 添加所有文件并提交（一体化操作）
   */
  async addAllAndCommit(message, options = {}) {
    try {
      this.logger.info(`添加所有文件并提交: ${message}`, { service: 'git-push-mcp' });
      
      // 先添加所有文件
      await this.git.add('.');
      
      // 再提交
      const commitOptions = {
        '--no-verify': options.noVerify || false
      };
      
      if (options.allowEmpty) {
        commitOptions['--allow-empty'] = true;
      }
      
      const result = await this.git.commit(message, undefined, commitOptions);
      
      // 获取准确的提交统计
      const statusAfter = await this.getStatus();
      const stats = {
        changes: (statusAfter.data?.modified?.length || 0) + 
                 (statusAfter.data?.created?.length || 0) + 
                 (statusAfter.data?.deleted?.length || 0),
        insertions: result.summary?.insertions || 0,
        deletions: result.summary?.deletions || 0,
        filesStaged: statusAfter.data?.staged?.length || 0
      };
      
      return {
        success: true,
        data: {
          commit: result.commit,
          summary: result.summary,
          stats: stats
        },
        message: `提交成功: ${message}`,
        stats: stats
      };
    } catch (error) {
      this.logger.error('添加并提交失败', { 
        error: error?.message || '未知错误',
        message,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error?.message || '添加并提交失败'
      };
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
      
      // 获取统计信息
      const stats = {
        changes: Array.isArray(files) ? files.length : 1,
        insertions: result.summary?.insertions || 0,
        deletions: result.summary?.deletions || 0
      };
      
      return {
        success: true,
        data: {
          commit: result.commit,
          summary: result.summary,
          stats: stats
        },
        message: `提交成功: ${message}`,
        stats: stats
      };
    } catch (error) {
      this.logger.error('添加文件并提交失败', { 
        error: error?.message || '未知错误',
        files,
        message,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error?.message || '添加文件并提交失败'
      };
    }
  }

  /**
   * 一体化提交并推送
   */
  async commitAndPush(message, options = {}) {
    try {
      this.logger.info(`提交并推送: ${message}`, { service: 'git-push-mcp' });
      
      // 先执行提交
      const commitResult = await this.addAllAndCommit(message, options);
      if (!commitResult.success) {
        return commitResult;
      }
      
      // 获取当前分支
      const status = await this.getStatus();
      const currentBranch = status.data?.current || 'master';
      
      // 执行推送
      const pushResult = await this.push('origin', currentBranch);
      if (!pushResult.success) {
        return {
          success: true,
          data: commitResult.data,
          message: commitResult.message,
          stats: commitResult.stats,
          warning: '提交成功但推送失败，请手动推送',
          pushed: false
        };
      }
      
      return {
        success: true,
        data: commitResult.data,
        message: `${commitResult.message} 并推送成功`,
        stats: commitResult.stats,
        pushed: true
      };
    } catch (error) {
      this.logger.error('提交并推送失败', { 
        error: error?.message || '未知错误',
        message,
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error?.message || '提交并推送失败'
      };
    }
  }

  /**
   * 推送到远程仓库
   */
  async push(remote = 'origin', branch) {
    try {
      this.logger.info(`推送更改到远程仓库: ${remote}/${branch}`, { service: 'git-push-mcp' });
      
      // 如果没有指定分支，获取当前分支
      if (!branch) {
        const status = await this.getStatus();
        branch = status.data?.current || 'master';
      }
      
      const result = await this.git.push(remote, branch);
      
      return {
        success: true,
        pushed: true,
        data: result,
        message: `成功推送到 ${remote}/${branch}`
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
   * 初始化仓库
   */
  async initializeRepository() {
    try {
      // 检查是否已有仓库
      const repoCheck = await this.checkRepository();
      if (repoCheck.isRepository) {
        return {
          success: true,
          message: '仓库已存在'
        };
      }
      
      // 初始化新仓库
      await this.git.init();
      this.logger.info('仓库初始化成功', { service: 'git-push-mcp' });
      
      return {
        success: true,
        message: '仓库初始化成功'
      };
    } catch (error) {
      this.logger.error('仓库初始化失败', { 
        error: error?.message || '未知错误',
        service: 'git-push-mcp' 
      });
      return {
        success: false,
        error: error?.message || '仓库初始化失败'
      };
    }
  }
}

module.exports = { GitOperator };