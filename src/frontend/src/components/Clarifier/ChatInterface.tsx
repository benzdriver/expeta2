import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

interface Message {
  id: string;
  sender: 'user' | 'system';
  content: string;
  timestamp: Date;
  type?: 'question' | 'summary' | 'confirmation' | 'regular';
  expectationId?: string;
}

interface Expectation {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  semanticTags?: string[];
  priority?: 'low' | 'medium' | 'high';
  industryExamples?: string;
  subExpectations?: Expectation[];
}

interface ChatInterfaceProps {
  initialMessages?: Message[];
  onSendMessage?: (message: string) => void;
  onExpectationCreated?: (expectation: Expectation) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  initialMessages = [], 
  onSendMessage,
  onExpectationCreated
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages.length > 0 ? initialMessages : [
    {
      id: 'welcome-msg',
      sender: 'system',
      content: '欢迎使用Expeta 2.0的需求澄清模块。我是您的产品经理助手，将帮助您明确和细化您的软件需求。请告诉我您想要构建的系统或功能。',
      timestamp: new Date(),
      type: 'regular'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStage, setCurrentStage] = useState<'initial' | 'clarification' | 'industry' | 'summary' | 'confirmation' | 'semantic_analysis'>('initial');
  const [currentExpectation, setCurrentExpectation] = useState<Partial<Expectation>>({
    id: `exp-${Date.now()}`,
    criteria: [],
    semanticTags: [],
    priority: 'medium'
  });
  const [clarificationRound, setClarificationRound] = useState(0);
  const [semanticAnalysisComplete, setSemanticAnalysisComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    const newUserMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: inputValue,
      timestamp: new Date(),
      type: 'regular'
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsTyping(true);

    if (onSendMessage) {
      onSendMessage(inputValue);
    }

    processUserInput(inputValue);
  };

  const processUserInput = (userInput: string) => {
    if (currentStage === 'initial') {
      setCurrentExpectation(prev => ({
        ...prev,
        title: userInput.split('.')[0] || userInput.substring(0, 30),
        description: userInput
      }));
      
      setCurrentStage('clarification');
      
      setTimeout(() => {
        const clarificationQuestion = generateClarificationQuestion(0);
        addSystemMessage(clarificationQuestion, 'question');
        setClarificationRound(1);
      }, 1500);
    } 
    else if (currentStage === 'clarification') {
      setCurrentExpectation(prev => ({
        ...prev,
        criteria: [...(prev.criteria || []), userInput]
      }));
      
      const nextRound = clarificationRound + 1;
      setClarificationRound(nextRound);
      
      if (nextRound > 3) {
        setCurrentStage('industry');
        setTimeout(() => {
          const industryQuestion = "为了更好地理解您的需求，您能否分享一下类似行业中的设计或系统，作为参考或灵感来源？";
          addSystemMessage(industryQuestion, 'question');
        }, 1500);
      } else {
        setTimeout(() => {
          const nextQuestion = generateClarificationQuestion(nextRound - 1);
          addSystemMessage(nextQuestion, 'question');
        }, 1500);
      }
    }
    else if (currentStage === 'industry') {
      setCurrentExpectation(prev => ({
        ...prev,
        industryExamples: userInput
      }));
      
      setCurrentStage('semantic_analysis');
      
      setTimeout(() => {
        const analysisMessage = "正在进行语义分析，提取关键概念和语义标签...";
        addSystemMessage(analysisMessage, 'regular');
        
        setTimeout(() => {
          const semanticTags = extractSemanticTags(currentExpectation);
          
          setCurrentExpectation(prev => ({
            ...prev,
            semanticTags
          }));
          
          setSemanticAnalysisComplete(true);
          
          const analysisCompleteMessage = `语义分析完成。已识别以下关键概念：${semanticTags.join('、')}`;
          addSystemMessage(analysisCompleteMessage, 'regular');
          
          setCurrentStage('summary');
          
          setTimeout(() => {
            const summary = generateSummary();
            addSystemMessage(summary, 'summary');
            
            setTimeout(() => {
              const confirmationQuestion = "以上是我对您需求的理解总结。这是否准确反映了您的需求？如果有任何需要调整的地方，请告诉我。";
              addSystemMessage(confirmationQuestion, 'confirmation');
              setCurrentStage('confirmation');
            }, 1500);
          }, 1500);
        }, 3000);
      }, 1500);
    }
    else if (currentStage === 'confirmation') {
      const isConfirmed = userInput.toLowerCase().includes('是') || 
                         userInput.toLowerCase().includes('对') || 
                         userInput.toLowerCase().includes('正确') ||
                         userInput.toLowerCase().includes('确认');
      
      if (isConfirmed) {
        const priority = determinePriority(currentExpectation);
        setCurrentExpectation(prev => ({
          ...prev,
          priority
        }));
        
        const finalizedExpectation = currentExpectation as Expectation;
        
        if (onExpectationCreated) {
          onExpectationCreated(finalizedExpectation);
        }
        
        setTimeout(() => {
          const priorityText = priority === 'high' ? '高' : priority === 'medium' ? '中' : '低';
          const thankYouMessage = `非常感谢您的确认！我已经创建了这个期望模型，并将其优先级设置为"${priorityText}"。您可以在期望管理页面查看和编辑它。您是否想继续添加其他需求？`;
          addSystemMessage(thankYouMessage, 'regular');
          
          setCurrentStage('initial');
          setCurrentExpectation({
            id: `exp-${Date.now()}`,
            criteria: [],
            semanticTags: [],
            priority: 'medium'
          });
          setClarificationRound(0);
          setSemanticAnalysisComplete(false);
        }, 1500);
      } else {
        setTimeout(() => {
          const revisionMessage = "感谢您的反馈。请告诉我需要修改的具体部分，我会相应地更新期望模型。";
          addSystemMessage(revisionMessage, 'regular');
          
          setCurrentStage('clarification');
        }, 1500);
      }
    }
  };

  const addSystemMessage = (content: string, type: Message['type'] = 'regular') => {
    const systemMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'system',
      content,
      timestamp: new Date(),
      type,
      expectationId: currentExpectation.id
    };
    
    setMessages(prev => [...prev, systemMessage]);
    setIsTyping(false);
  };

  const generateClarificationQuestion = (round: number): string => {
    const clarificationQuestions = [
      "请描述一下这个系统的主要用户是谁？他们会如何使用这个系统？",
      "这个系统需要解决的最关键问题是什么？有哪些具体的痛点？",
      "您对系统的性能、安全性或可用性有什么特殊要求吗？",
      "您期望系统具备哪些关键功能或特性？请按优先级排序。",
      "您能否描述一下理想情况下，用户使用这个系统的完整流程？",
      "您的系统需要与哪些现有系统或第三方服务集成？",
      "您对系统的可扩展性和未来发展有什么考虑？",
      "您的组织有哪些特定的技术栈偏好或限制？"
    ];
    
    if (currentExpectation.description) {
      const description = currentExpectation.description.toLowerCase();
      
      if (description.includes('安全') || description.includes('认证') || description.includes('授权') || description.includes('加密')) {
        if (round === 0) {
          return "您提到了安全相关的需求，能否详细说明您期望的安全级别和具体的安全机制？例如，是否需要加密、多因素认证或特定的合规要求？";
        } else if (round === 1) {
          return "关于用户认证和授权，您是否需要支持第三方登录（如Google、微信等）？您期望系统如何管理不同角色的权限？";
        } else if (round === 2) {
          return "您的系统是否需要符合特定的安全标准或法规（如GDPR、ISO27001等）？这会对系统架构产生什么影响？";
        }
      }
      
      if (description.includes('性能') || description.includes('速度') || description.includes('响应') || description.includes('并发')) {
        if (round === 0) {
          return "您提到了性能方面的需求，能否具体说明您期望的性能指标？例如，响应时间、并发用户数或处理速度等。";
        } else if (round === 1) {
          return "您的系统预计会处理多大规模的数据？是否有特定的峰值时段需要考虑？";
        } else if (round === 2) {
          return "您对系统的可用性和容错性有什么要求？例如，是否需要高可用架构、灾难恢复策略等？";
        }
      }
      
      if (description.includes('用户体验') || description.includes('界面') || description.includes('交互') || description.includes('易用')) {
        if (round === 0) {
          return "您提到了用户体验方面的需求，能否详细描述您期望的用户界面和交互方式？有没有特定的设计风格或参考产品？";
        } else if (round === 1) {
          return "您的系统需要支持哪些设备和平台？是否需要响应式设计或原生应用？";
        } else if (round === 2) {
          return "您对系统的可访问性有什么要求？例如，是否需要支持残障人士使用，或者多语言支持？";
        }
      }
      
      if (description.includes('数据') || description.includes('存储') || description.includes('分析') || description.includes('报表')) {
        if (round === 0) {
          return "您提到了数据相关的需求，能否详细说明您需要存储和处理的数据类型和规模？";
        } else if (round === 1) {
          return "您需要什么样的数据分析和报表功能？是否需要实时分析或定期报告？";
        } else if (round === 2) {
          return "您对数据备份、恢复和保留策略有什么要求？数据需要保存多长时间？";
        }
      }
      
      if (description.includes('集成') || description.includes('接口') || description.includes('API') || description.includes('第三方')) {
        if (round === 0) {
          return "您提到了系统集成需求，能否详细说明需要与哪些系统集成，以及集成的方式和目的？";
        } else if (round === 1) {
          return "这些集成是实时的还是批量的？有没有特定的数据格式或协议要求？";
        } else if (round === 2) {
          return "您对集成的安全性和错误处理有什么要求？如何处理第三方系统不可用的情况？";
        }
      }
      
      if (description.includes('流程') || description.includes('工作流') || description.includes('审批') || description.includes('自动化')) {
        if (round === 0) {
          return "您提到了业务流程相关需求，能否详细描述这些流程的步骤和参与者？";
        } else if (round === 1) {
          return "这些流程中是否有需要人工审批或干预的环节？如何处理异常情况？";
        } else if (round === 2) {
          return "您期望系统如何监控和报告这些流程的执行情况？是否需要流程优化建议？";
        }
      }
    }
    
    if (currentExpectation.criteria && currentExpectation.criteria.length > 0) {
      const allCriteria = currentExpectation.criteria.join(' ').toLowerCase();
      
      if (allCriteria.includes('用户') && !allCriteria.includes('角色') && !allCriteria.includes('权限') && round === 2) {
        return "您提到了系统用户，能否详细说明系统需要支持哪些不同类型的用户角色，以及它们各自的权限和职责？";
      }
      
      if ((allCriteria.includes('数据') || allCriteria.includes('信息')) && 
          !allCriteria.includes('安全') && !allCriteria.includes('保护') && round === 2) {
        return "您提到了数据处理需求，对于这些数据的安全性和隐私保护，您有什么特殊要求或考虑？";
      }
      
      if (allCriteria.includes('功能') && !allCriteria.includes('可用性') && !allCriteria.includes('易用') && round === 2) {
        return "您已经描述了一些系统功能，对于这些功能的可用性和用户友好性，您有什么期望或标准？";
      }
    }
    
    return clarificationQuestions[round % clarificationQuestions.length];
  };

  const extractSemanticTags = (expectation: Partial<Expectation>): string[] => {
    const { title, description, criteria, industryExamples } = expectation;
    const allText = `${title || ''} ${description || ''} ${criteria?.join(' ') || ''} ${industryExamples || ''}`;
    
    const commonWords = [
      '的', '了', '和', '与', '或', '在', '是', '有', '这个', '那个', '如何', '什么', '为什么',
      '需要', '可以', '应该', '能够', '希望', '想要', '系统', '功能', '使用', '提供', '支持',
      '请', '您', '我们', '他们', '它', '这些', '那些', '一些', '所有', '任何', '每个'
    ];
    
    const domainSpecificTags: Record<string, string[]> = {
      '安全': ['信息安全', '数据保护', '安全机制'],
      '认证': ['用户认证', '身份验证', '访问控制'],
      '授权': ['权限管理', '角色授权', '访问控制'],
      '加密': ['数据加密', '端到端加密', '传输安全'],
      '隐私': ['隐私保护', '数据隐私', 'GDPR合规'],
      '合规': ['法规遵从', '合规要求', '行业标准'],
      
      '性能': ['高性能', '系统优化', '响应速度'],
      '并发': ['并发处理', '高并发', '负载均衡'],
      '可靠': ['系统可靠性', '容错机制', '故障恢复'],
      '可用': ['高可用性', '服务可用性', '冗余设计'],
      '扩展': ['可扩展性', '水平扩展', '垂直扩展'],
      '监控': ['系统监控', '性能监控', '日志记录'],
      
      '用户': ['用户体验', '用户管理', '用户交互'],
      '界面': ['用户界面', 'UI设计', '交互设计'],
      '交互': ['人机交互', '用户交互', '交互模式'],
      '易用': ['易用性', '用户友好', '直观操作'],
      '响应': ['响应式设计', '快速响应', '实时反馈'],
      '多语言': ['国际化', '本地化', '多语言支持'],
      '可访问': ['可访问性', '无障碍设计', '辅助功能'],
      
      '数据': ['数据管理', '数据处理', '数据分析'],
      '存储': ['数据存储', '持久化', '存储策略'],
      '备份': ['数据备份', '灾难恢复', '数据冗余'],
      '分析': ['数据分析', '商业智能', '预测分析'],
      '报表': ['数据可视化', '报表生成', '统计分析'],
      '搜索': ['搜索功能', '信息检索', '全文搜索'],
      '大数据': ['大数据处理', '数据湖', '数据仓库'],
      
      '集成': ['系统集成', 'API集成', '第三方集成'],
      '接口': ['API设计', '接口规范', '服务接口'],
      '微服务': ['微服务架构', '服务编排', '服务网格'],
      '消息': ['消息队列', '事件驱动', '异步通信'],
      '同步': ['数据同步', '实时同步', '状态同步'],
      
      '流程': ['业务流程', '工作流', '流程自动化'],
      '审批': ['审批流程', '审核机制', '多级审批'],
      '自动化': ['流程自动化', '任务自动化', '智能自动化'],
      '规则': ['业务规则', '规则引擎', '决策系统'],
      
      '支付': ['支付处理', '交易系统', '金融安全'],
      '通知': ['消息通知', '提醒系统', '实时通信'],
      '移动': ['移动应用', '响应式设计', '跨平台'],
      '离线': ['离线功能', '本地存储', '同步机制'],
      '社交': ['社交功能', '用户互动', '社区管理'],
      '电商': ['电子商务', '购物车', '订单管理'],
      '内容': ['内容管理', '富媒体', '版本控制'],
      
      '部署': ['系统部署', '云部署', '持续集成'],
      '测试': ['自动化测试', '质量保证', '测试覆盖'],
      '架构': ['系统架构', '软件架构', '架构设计'],
      '模式': ['设计模式', '架构模式', '实现模式'],
      '云': ['云服务', '云原生', 'SaaS模型'],
      '容器': ['容器化', 'Docker', 'Kubernetes'],
      '前端': ['前端开发', 'UI框架', '客户端'],
      '后端': ['后端开发', '服务端', 'API服务']
    };
    
    const analyzeKeyPhrases = (text: string): string[] => {
      const keyPhrases: string[] = [];
      
      const phrasePatterns = [
        { pattern: /(实时|在线|即时).*?(监控|分析|处理|通知)/g, tag: '实时处理' },
        { pattern: /(高|强).*?(安全性|安全要求|安全标准)/g, tag: '高安全性' },
        { pattern: /(多|不同).*?(角色|用户类型|权限级别)/g, tag: '多角色权限' },
        { pattern: /(第三方|外部).*?(登录|认证|授权)/g, tag: '第三方认证' },
        { pattern: /(响应式|自适应).*?(设计|界面|布局)/g, tag: '响应式设计' },
        { pattern: /(大规模|海量).*?(数据|用户|请求)/g, tag: '大规模处理' },
        { pattern: /(自动化|智能).*?(测试|部署|流程)/g, tag: '自动化流程' },
        { pattern: /(云原生|云服务|云平台)/g, tag: '云原生架构' },
        { pattern: /(微服务|分布式).*?(架构|系统|设计)/g, tag: '微服务架构' },
        { pattern: /(移动|手机|平板).*?(应用|客户端|界面)/g, tag: '移动应用' }
      ];
      
      phrasePatterns.forEach(({ pattern, tag }) => {
        if (pattern.test(text)) {
          keyPhrases.push(tag);
        }
      });
      
      return keyPhrases;
    };
    
    const words = allText.split(/\s+|[,.;，。；]/);
    const filteredWords = words
      .filter(word => word.length >= 2)
      .filter(word => !commonWords.includes(word))
      .map(word => word.trim())
      .filter(Boolean);
    
    const uniqueWords = Array.from(new Set(filteredWords));
    
    const domainTags: string[] = [];
    Object.entries(domainSpecificTags).forEach(([keyword, tags]) => {
      if (allText.includes(keyword)) {
        let bestTag = tags[0];
        
        if (keyword === '安全') {
          if (allText.includes('数据') && allText.includes('保护')) {
            bestTag = '数据保护';
          } else if (allText.includes('认证') || allText.includes('登录')) {
            bestTag = '安全认证';
          }
        } else if (keyword === '用户') {
          if (allText.includes('体验') || allText.includes('易用')) {
            bestTag = '用户体验';
          } else if (allText.includes('管理') || allText.includes('角色')) {
            bestTag = '用户管理';
          }
        }
        
        domainTags.push(bestTag);
      }
    });
    
    const keyPhraseTags = analyzeKeyPhrases(allText);
    
    let semanticTags = Array.from(new Set([...domainTags, ...keyPhraseTags]));
    
    const remainingSlots = 5 - semanticTags.length;
    if (remainingSlots > 0) {
      semanticTags = [...semanticTags, ...uniqueWords.slice(0, remainingSlots)];
    }
    
    if (semanticTags.length < 3 && title) {
      const defaultTags = ['系统开发', '软件需求', '功能实现'];
      const neededTags = 3 - semanticTags.length;
      semanticTags = [...semanticTags, ...defaultTags.slice(0, neededTags)];
    }
    
    return semanticTags.slice(0, 7);
  };
  
  const generateSummary = (): string => {
    const { title, description, criteria, semanticTags, priority } = currentExpectation;
    
    let summaryText = `## 需求总结：${title}\n\n`;
    summaryText += `**基本描述**：${description}\n\n`;
    summaryText += "**关键标准**：\n";
    
    criteria?.forEach((criterion, index) => {
      summaryText += `${index + 1}. ${criterion}\n`;
    });
    
    if (semanticTags && semanticTags.length > 0) {
      summaryText += `\n**语义标签**：${semanticTags.join('、')}\n`;
    }
    
    if (priority) {
      summaryText += `\n**优先级**：${
        priority === 'high' ? '高' : 
        priority === 'medium' ? '中' : '低'
      }\n`;
    }
    
    return summaryText;
  };

  const determinePriority = (expectation: Partial<Expectation>): 'low' | 'medium' | 'high' => {
    const { description, criteria, semanticTags } = expectation;
    const allText = `${description || ''} ${criteria?.join(' ') || ''}`;
    
    const highPriorityKeywords = [
      '紧急', '关键', '核心', '必须', '立即', '重要', '安全', '主要', '基础', 
      '不可或缺', '强制', '优先', '首要', '关键路径', '严格要求', '硬性指标'
    ];
    
    const lowPriorityKeywords = [
      '次要', '可选', '建议', '未来', '考虑', '如果可能', '额外', '增强', '改进',
      '非关键', '锦上添花', '长期', '远期', '后续版本', '有时间再做', '低风险'
    ];
    
    const highPriorityTags = [
      '信息安全', '数据保护', '用户认证', '身份验证', '访问控制', '权限管理',
      '核心功能', '基础架构', '关键业务', '主流程'
    ];
    
    let priorityScore = 0;
    
    highPriorityKeywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        priorityScore += 2;
      }
    });
    
    lowPriorityKeywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        priorityScore -= 2;
      }
    });
    
    semanticTags?.forEach(tag => {
      if (highPriorityTags.includes(tag)) {
        priorityScore += 1;
      }
    });
    
    if (criteria && criteria.length > 3) {
      priorityScore += 1; // 详细的标准通常表示更重要的需求
    }
    
    if (priorityScore >= 2) {
      return 'high';
    } else if (priorityScore <= -2) {
      return 'low';
    } else {
      return 'medium'; // 默认为中等优先级
    }
  };

  const formatTime = (date: Date): string => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'summary') {
      return (
        <div className="summary-content">
          {message.content.split('\n').map((line, index) => {
            if (line.startsWith('##')) {
              return <h3 key={index}>{line.replace('##', '').trim()}</h3>;
            } else if (line.startsWith('**') && line.endsWith('**')) {
              return <h4 key={index}>{line.replace(/\*\*/g, '').trim()}</h4>;
            } else if (line.match(/^\d+\./)) {
              return <li key={index}>{line.replace(/^\d+\./, '').trim()}</li>;
            } else if (line.trim() === '') {
              return <br key={index} />;
            } else {
              return <p key={index}>{line}</p>;
            }
          })}
        </div>
      );
    }
    
    return <p>{message.content}</p>;
  };

  return (
    <section className="chat-section">
      <div className="section-header">
        <h2>交互式澄清</h2>
        <div className="section-actions">
          <button className="secondary-button">
            <span className="material-symbols-rounded">history</span>
            <span>历史记录</span>
          </button>
          <button className="secondary-button">
            <span className="material-symbols-rounded">settings</span>
            <span>设置</span>
          </button>
        </div>
      </div>
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender === 'user' ? 'user-message' : 'system-message'} ${message.type ? `message-${message.type}` : ''}`}
            >
              <div className="message-content">
                {renderMessageContent(message)}
              </div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          ))}
          
          {isTyping && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <textarea 
            ref={textareaRef}
            placeholder="输入您的回复..." 
            rows={1}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <button className="send-button" onClick={handleSendMessage} disabled={isTyping}>
            <span className="material-symbols-rounded">send</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ChatInterface;
