const { NaturalLanguageProcessor } = require('../lib/nlp-processor');

describe('NaturalLanguageProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new NaturalLanguageProcessor();
  });

  describe('parseCommand', () => {
    test('应该正确解析中文提交命令', () => {
      const result = processor.parseCommand('提交添加了新功能');
      expect(result.command).toBe('commit');
      expect(result.message).toBe('添加了新功能');
      expect(result.commitType).toBe('feat');
    });

    test('应该正确解析英文提交命令', () => {
      const result = processor.parseCommand('commit fix login bug');
      expect(result.command).toBe('commit');
      expect(result.message).toBe('fix login bug');
      expect(result.commitType).toBe('fix');
    });

    test('应该正确解析添加文件命令', () => {
      const result = processor.parseCommand('添加package.json');
      expect(result.command).toBe('add');
      expect(result.message).toBe('package.json');
    });

    test('应该正确解析状态查询命令', () => {
      const result = processor.parseCommand('查看状态');
      expect(result.command).toBe('status');
      expect(result.message).toBe('');
    });

    test('应该正确解析日志查询命令', () => {
      const result = processor.parseCommand('查看提交历史');
      expect(result.command).toBe('log');
      expect(result.message).toBe('');
    });

    test('应该处理无法识别的命令', () => {
      const result = processor.parseCommand('随便说点什么');
      expect(result.command).toBe('status'); // 默认返回状态查询
    });
  });

  describe('formatCommitMessage', () => {
    test('应该格式化约定式提交消息', () => {
      const parsedResult = {
        commitType: 'feat',
        message: '添加用户登录功能'
      };
      const result = processor.formatCommitMessage(parsedResult, true);
      expect(result).toBe('feat: 添加用户登录功能');
    });

    test('应该支持非约定式提交格式', () => {
      const parsedResult = {
        message: '普通提交消息'
      };
      const result = processor.formatCommitMessage(parsedResult, false);
      expect(result).toBe('普通提交消息');
    });
  });

  describe('detectCommitType', () => {
    test('应该检测feat类型', () => {
      expect(processor.detectCommitType('添加新功能')).toBe('feat');
      expect(processor.detectCommitType('implement new feature')).toBe('feat');
    });

    test('应该检测fix类型', () => {
      expect(processor.detectCommitType('修复bug')).toBe('fix');
      expect(processor.detectCommitType('fix authentication issue')).toBe('fix');
    });

    test('应该检测docs类型', () => {
      expect(processor.detectCommitType('更新文档')).toBe('docs');
      expect(processor.detectCommitType('update documentation')).toBe('docs');
    });

    test('默认返回feat类型', () => {
      expect(processor.detectCommitType('普通提交')).toBe('feat');
    });
  });

  describe('analyzeIntent', () => {
    test('应该分析提交意图', () => {
      const result = processor.analyzeIntent('提交所有更改');
      expect(result.action).toBe('commit');
      expect(result.target).toBe('all');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('应该分析查看意图', () => {
      const result = processor.analyzeIntent('查看文件状态');
      expect(result.action).toBe('view');
      expect(result.target).toBe('files');
    });
  });
});