const { GitOperator } = require('../lib/git-operator');
const winston = require('winston');

// 创建测试用的logger
const testLogger = winston.createLogger({
  level: 'error', // 在测试中只记录错误
  transports: [new winston.transports.Console()]
});

describe('GitOperator', () => {
  let gitOperator;

  beforeEach(() => {
    gitOperator = new GitOperator(testLogger);
  });

  describe('checkRepository', () => {
    test('应该检查是否为Git仓库', async () => {
      const result = await gitOperator.checkRepository();
      // 在测试环境中，这取决于当前目录是否为Git仓库
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('isRepository');
    });
  });

  describe('getStatus', () => {
    test('应该获取Git状态', async () => {
      const result = await gitOperator.getStatus();
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('modified');
        expect(result.data).toHaveProperty('created');
        expect(result.data).toHaveProperty('deleted');
        expect(result.data).toHaveProperty('staged');
        expect(result.data).toHaveProperty('not_added');
        expect(result.data).toHaveProperty('isClean');
      }
    });
  });

  describe('getRepoRoot', () => {
    test('应该获取仓库根目录', async () => {
      const result = await gitOperator.getRepoRoot();
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(typeof result.root).toBe('string');
      }
    });
  });

  // 注意：以下测试需要实际的Git操作环境
  describe('integration tests', () => {
    test('应该能够执行自定义命令', async () => {
      const result = await gitOperator.executeCustomCommand('version');
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(typeof result.data).toBe('string');
        expect(result.data).toContain('git version');
      }
    });

    test('应该处理无效命令', async () => {
      const result = await gitOperator.executeCustomCommand('invalid-command');
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
    });
  });
});