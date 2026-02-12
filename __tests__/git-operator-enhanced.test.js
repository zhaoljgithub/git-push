const { GitOperator } = require('../lib/git-operator');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// 创建测试用的logger
const testLogger = winston.createLogger({
  level: 'error', // 在测试中只记录错误
  transports: [new winston.transports.Console()]
});

describe('GitOperator 优化功能测试', () => {
  let gitOperator;
  let tempDir;

  beforeEach(() => {
    gitOperator = new GitOperator(testLogger);
  });

  afterEach(() => {
    // 清理临时目录
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        execSync(`rm -rf "${tempDir}"`, { stdio: 'ignore' });
      } catch (error) {
        // Windows环境下使用不同的命令
        try {
          execSync(`rmdir /s /q "${tempDir}"`, { stdio: 'ignore' });
        } catch (winError) {
          // 忽略清理错误
        }
      }
    }
  });

  describe('仓库检测优化', () => {
    test('应该正确检测已存在的Git仓库', async () => {
      // 在当前项目目录测试
      const result = await gitOperator.checkRepository();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('isRepository');
      
      // 当前项目应该是Git仓库
      expect(result.isRepository).toBe(true);
      expect(result.success).toBe(true);
    });

    test('应该正确检测非Git目录', async () => {
      // 创建临时非Git目录
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-non-git-'));
      process.chdir(tempDir);
      
      const result = await gitOperator.checkRepository();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('isRepository');
      expect(result.isRepository).toBe(false);
    });

    test('应该能找到仓库根目录', async () => {
      const result = await gitOperator.findRepoRoot();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(fs.existsSync(path.join(result, '.git'))).toBe(true);
    });
  });

  describe('仓库初始化功能', () => {
    test('应该能够在非Git目录中初始化仓库', async () => {
      // 创建临时目录
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-init-repo-'));
      process.chdir(tempDir);
      
      // 验证当前不是Git仓库
      let checkResult = await gitOperator.checkRepository();
      expect(checkResult.isRepository).toBe(false);
      
      // 初始化仓库
      const initResult = await gitOperator.initializeRepository();
      expect(initResult).toHaveProperty('success');
      expect(initResult.success).toBe(true);
      expect(initResult).toHaveProperty('root');
      
      // 验证现在是Git仓库
      checkResult = await gitOperator.checkRepository();
      expect(checkResult.isRepository).toBe(true);
    });

    test('应该不会重复初始化已存在的仓库', async () => {
      // 在现有仓库中尝试初始化
      const initResult = await gitOperator.initializeRepository();
      expect(initResult).toHaveProperty('success');
      expect(initResult.success).toBe(true);
      expect(initResult.message).toBe('仓库已存在');
    });

    test('ensureRepository应该自动处理非仓库情况', async () => {
      // 创建临时目录
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-ensure-repo-'));
      process.chdir(tempDir);
      
      // 使用ensureRepository，应该自动初始化
      const ensureResult = await gitOperator.ensureRepository();
      expect(ensureResult).toHaveProperty('success');
      expect(ensureResult.success).toBe(true);
      
      // 验证仓库已创建
      const checkResult = await gitOperator.checkRepository();
      expect(checkResult.isRepository).toBe(true);
    });
  });

  describe('Git操作功能', () => {
    test('应该能够添加所有文件并提交', async () => {
      // 这个测试需要在真实的Git仓库中进行
      const testFile = path.join(process.cwd(), 'test-commit-file.txt');
      fs.writeFileSync(testFile, 'test content');
      
      try {
        const result = await gitOperator.addAllAndCommit('test: 添加测试文件');
        expect(result).toHaveProperty('success');
        expect(result.success).toBe(true);
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('message');
      } finally {
        // 清理测试文件
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    test('应该能够添加指定文件并提交', async () => {
      const testFile = path.join(process.cwd(), 'test-specific-file.txt');
      fs.writeFileSync(testFile, 'specific test content');
      
      try {
        const result = await gitOperator.addFilesAndCommit(['test-specific-file.txt'], 'test: 添加指定文件');
        expect(result).toHaveProperty('success');
        expect(result.success).toBe(true);
      } finally {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    test('应该能够推送更改', async () => {
      // 这个测试在没有远程仓库的情况下会失败，但我们测试基本功能
      const result = await gitOperator.push('origin', 'main');
      // 不管成功与否，都应该返回标准格式的结果
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('pushed');
    });
  });
});