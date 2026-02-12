class NaturalLanguageProcessor {
  constructor() {
    // 定义命令模式映射
    this.patterns = {
      commit: [
        /(提交|commit)\s+(.+)/i,
        /把(.+)提交/i,
        /提交代码\s*(.*)/i,
        /push\s+(.+)/i,
        /发布\s+(.+)/i
      ],
      add: [
        /(添加|add)\s+(.+)/i,
        /把(.+)加到暂存区/i,
        /暂存\s+(.+)/i
      ],
      status: [
        /(状态|status)/i,
        /查看修改/i,
        /有什么变化/i,
        /检查状态/i
      ],
      log: [
        /(日志|log)/i,
        /提交历史/i,
        /查看提交记录/i,
        /历史记录/i
      ],
      diff: [
        /(差异|diff)/i,
        /查看改动/i,
        /比较变化/i,
        /改动详情/i
      ],
      branch: [
        /(分支|branch)/i,
        /切换分支/i,
        /新建分支/i
      ]
    };

    // 提交类型映射（支持约定式提交）
    this.commitTypes = {
      feat: ['新功能', 'feature', '功能'],
      fix: ['修复', 'bug', '修复bug'],
      docs: ['文档', 'document', '说明'],
      style: ['格式', '样式', 'style'],
      refactor: ['重构', 'refactor'],
      perf: ['性能', '优化', 'performance'],
      test: ['测试', 'test'],
      chore: ['杂项', '维护', 'chore']
    };
  }

  /**
   * 解析自然语言命令
   * @param {string} text - 用户输入的自然语言文本
   * @returns {Object} 解析结果
   */
  parseCommand(text) {
    const trimmedText = text.trim().toLowerCase();
    
    // 遍历所有命令模式
    for (const [command, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = trimmedText.match(pattern);
        if (match) {
          const message = this.extractMessage(match, trimmedText);
          const commitType = this.detectCommitType(trimmedText);
          
          return {
            command,
            message,
            commitType,
            originalText: text,
            confidence: this.calculateConfidence(command, match)
          };
        }
      }
    }

    // 智能解析未匹配的命令
    return this.smartParse(text);
  }

  /**
   * 从正则匹配结果中提取消息
   */
  extractMessage(match, originalText) {
    // 如果有捕获组，使用第一个非空的捕获组
    if (match.length > 1) {
      for (let i = 1; i < match.length; i++) {
        if (match[i] && match[i].trim()) {
          return match[i].trim();
        }
      }
    }
    
    // 否则从原文本中提取有意义的内容
    return this.extractMeaningfulContent(originalText);
  }

  /**
   * 提取有意义的内容
   */
  extractMeaningfulContent(text) {
    // 移除常见的命令词
    const cleaned = text
      .replace(/(提交|commit|添加|add|推送|push|发布)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || this.generateDefaultMessage();
  }

  /**
   * 检测提交类型
   */
  detectCommitType(text) {
    const lowerText = text.toLowerCase();
    
    for (const [type, keywords] of Object.entries(this.commitTypes)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return type;
      }
    }
    
    // 默认为普通提交
    return 'feat';
  }

  /**
   * 计算解析置信度
   */
  calculateConfidence(command, match) {
    // 基础置信度
    let confidence = 0.8;
    
    // 根据匹配的具体情况调整
    if (match[0] && match[0].length > 10) {
      confidence += 0.1; // 匹配内容较长，更可信
    }
    
    // 特定命令的置信度调整
    const confidenceAdjustments = {
      commit: 0.05,
      status: -0.1, // 状态查询相对简单，降低一点置信度
      log: -0.05
    };
    
    confidence += confidenceAdjustments[command] || 0;
    
    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * 智能解析未匹配的命令
   */
  smartParse(text) {
    const lowerText = text.toLowerCase();
    
    // 检查是否包含提交相关关键词
    const commitKeywords = ['提交', 'commit', '推送', 'push', '发布'];
    const hasCommitKeyword = commitKeywords.some(keyword => lowerText.includes(keyword));
    
    if (hasCommitKeyword) {
      const message = this.extractMeaningfulContent(text);
      const commitType = this.detectCommitType(text);
      
      return {
        command: 'commit',
        message,
        commitType,
        originalText: text,
        confidence: 0.7
      };
    }
    
    // 检查是否是询问状态
    const statusKeywords = ['状态', 'status', '变化', '修改', '检查'];
    const hasStatusKeyword = statusKeywords.some(keyword => lowerText.includes(keyword));
    
    if (hasStatusKeyword) {
      return {
        command: 'status',
        message: '',
        commitType: null,
        originalText: text,
        confidence: 0.6
      };
    }
    
    // 默认返回状态查询
    return {
      command: 'status',
      message: '',
      commitType: null,
      originalText: text,
      confidence: 0.3
    };
  }

  /**
   * 生成默认提交消息
   */
  generateDefaultMessage() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return `Auto commit at ${timeString}`;
  }

  /**
   * 格式化提交消息（支持约定式提交）
   */
  formatCommitMessage(parsedResult, useConventional = true) {
    if (!useConventional) {
      return parsedResult.message || this.generateDefaultMessage();
    }

    const type = parsedResult.commitType || 'feat';
    const message = parsedResult.message || this.generateDefaultMessage();
    
    // 简单的约定式提交格式
    return `${type}: ${message}`;
  }

  /**
   * 分析用户意图
   */
  analyzeIntent(text) {
    const analysis = {
      action: null,
      target: null,
      modifiers: [],
      confidence: 0
    };

    const lowerText = text.toLowerCase();

    // 识别动作
    if (lowerText.includes('提交') || lowerText.includes('commit')) {
      analysis.action = 'commit';
    } else if (lowerText.includes('添加') || lowerText.includes('add')) {
      analysis.action = 'add';
    } else if (lowerText.includes('查看') || lowerText.includes('check')) {
      analysis.action = 'view';
    }

    // 识别目标
    if (lowerText.includes('所有') || lowerText.includes('全部')) {
      analysis.target = 'all';
    } else if (lowerText.includes('文件')) {
      analysis.target = 'files';
    }

    // 识别修饰符
    if (lowerText.includes('自动')) {
      analysis.modifiers.push('auto');
    }
    if (lowerText.includes('强制')) {
      analysis.modifiers.push('force');
    }

    // 计算置信度
    analysis.confidence = 0.5 + (analysis.action ? 0.3 : 0) + (analysis.target ? 0.2 : 0);

    return analysis;
  }
}

module.exports = { NaturalLanguageProcessor };