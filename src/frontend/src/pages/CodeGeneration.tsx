import React, { useState, useEffect, useRef } from 'react';

interface _CodeGenerationOption {
  id: string;
  label: string;
  description: string;
}

interface _Framework {
  id: string;
  label: string;
  description: string;
  compatibleWith?: string[]; // 兼容的语言
}

interface _Architecture {
  id: string;
  label: string;
  description: string;
}

interface CodeTemplate {
  id: string;
  label: string;
  description: string;
  compatibleWith?: {
    languages?: string[];
    architectures?: string[];
    frameworks?: string[];
  };
  features?: string[];
  semanticTags?: string[];
  complexity?: 'simple' | 'medium' | 'complex';
}

interface GeneratedCode {
  id: string;
  expectationId: string;
  language: string;
  frameworks: string[];
  architecture: string[];
  template?: string;
  code: string;
  createdAt: Date;
  semanticTags?: string[];
  semanticContext?: {
    industry?: string;
    domain?: string;
    complexity?: string;
    priority?: string;
  };
  generationMetrics?: {
    semanticScore: number;
    qualityScore: number;
    performanceScore: number;
    securityScore: number;
  };
}

interface ExpectationDetail {
  id: string;
  title: string;
  description?: string;
  semanticTags?: string[];
}

const CodeGeneration: React.FC = () => {
  const [selectedExpectationId, setSelectedExpectationId] = useState<string>('user_management_system');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('typescript');
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedArchitecture, setSelectedArchitecture] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [codeQuality, setCodeQuality] = useState<number>(80);
  const [codeComments, setCodeComments] = useState<boolean>(true);
  const [semanticContext, setSemanticContext] = useState<{
    industry: string;
    domain: string;
    complexity: 'simple' | 'medium' | 'complex';
    priority: 'low' | 'medium' | 'high';
  }>({
    industry: '',
    domain: '',
    complexity: 'medium',
    priority: 'medium'
  });
  const [_showTemplateFeatures, setShowTemplateFeatures] = useState<boolean>(false);
  const [_selectedTemplateDetails, setSelectedTemplateDetails] = useState<CodeTemplate | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  
  const expectations: ExpectationDetail[] = [
    { 
      id: 'user_management_system', 
      title: '用户管理系统',
      description: '一个完整的用户管理系统，提供用户注册、认证、个人资料管理和权限控制。'
    },
    { 
      id: 'payment_processing', 
      title: '支付处理系统',
      description: '安全处理多种支付方式的交易，包括信用卡、电子钱包和银行转账。'
    },
    { 
      id: 'inventory_management', 
      title: '库存管理系统',
      description: '跟踪和管理产品库存，支持库存预警和自动补货功能。'
    },
    { 
      id: 'reporting_dashboard', 
      title: '报表仪表板',
      description: '生成和展示业务关键指标的可视化报表和图表。'
    }
  ];
  
  const languageOptions = [
    { id: 'typescript', label: 'TypeScript' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
    { id: 'csharp', label: 'C#' }
  ];
  
  const frameworkOptions = [
    { id: 'react', label: 'React', description: '用于构建用户界面的JavaScript库', compatibleWith: ['typescript', 'javascript'] },
    { id: 'angular', label: 'Angular', description: '由Google维护的TypeScript框架', compatibleWith: ['typescript'] },
    { id: 'vue', label: 'Vue.js', description: '渐进式JavaScript框架', compatibleWith: ['typescript', 'javascript'] },
    { id: 'express', label: 'Express', description: 'Node.js的Web应用框架', compatibleWith: ['typescript', 'javascript'] },
    { id: 'nestjs', label: 'NestJS', description: '用于构建高效、可靠的服务器端应用程序的框架', compatibleWith: ['typescript'] },
    { id: 'django', label: 'Django', description: 'Python高级Web框架，鼓励快速开发和简洁实用的设计', compatibleWith: ['python'] },
    { id: 'flask', label: 'Flask', description: 'Python轻量级Web应用框架', compatibleWith: ['python'] },
    { id: 'spring', label: 'Spring', description: 'Java应用程序开发框架和控制反转容器实现', compatibleWith: ['java'] },
    { id: 'dotnet', label: '.NET Core', description: '微软开发的跨平台开源框架', compatibleWith: ['csharp'] },
    { id: 'fastapi', label: 'FastAPI', description: '现代、快速的Python Web框架，基于标准Python类型提示', compatibleWith: ['python'] },
    { id: 'graphql', label: 'GraphQL', description: '用于API的查询语言和运行时', compatibleWith: ['typescript', 'javascript', 'java', 'python', 'csharp'] }
  ];
  
  const architectureOptions = [
    { id: 'mvc', label: 'MVC', description: '模型-视图-控制器架构' },
    { id: 'mvvm', label: 'MVVM', description: '模型-视图-视图模型架构' },
    { id: 'microservices', label: '微服务', description: '将应用程序构建为独立服务的集合' },
    { id: 'serverless', label: '无服务器', description: '构建和运行不需要管理服务器的应用程序' },
    { id: 'hexagonal', label: '六边形架构', description: '也称为端口和适配器架构，关注业务逻辑与外部系统的分离' },
    { id: 'cqrs', label: 'CQRS', description: '命令查询责任分离，将读取和更新操作分开' },
    { id: 'event_sourcing', label: '事件溯源', description: '通过事件序列捕获所有状态变化，而不是存储当前状态' },
    { id: 'clean', label: '清洁架构', description: '强调关注点分离和依赖规则，使系统更易于测试和维护' },
    { id: 'ddd', label: '领域驱动设计', description: '围绕业务领域概念和逻辑构建软件，强调领域模型和通用语言' },
    { id: 'onion', label: '洋葱架构', description: '类似于清洁架构，强调依赖指向核心领域，外层依赖内层' }
  ];
  
  const templateOptions: CodeTemplate[] = [
    { 
      id: 'standard', 
      label: '标准模板', 
      description: '基础代码结构，适用于大多数项目',
      features: ['基本错误处理', '标准注释', '常见设计模式'],
      complexity: 'medium',
      semanticTags: ['通用', '标准化']
    },
    { 
      id: 'enterprise', 
      label: '企业级模板', 
      description: '包含完整的错误处理、日志记录和性能优化',
      compatibleWith: {
        architectures: ['clean', 'hexagonal', 'ddd', 'onion'],
        frameworks: ['spring', 'nestjs', 'dotnet']
      },
      features: ['高级错误处理', '全面日志记录', '性能监控', '依赖注入', '事务管理'],
      complexity: 'complex',
      semanticTags: ['企业级', '可扩展', '高可用', '可维护']
    },
    { 
      id: 'minimal', 
      label: '最小化模板', 
      description: '简洁的代码结构，适用于原型开发和概念验证',
      features: ['最小依赖', '快速启动', '简化结构'],
      complexity: 'simple',
      semanticTags: ['原型', '概念验证', '轻量级']
    },
    { 
      id: 'security_focused', 
      label: '安全强化模板', 
      description: '包含额外的安全措施和最佳实践',
      compatibleWith: {
        languages: ['typescript', 'java', 'csharp'],
        frameworks: ['spring', 'nestjs', 'dotnet']
      },
      features: ['输入验证', '认证授权', '数据加密', 'CSRF保护', 'XSS防御', '安全日志'],
      complexity: 'complex',
      semanticTags: ['安全', '合规', '防御性编程']
    },
    {
      id: 'microservice',
      label: '微服务模板',
      description: '专为微服务架构设计的代码结构，包含服务发现、负载均衡等功能',
      compatibleWith: {
        architectures: ['microservices', 'hexagonal', 'clean'],
        frameworks: ['spring', 'nestjs', 'dotnet']
      },
      features: ['服务发现', '负载均衡', '断路器模式', '分布式追踪', '配置中心'],
      complexity: 'complex',
      semanticTags: ['微服务', '分布式', '弹性', '可扩展']
    },
    {
      id: 'event_driven',
      label: '事件驱动模板',
      description: '基于事件驱动架构的代码结构，适用于需要高度解耦的系统',
      compatibleWith: {
        architectures: ['event_sourcing', 'cqrs', 'microservices'],
        frameworks: ['spring', 'nestjs']
      },
      features: ['事件发布订阅', '事件存储', '事件处理器', '命令处理器', '查询处理器'],
      complexity: 'complex',
      semanticTags: ['事件驱动', '异步', '解耦', '可扩展']
    },
    {
      id: 'domain_driven',
      label: '领域驱动模板',
      description: '基于领域驱动设计的代码结构，适用于复杂业务领域',
      compatibleWith: {
        architectures: ['ddd', 'clean', 'hexagonal', 'onion'],
        frameworks: ['spring', 'nestjs', 'dotnet']
      },
      features: ['领域模型', '聚合根', '值对象', '领域事件', '仓储模式', '领域服务'],
      complexity: 'complex',
      semanticTags: ['领域驱动', '业务建模', '通用语言', '边界上下文']
    },
    {
      id: 'serverless',
      label: '无服务器模板',
      description: '为无服务器架构设计的代码结构，适用于基于云函数的应用',
      compatibleWith: {
        architectures: ['serverless'],
        languages: ['typescript', 'javascript', 'python']
      },
      features: ['函数即服务', '事件触发', '状态管理', '冷启动优化'],
      complexity: 'medium',
      semanticTags: ['无服务器', '云原生', '按需计算', '自动扩展']
    },
    {
      id: 'hybrid_cloud',
      label: '混合云模板',
      description: '支持跨云平台和本地部署的混合架构，提供统一的接口和部署策略',
      compatibleWith: {
        architectures: ['microservices', 'serverless', 'clean'],
        languages: ['typescript', 'java', 'python']
      },
      features: ['多云适配', '统一抽象层', '云资源管理', '混合部署', '跨环境数据同步'],
      complexity: 'complex',
      semanticTags: ['混合云', '多云', '云迁移', '云原生', '弹性架构']
    },
    {
      id: 'api_gateway',
      label: 'API网关模板',
      description: '专注于API管理、路由和安全的模板，适用于构建API网关和服务聚合层',
      compatibleWith: {
        architectures: ['microservices', 'serverless'],
        languages: ['typescript', 'java', 'python']
      },
      features: ['请求路由', 'API版本控制', '限流熔断', '请求转换', '认证授权', '缓存策略'],
      complexity: 'medium',
      semanticTags: ['API管理', '服务聚合', '边缘计算', '安全网关']
    }
  ];
  
  useEffect(() => {
    setIsCopied(false);
    
  }, [generatedCode]);
  
  const applySyntaxHighlighting = (code: string, language: string): string => {
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };
    
    const escapedCode = escapeHtml(code);
    let highlightedCode = '';
    
    if (language === 'typescript' || language === 'javascript') {
      highlightedCode = escapedCode
        .replace(/(\/\/.*)/g, '<span class="comment">$1</span>')
        .replace(/('.*?'|".*?")/g, '<span class="string">$1</span>')
        .replace(/\b(const|let|var|function|class|interface|type|enum|export|import|from|return|if|else|for|while|switch|case|break|continue|new|this|super|extends|implements|async|await)\b/g, 
          '<span class="keyword">$1</span>')
        .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="class-name">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    } else if (language === 'python') {
      highlightedCode = escapedCode
        .replace(/(#.*)/g, '<span class="comment">$1</span>')
        .replace(/('.*?'|".*?")/g, '<span class="string">$1</span>')
        .replace(/\b(def|class|import|from|as|return|if|elif|else|for|while|break|continue|with|try|except|finally|raise|assert|global|nonlocal|lambda|pass|yield)\b/g, 
          '<span class="keyword">$1</span>')
        .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="class-name">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    } else {
      highlightedCode = escapedCode;
    }
    
    return highlightedCode;
  };
  
  const handleFrameworkChange = (frameworkId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedFrameworks(prev => [...prev, frameworkId]);
    } else {
      setSelectedFrameworks(prev => prev.filter(id => id !== frameworkId));
    }
  };
  
  const isFrameworkCompatible = (frameworkId: string): boolean => {
    const framework = frameworkOptions.find(fw => fw.id === frameworkId);
    return framework?.compatibleWith?.includes(selectedLanguage) ?? true;
  };
  
  const handleArchitectureChange = (architectureId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedArchitecture(prev => [...prev, architectureId]);
    } else {
      setSelectedArchitecture(prev => prev.filter(id => id !== architectureId));
    }
  };
  
  const handleGenerateCode = () => {
    setIsGenerating(true);
    
    const currentExpectation = expectations.find(exp => exp.id === selectedExpectationId);
    const semanticTags = currentExpectation?.semanticTags || [];
    
    const determineSemanticContext = () => {
      let industry = semanticContext.industry;
      let domain = semanticContext.domain;
      let complexity = semanticContext.complexity;
      let priority = semanticContext.priority;
      
      if (!industry) {
        if (selectedExpectationId === 'user_management_system') {
          industry = '企业';
        } else if (selectedExpectationId === 'payment_processing') {
          industry = '金融';
        } else if (selectedExpectationId === 'inventory_management') {
          industry = '零售';
        } else if (selectedExpectationId === 'reporting_dashboard') {
          industry = '商业智能';
        } else if (selectedTemplate === 'hybrid_cloud') {
          industry = '企业';
        } else if (selectedTemplate === 'api_gateway') {
          industry = '技术服务';
        }
      }
      
      if (!domain) {
        if (selectedExpectationId === 'user_management_system') {
          domain = '身份认证';
        } else if (selectedExpectationId === 'payment_processing') {
          domain = '交易处理';
        } else if (selectedExpectationId === 'inventory_management') {
          domain = '库存管理';
        } else if (selectedExpectationId === 'reporting_dashboard') {
          domain = '数据可视化';
        }
      }
      
      if (complexity === 'medium' && !semanticContext.complexity) {
        if (selectedArchitecture.includes('microservices') || 
            selectedArchitecture.includes('event_sourcing') || 
            selectedArchitecture.includes('cqrs') ||
            selectedArchitecture.includes('ddd') ||
            selectedTemplate === 'hybrid_cloud') {
          complexity = 'complex';
        } else if (selectedArchitecture.includes('mvc') && selectedArchitecture.length === 1) {
          complexity = 'simple';
        }
      }
      
      if (priority === 'medium' && !semanticContext.priority) {
        if (selectedTemplate === 'enterprise' || 
            selectedTemplate === 'security_focused' ||
            selectedTemplate === 'api_gateway' ||
            codeQuality >= 90) {
          priority = 'high';
        } else if (selectedTemplate === 'minimal' || codeQuality <= 60) {
          priority = 'low';
        }
      }
      
      return { industry, domain, complexity, priority };
    };
    
    const calculateGenerationMetrics = () => {
      const baseQualityScore = codeQuality / 20; // 转换为0-5的范围
      
      let semanticScore = 3.0 + (semanticTags.length * 0.2);
      if (selectedArchitecture.includes('ddd') || selectedArchitecture.includes('clean')) {
        semanticScore += 1.0;
      }
      if (selectedTemplate === 'hybrid_cloud') {
        semanticScore += 0.8;
      }
      semanticScore = Math.min(5.0, semanticScore);
      
      let qualityScore = baseQualityScore;
      if (selectedTemplate === 'enterprise') {
        qualityScore += 0.5;
      }
      if (selectedTemplate === 'api_gateway') {
        qualityScore += 0.4;
      }
      qualityScore = Math.min(5.0, qualityScore);
      
      let performanceScore = 3.0;
      if (selectedArchitecture.includes('microservices')) {
        performanceScore += 0.7;
      }
      if (selectedTemplate === 'hybrid_cloud') {
        performanceScore += 0.6;
      }
      if (selectedFrameworks.includes('nestjs') || selectedFrameworks.includes('spring')) {
        performanceScore += 0.5;
      }
      performanceScore = Math.min(5.0, performanceScore);
      
      let securityScore = 3.0;
      if (selectedTemplate === 'security_focused') {
        securityScore += 1.5;
      }
      if (selectedTemplate === 'api_gateway') {
        securityScore += 1.2;
      }
      if (selectedLanguage === 'typescript' || selectedLanguage === 'java') {
        securityScore += 0.5;
      }
      securityScore = Math.min(5.0, securityScore);
      
      return {
        semanticScore,
        qualityScore,
        performanceScore,
        securityScore
      };
    };
    
    setTimeout(() => {
      const semanticContext = determineSemanticContext();
      const generationMetrics = calculateGenerationMetrics();
      
      const newGeneratedCode: GeneratedCode = {
        id: `code-${Date.now()}`,
        expectationId: selectedExpectationId,
        language: selectedLanguage,
        frameworks: selectedFrameworks,
        architecture: selectedArchitecture,
        template: selectedTemplate,
        code: generateSampleCode(
          selectedExpectationId, 
          selectedLanguage, 
          selectedFrameworks, 
          selectedArchitecture,
          selectedTemplate,
          codeQuality,
          codeComments
        ),
        semanticTags: semanticTags,
        semanticContext,
        generationMetrics,
        createdAt: new Date()
      };
      
      setGeneratedCode(newGeneratedCode);
      setIsGenerating(false);
    }, 2000);
  };
  
  const generateSampleCode = (
    expectationId: string, 
    language: string,
    frameworks: string[],
    architectures: string[],
    template?: string,
    codeQuality?: number,
    includeComments?: boolean
  ): string => {
    const getArchitectureComments = (architectures: string[], language: string): string => {
      let comments = '';
      const commentPrefix = language === 'python' ? '# ' : '// ';
      
      if (architectures.includes('hexagonal')) {
        comments += `${commentPrefix}使用六边形架构 (端口和适配器)\n`;
        comments += `${commentPrefix}- 领域逻辑位于核心层，完全独立于外部系统\n`;
        comments += `${commentPrefix}- 通过端口（接口）定义与外部系统的交互契约\n`;
        comments += `${commentPrefix}- 适配器实现端口接口，处理外部系统的具体交互\n`;
        comments += `${commentPrefix}- 依赖方向：外部 → 适配器 → 端口 → 领域模型\n\n`;
      }
      
      if (architectures.includes('cqrs')) {
        comments += `${commentPrefix}使用CQRS模式（命令查询责任分离）\n`;
        comments += `${commentPrefix}- 命令模型负责修改数据，处理业务逻辑和状态变更\n`;
        comments += `${commentPrefix}- 查询模型负责读取数据，优化为查询场景\n`;
        comments += `${commentPrefix}- 两个模型可以使用不同的数据存储和表示方式\n`;
        comments += `${commentPrefix}- 通过事件在命令模型和查询模型之间同步数据\n\n`;
      }
      
      if (architectures.includes('event_sourcing')) {
        comments += `${commentPrefix}使用事件溯源模式\n`;
        comments += `${commentPrefix}- 所有状态变化都作为事件序列存储，而非存储当前状态\n`;
        comments += `${commentPrefix}- 通过重放事件序列重建任意时间点的系统状态\n`;
        comments += `${commentPrefix}- 提供完整的审计跟踪和历史记录\n`;
        comments += `${commentPrefix}- 支持时间点回溯和基于事件的业务分析\n\n`;
      }
      
      if (architectures.includes('clean')) {
        comments += `${commentPrefix}使用清洁架构\n`;
        comments += `${commentPrefix}- 依赖规则：内层不依赖外层，依赖指向由外向内\n`;
        comments += `${commentPrefix}- 实体层：包含企业业务规则和核心领域模型\n`;
        comments += `${commentPrefix}- 用例层：包含应用业务规则和特定用例实现\n`;
        comments += `${commentPrefix}- 接口适配器层：转换数据格式，连接外部与内部\n`;
        comments += `${commentPrefix}- 框架和驱动层：处理与外部系统的具体交互\n\n`;
      }
      
      if (architectures.includes('microservices')) {
        comments += `${commentPrefix}使用微服务架构\n`;
        comments += `${commentPrefix}- 按业务能力划分为独立部署的服务\n`;
        comments += `${commentPrefix}- 服务间通过API或消息队列通信\n`;
        comments += `${commentPrefix}- 每个服务有自己的数据存储\n`;
        comments += `${commentPrefix}- 服务可以独立扩展和部署\n\n`;
      }
      
      if (architectures.includes('mvc')) {
        comments += `${commentPrefix}使用MVC架构模式\n`;
        comments += `${commentPrefix}- 模型(Model)：处理数据和业务逻辑\n`;
        comments += `${commentPrefix}- 视图(View)：负责数据展示和用户界面\n`;
        comments += `${commentPrefix}- 控制器(Controller)：处理用户输入并协调模型和视图\n\n`;
      }
      
      if (architectures.includes('serverless')) {
        comments += `${commentPrefix}使用无服务器架构\n`;
        comments += `${commentPrefix}- 函数即服务(FaaS)模式，按需执行和计费\n`;
        comments += `${commentPrefix}- 事件驱动的函数触发机制\n`;
        comments += `${commentPrefix}- 自动扩展，无需管理服务器基础设施\n`;
        comments += `${commentPrefix}- 冷启动优化和状态管理考虑\n\n`;
      }
      
      return comments;
    };
    
    const getTemplateCode = (
      baseCode: string, 
      template = 'standard', 
      quality = 80,
      includeComments = true
    ): string => {
      if (!includeComments) {
        baseCode = baseCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      }
      
      switch (template) {
        case 'enterprise':
          return baseCode.replace(
            /async\s+(\w+)\([^)]*\)\s*{/g, 
            `async $1($&) {
    try {
      console.log('[INFO] Entering $1 method');
      const startTime = performance.now();`
          ).replace(
            /return\s+([^;]+);(?!\s*})/g,
            `const result = $1;
      const endTime = performance.now();
      console.log(\`[INFO] Exiting $1 method. Execution time: \${endTime - startTime}ms\`);
      return result;`
          ).replace(
            /}\s*$/g,
            `    } catch (error) {
      console.error(\`[ERROR] Error in $1 method: \${error.message}\`);
      throw error;
    }
  }`
          );
          
        case 'security_focused':
          return baseCode.replace(
            /async\s+(\w+)\(([^)]*)\)\s*{/g,
            `async $1($2) {
    this.validateInput($2);
    await this.checkPermissions(context, '$1');`
          );
          
        case 'minimal':
          return baseCode
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/\n\s*\n/g, '\n');
        
        case 'hybrid_cloud':
          return baseCode.replace(
            /class\s+(\w+)/g,
            `/**
 * 混合云适配的$1类
 * 支持跨云平台和本地部署的统一接口
 */
@CloudProvider({
  providers: ['aws', 'azure', 'gcp', 'local'],
  autoDetect: true
})
class $1`
          ).replace(
            /async\s+(\w+)\(([^)]*)\)\s*{/g,
            `/**
   * $1 - 云平台无关的$1实现
   * @param {$2} - 输入参数
   * @returns 处理结果
   */
  @CloudAdaptive({
    retryPolicy: { maxRetries: 3, backoffFactor: 1.5 },
    fallbackStrategy: 'nearest-region'
  })
  async $1($2) {
    const provider = this.cloudContext.getCurrentProvider();
    const metrics = this.cloudContext.getMetricsCollector();
    
    metrics.startOperation('$1');`
          ).replace(
            /return\s+([^;]+);(?!\s*})/g,
            `const result = $1;
    metrics.endOperation('$1');
    return this.cloudContext.adaptResult(result);`
          );
          
        case 'api_gateway':
          return baseCode.replace(
            /class\s+(\w+)/g,
            `/**
 * API网关 - $1
 * 处理API路由、版本控制、限流和认证
 */
@ApiGateway({
  basePath: '/api/v1',
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  authentication: ['jwt', 'apiKey']
})
class $1`
          ).replace(
            /async\s+(\w+)\(([^)]*)\)\s*{/g,
            `/**
   * $1 - API端点
   * @param {$2} - 请求参数
   * @returns API响应
   */
  @Endpoint({
    path: '/$1',
    method: 'POST',
    version: '1.0',
    deprecated: false,
    throttle: { burstLimit: 10, rateLimit: 5 }
  })
  async $1($2) {
    this.logger.info(\`API请求: $1 - \${JSON.stringify($2)}\`);
    this.metrics.incrementCounter('api.$1.calls');
    
    try {`
          ).replace(
            /return\s+([^;]+);(?!\s*})/g,
            `const result = $1;
      this.cache.set(\`$1:\${this.requestId}\`, result, 60);
      return this.transformer.formatResponse(result);`
          ).replace(
            /}\s*$/g,
            `    } catch (error) {
      this.logger.error(\`API错误: $1 - \${error.message}\`);
      this.metrics.incrementCounter('api.$1.errors');
      throw this.errorHandler.formatError(error);
    }
  }`
          );
            
        default:
          if (quality >= 90) {
            return baseCode.replace(
              /async\s+(\w+)\(([^)]*)\)\s*{/g,
              `/**
   * $1 - 执行$1操作
   * @param {$2} - 输入参数
   * @returns 处理结果
   */
  async $1($2) {
    if (!this.isValid($2)) {
      throw new Error('Invalid input parameters');
    }`
            );
          }
          return baseCode;
      }
    };

    const archComments = getArchitectureComments(architectures, language);
    let baseCode = '';
    
    if (expectationId === 'user_management_system') {
      if (language === 'typescript') {
        if (frameworks.includes('nestjs')) {
          baseCode = `${archComments}// 用户管理系统 - TypeScript + NestJS 实现
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<User> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}`;
        } else {
          baseCode = `// 用户管理系统 - TypeScript 实现
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

class UserService {
  private users: Map<string, User> = new Map();

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const newUser: User = {
      id,
      ...userData,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(id, newUser);
    return newUser;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | undefined> {
    const user = this.users.get(id);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export default UserService;`;
        }
      } else if (frameworks.includes('react')) {
        baseCode = `${archComments}// 用户管理系统 - React 实现`;
      } else {
        baseCode = `// ${expectationId} - ${language} 实现示例\n// 这里将根据选择的期望和语言生成相应的代码`;
      }
    } else if (expectationId === 'payment_processing') {
      if (language === 'typescript') {
        baseCode = `${archComments}// 支付处理系统 - TypeScript 实现`;
      } else {
        baseCode = `// ${expectationId} - ${language} 实现示例\n// 这里将根据选择的期望和语言生成相应的代码`;
      }
    } else {
      baseCode = `// ${expectationId} - ${language} 实现示例\n// 这里将根据选择的期望和语言生成相应的代码`;
    }
    
    return getTemplateCode(baseCode, template, codeQuality, includeComments);
  };
  
  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode.code)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => {
          /* eslint-disable-next-line no-console */
          console.error('Failed to copy code: ', err);
        });
    }
  };

  const handleDownloadCode = () => {
    if (!generatedCode) return;
    
    const expectation = expectations.find(exp => exp.id === generatedCode.expectationId);
    const fileName = `${expectation?.title || generatedCode.expectationId}_${generatedCode.language}`;
    const fileExtension = getFileExtension(generatedCode.language);
    
    const element = document.createElement('a');
    const file = new Blob([generatedCode.code], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${fileName}.${fileExtension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const getFileExtension = (language: string): string => {
    switch (language) {
      case 'typescript': return 'ts';
      case 'javascript': return 'js';
      case 'python': return 'py';
      case 'java': return 'java';
      case 'csharp': return 'cs';
      default: return 'txt';
    }
  };
  
  return (
    <div className="code-generation-page content-area">
      <div className="section-header">
        <h2>代码生成</h2>
        <div className="section-actions">
          <button className="secondary-button">
            <span className="material-symbols-rounded">history</span>
            <span>历史记录</span>
          </button>
        </div>
      </div>
      
      <div className="code-generation-container">
        <div className="code-options">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">生成选项</h3>
            </div>
            <div className="card-content">
              <div className="option-group">
                <label>选择期望</label>
                <select 
                  value={selectedExpectationId}
                  onChange={(e) => setSelectedExpectationId(e.target.value)}
                  className="select-input"
                >
                  {expectations.map(exp => (
                    <option key={exp.id} value={exp.id}>{exp.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="option-group">
                <label>编程语言</label>
                <div className="radio-options">
                  {languageOptions.map(option => (
                    <div key={option.id} className="radio-option">
                      <input 
                        type="radio" 
                        id={`lang-${option.id}`} 
                        name="language"
                        value={option.id}
                        checked={selectedLanguage === option.id}
                        onChange={() => setSelectedLanguage(option.id)}
                      />
                      <label htmlFor={`lang-${option.id}`}>{option.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="option-group">
                <label>框架选择</label>
                <div className="checkbox-options">
                  {frameworkOptions.map(option => (
                    <div key={option.id} className={`checkbox-option ${!isFrameworkCompatible(option.id) ? 'incompatible' : ''}`}>
                      <input 
                        type="checkbox" 
                        id={`framework-${option.id}`} 
                        name="frameworks"
                        value={option.id}
                        checked={selectedFrameworks.includes(option.id)}
                        onChange={(e) => handleFrameworkChange(option.id, e.target.checked)}
                        disabled={!isFrameworkCompatible(option.id)}
                      />
                      <label htmlFor={`framework-${option.id}`}>
                        <span className="option-label">{option.label}</span>
                        <span className="option-description">{option.description}</span>
                        {!isFrameworkCompatible(option.id) && (
                          <span className="compatibility-warning">与所选语言不兼容</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="option-group">
                <label>架构模式</label>
                <div className="checkbox-options">
                  {architectureOptions.map(option => (
                    <div key={option.id} className="checkbox-option">
                      <input 
                        type="checkbox" 
                        id={`arch-${option.id}`} 
                        name="architecture"
                        value={option.id}
                        checked={selectedArchitecture.includes(option.id)}
                        onChange={(e) => handleArchitectureChange(option.id, e.target.checked)}
                      />
                      <label htmlFor={`arch-${option.id}`}>
                        <span className="option-label">{option.label}</span>
                        <span className="option-description">{option.description}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="option-group">
                <label>代码模板</label>
                <div className="radio-options">
                  {templateOptions.map(option => (
                    <div key={option.id} className="radio-option">
                      <input 
                        type="radio" 
                        id={`template-${option.id}`} 
                        name="template"
                        value={option.id}
                        checked={selectedTemplate === option.id}
                        onChange={() => setSelectedTemplate(option.id)}
                      />
                      <label htmlFor={`template-${option.id}`}>
                        <span className="option-label">{option.label}</span>
                        <span className="option-description">{option.description}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="option-group">
                <button 
                  className="secondary-button toggle-advanced"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  <span className="material-symbols-rounded">
                    {showAdvancedOptions ? 'expand_less' : 'expand_more'}
                  </span>
                  <span>高级选项</span>
                </button>
                
                <button 
                  className="secondary-button template-info-button"
                  onClick={() => {
                    const template = templateOptions.find(t => t.id === selectedTemplate);
                    setSelectedTemplateDetails(template || null);
                    setShowTemplateFeatures(true);
                  }}
                >
                  <span className="material-symbols-rounded">info</span>
                  <span>模板详情</span>
                </button>
                
                {showAdvancedOptions && (
                  <div className="advanced-options">
                    <div className="slider-option">
                      <label>代码质量 ({codeQuality}%)</label>
                      <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        value={codeQuality}
                        onChange={(e) => setCodeQuality(parseInt(e.target.value))}
                        className="slider"
                      />
                      <div className="slider-labels">
                        <span>速度优先</span>
                        <span>质量优先</span>
                      </div>
                    </div>
                    
                    <div className="checkbox-option">
                      <input 
                        type="checkbox" 
                        id="code-comments" 
                        checked={codeComments}
                        onChange={(e) => setCodeComments(e.target.checked)}
                      />
                      <label htmlFor="code-comments">
                        <span className="option-label">生成详细注释</span>
                        <span className="option-description">包含详细的代码注释和文档</span>
                      </label>
                    </div>
                    
                    <div className="option-section">
                      <h4>语义上下文</h4>
                      <div className="option-row">
                        <div className="option-col">
                          <label>行业</label>
                          <select 
                            value={semanticContext.industry}
                            onChange={(e) => setSemanticContext({...semanticContext, industry: e.target.value})}
                            className="select-input"
                          >
                            <option value="">未指定</option>
                            <option value="电子商务">电子商务</option>
                            <option value="金融">金融</option>
                            <option value="医疗">医疗</option>
                            <option value="教育">教育</option>
                            <option value="制造">制造</option>
                            <option value="零售">零售</option>
                            <option value="物流">物流</option>
                            <option value="企业">企业</option>
                          </select>
                        </div>
                        <div className="option-col">
                          <label>领域</label>
                          <select 
                            value={semanticContext.domain}
                            onChange={(e) => setSemanticContext({...semanticContext, domain: e.target.value})}
                            className="select-input"
                          >
                            <option value="">未指定</option>
                            <option value="用户管理">用户管理</option>
                            <option value="支付处理">支付处理</option>
                            <option value="数据分析">数据分析</option>
                            <option value="内容管理">内容管理</option>
                            <option value="库存管理">库存管理</option>
                            <option value="客户关系">客户关系</option>
                            <option value="身份认证">身份认证</option>
                            <option value="数据可视化">数据可视化</option>
                          </select>
                        </div>
                      </div>
                      <div className="option-row">
                        <div className="option-col">
                          <label>复杂度</label>
                          <select 
                            value={semanticContext.complexity}
                            onChange={(e) => setSemanticContext({...semanticContext, complexity: e.target.value as any})}
                            className="select-input"
                          >
                            <option value="simple">简单</option>
                            <option value="medium">中等</option>
                            <option value="complex">复杂</option>
                          </select>
                        </div>
                        <div className="option-col">
                          <label>优先级</label>
                          <select 
                            value={semanticContext.priority}
                            onChange={(e) => setSemanticContext({...semanticContext, priority: e.target.value as any})}
                            className="select-input"
                          >
                            <option value="low">低</option>
                            <option value="medium">中</option>
                            <option value="high">高</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="option-actions">
                <button 
                  className="primary-button generate-button"
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="loading-spinner"></span>
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded">code</span>
                      <span>生成代码</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="code-preview">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">代码预览</h3>
              {generatedCode && (
                <div className="card-actions">
                  <button 
                    className="secondary-button"
                    onClick={handleCopyCode}
                  >
                    {isCopied ? (
                      <>
                        <span className="material-symbols-rounded">check</span>
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-rounded">content_copy</span>
                        <span>复制代码</span>
                      </>
                    )}
                  </button>
                  <button 
                    className="secondary-button"
                    onClick={handleDownloadCode}
                  >
                    <span className="material-symbols-rounded">download</span>
                    <span>下载代码</span>
                  </button>
                </div>
              )}
            </div>
            <div className="card-content">
              {generatedCode ? (
                <div className="code-container">
                  <div className="code-header">
                    <div className="code-language">
                      <span className="language-badge">{generatedCode.language}</span>
                      {generatedCode.frameworks.map(fw => (
                        <span key={fw} className="framework-badge">{fw}</span>
                      ))}
                      {generatedCode.template && (
                        <span className="template-badge">{
                          templateOptions.find(t => t.id === generatedCode.template)?.label || generatedCode.template
                        }</span>
                      )}
                    </div>
                    <div className="code-info">
                      <span className="code-timestamp">{generatedCode.createdAt.toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                  
                  {generatedCode.semanticTags && generatedCode.semanticTags.length > 0 && (
                    <div className="semantic-tags">
                      <div className="tags-label">语义标签:</div>
                      <div className="tags-container">
                        {generatedCode.semanticTags.map(tag => (
                          <span key={tag} className="semantic-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {generatedCode.generationMetrics && (
                    <div className="code-metrics">
                      <div className="metrics-header">
                        <span className="metrics-title">生成指标</span>
                        <span className="metrics-info">基于语义上下文和选择的选项计算</span>
                      </div>
                      <div className="metrics-container">
                        <div className="metric-item">
                          <div className="metric-label">语义匹配</div>
                          <div className="metric-bar">
                            <div 
                              className="metric-fill semantic-fill" 
                              style={{width: `${generatedCode.generationMetrics.semanticScore * 20}%`}}
                            ></div>
                          </div>
                          <div className="metric-value">{generatedCode.generationMetrics.semanticScore.toFixed(1)}</div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-label">代码质量</div>
                          <div className="metric-bar">
                            <div 
                              className="metric-fill quality-fill" 
                              style={{width: `${generatedCode.generationMetrics.qualityScore * 20}%`}}
                            ></div>
                          </div>
                          <div className="metric-value">{generatedCode.generationMetrics.qualityScore.toFixed(1)}</div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-label">性能优化</div>
                          <div className="metric-bar">
                            <div 
                              className="metric-fill performance-fill" 
                              style={{width: `${generatedCode.generationMetrics.performanceScore * 20}%`}}
                            ></div>
                          </div>
                          <div className="metric-value">{generatedCode.generationMetrics.performanceScore.toFixed(1)}</div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-label">安全评分</div>
                          <div className="metric-bar">
                            <div 
                              className="metric-fill security-fill" 
                              style={{width: `${generatedCode.generationMetrics.securityScore * 20}%`}}
                            ></div>
                          </div>
                          <div className="metric-value">{generatedCode.generationMetrics.securityScore.toFixed(1)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {generatedCode.semanticContext && (
                    <div className="semantic-context">
                      <div className="context-header">
                        <span className="context-title">语义上下文</span>
                      </div>
                      <div className="context-container">
                        {generatedCode.semanticContext.industry && (
                          <div className="context-item">
                            <span className="context-label">行业:</span>
                            <span className="context-value">{generatedCode.semanticContext.industry}</span>
                          </div>
                        )}
                        {generatedCode.semanticContext.domain && (
                          <div className="context-item">
                            <span className="context-label">领域:</span>
                            <span className="context-value">{generatedCode.semanticContext.domain}</span>
                          </div>
                        )}
                        {generatedCode.semanticContext.complexity && (
                          <div className="context-item">
                            <span className="context-label">复杂度:</span>
                            <span className="context-value">
                              {generatedCode.semanticContext.complexity === 'simple' ? '简单' : 
                               generatedCode.semanticContext.complexity === 'medium' ? '中等' : '复杂'}
                            </span>
                          </div>
                        )}
                        {generatedCode.semanticContext.priority && (
                          <div className="context-item">
                            <span className="context-label">优先级:</span>
                            <span className="context-value">
                              {generatedCode.semanticContext.priority === 'low' ? '低' : 
                               generatedCode.semanticContext.priority === 'medium' ? '中' : '高'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <pre ref={codeRef} className={`code-block language-${generatedCode.language}`}>
                    <code dangerouslySetInnerHTML={{ 
                      __html: applySyntaxHighlighting(generatedCode.code, generatedCode.language) 
                    }} />
                  </pre>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="material-symbols-rounded">code</span>
                  <p>选择期望和选项，然后点击&quot;生成代码&quot;按钮</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeGeneration;
