const { MCPHandler } = require('../lib/mcp-handler');
const { NaturalLanguageProcessor } = require('../lib/nlp-processor');
const { GitOperator } = require('../lib/git-operator');
const winston = require('winston');

// 创建测试用的logger
const testLogger = winston.createLogger({
  level: 'error',
  transports: [new winston.transports.Console()]
});

describe('MCPHandler', () => {
  let mcpHandler;
  let mockNlpProcessor;
  let mockGitOperator;

  beforeEach(() => {
    mockNlpProcessor = new NaturalLanguageProcessor();
    mockGitOperator = new GitOperator(testLogger);
    mcpHandler = new MCPHandler(mockNlpProcessor, mockGitOperator, testLogger);
  });

  describe('processRequest', () => {
    test('应该处理自然语言请求', async () => {
      // Mock repository check
      mockGitOperator.checkRepository = jest.fn().mockResolvedValue({
        success: true,
        isRepository: true
      });

      // Mock status check
      mockGitOperator.getStatus = jest.fn().mockResolvedValue({
        success: true,
        data: {
          isClean: true,
          modified: [],
          created: [],
          deleted: [],
          staged: []
        }
      });

      const request = {
        command: 'process_natural_language',
        text: '查看状态',
        context: {}
      };

      const result = await mcpHandler.processRequest(request);
      expect(result).toHaveProperty('success');
    });

    test('应该处理非Git仓库的情况', async () => {
      mockGitOperator.checkRepository = jest.fn().mockResolvedValue({
        success: false,
        isRepository: false,
        error: '不是Git仓库'
      });

      const request = {
        command: 'process_natural_language',
        text: '提交代码',
        context: {}
      };

      const result = await mcpHandler.processRequest(request);
      expect(result.success).toBe(false);
      expect(result.error).toBe('当前目录不是Git仓库');
    });

    test('应该处理不支持的命令', async () => {
      mockGitOperator.checkRepository = jest.fn().mockResolvedValue({
        success: true,
        isRepository: true
      });

      const request = {
        command: 'unsupported_command',
        text: 'some text'
      };

      const result = await mcpHandler.processRequest(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的命令');
    });
  });

  describe('getCapabilities', () => {
    test('应该返回正确的功能列表', () => {
      const result = mcpHandler.getCapabilities();
      expect(result.success).toBe(true);
      expect(result.capabilities).toHaveProperty('naturalLanguage');
      expect(result.capabilities).toHaveProperty('gitOperations');
      expect(result.capabilities).toHaveProperty('features');
      
      expect(Array.isArray(result.capabilities.gitOperations)).toBe(true);
      expect(Array.isArray(result.capabilities.features)).toBe(true);
    });
  });

  describe('executeAction', () => {
    test('应该执行特定的Git操作', async () => {
      mockGitOperator.getStatus = jest.fn().mockResolvedValue({
        success: true,
        data: { isClean: true }
      });

      const result = await mcpHandler.executeAction('status', {});
      expect(result).toHaveProperty('success');
    });

    test('应该处理不支持的操作', async () => {
      const result = await mcpHandler.executeAction('unsupported_action', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的操作');
    });
  });

  describe('handleStatus', () => {
    test('应该正确处理状态查询', async () => {
      mockGitOperator.getStatus = jest.fn().mockResolvedValue({
        success: true,
        data: {
          isClean: false,
          current: 'main',
          tracking: 'origin/main',
          modified: ['file1.js'],
          created: ['file2.js'],
          deleted: [],
          staged: [],
          not_added: ['file3.js']
        }
      });

      const parsedCommand = { command: 'status', message: '' };
      const result = await mcpHandler.handleStatus(parsedCommand, {});

      expect(result.success).toBe(true);
      expect(result.action).toBe('status');
      expect(result.details.isClean).toBe(false);
      expect(result.details.changes.modified).toBe(1);
    });
  });

  describe('handleCommit', () => {
    test('应该处理干净的工作区', async () => {
      mockGitOperator.getStatus = jest.fn().mockResolvedValue({
        success: true,
        data: { isClean: true }
      });

      const parsedCommand = { 
        command: 'commit', 
        message: 'test commit',
        commitType: 'feat'
      };

      const result = await mcpHandler.handleCommit(parsedCommand, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('没有需要提交的更改');
    });

    test('应该处理提交流程', async () => {
      mockGitOperator.getStatus = jest.fn().mockResolvedValue({
        success: true,
        data: {
          isClean: false,
          modified: ['test.js'],
          created: [],
          deleted: [],
          staged: []
        }
      });

      mockGitOperator.addFiles = jest.fn().mockResolvedValue({
        success: true
      });

      mockGitOperator.commit = jest.fn().mockResolvedValue({
        success: true,
        data: { commit: 'abc123' }
      });

      const parsedCommand = {
        command: 'commit',
        message: '添加测试功能',
        commitType: 'feat'
      };

      const result = await mcpHandler.handleCommit(parsedCommand, { autoStage: true });
      
      expect(result.success).toBe(true);
      expect(result.action).toBe('commit');
      expect(mockGitOperator.addFiles).toHaveBeenCalled();
      expect(mockGitOperator.commit).toHaveBeenCalled();
    });
  });
});