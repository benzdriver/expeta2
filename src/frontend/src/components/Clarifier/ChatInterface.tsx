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
    
    const industrySpecificQuestions: Record<string, string[]> = {
      '电商': [
        "您的电商平台需要支持哪些支付方式？是否需要国际支付功能？",
        "您需要什么样的库存管理和订单处理系统？是否需要与物流系统集成？",
        "您的平台是否需要个性化推荐功能？基于什么样的用户行为数据？"
      ],
      '金融': [
        "您的金融系统需要符合哪些监管要求和合规标准？",
        "系统需要处理的交易类型和交易量是什么？有哪些风控要求？",
        "您需要什么样的报表和分析功能来满足业务和监管需求？"
      ],
      '医疗': [
        "您的医疗系统需要符合哪些数据隐私和安全标准（如HIPAA）？",
        "系统需要与哪些医疗设备或现有医疗信息系统集成？",
        "您需要什么样的患者数据管理和医疗记录功能？"
      ],
      '教育': [
        "您的教育平台需要支持哪些类型的学习内容和互动方式？",
        "系统需要什么样的学生进度跟踪和评估功能？",
        "您需要什么样的数据分析来评估学习效果和改进教学方法？"
      ],
      '企业': [
        "您的企业系统需要支持哪些业务流程和部门协作？",
        "系统需要与哪些现有企业软件（如ERP、CRM）集成？",
        "您需要什么样的报表和分析功能来支持业务决策？"
      ]
    };
    
    if (currentExpectation.description) {
      const description = currentExpectation.description.toLowerCase();
      
      const industryKeywords: Record<string, string[]> = {
        '电商': ['电商', '购物', '商城', '订单', '支付', '物流', '商品'],
        '金融': ['金融', '银行', '支付', '交易', '投资', '风控', '合规'],
        '医疗': ['医疗', '健康', '患者', '医院', '诊所', '医生', '病历'],
        '教育': ['教育', '学习', '课程', '学生', '教师', '培训', '考试'],
        '企业': ['企业', '公司', '业务', '流程', '部门', '员工', '管理']
      };
      
      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(keyword => description.includes(keyword))) {
          const industryQuestions = industrySpecificQuestions[industry];
          if (industryQuestions && round < industryQuestions.length) {
            return industryQuestions[round];
          }
        }
      }
      
      if (description.includes('安全') || description.includes('认证') || description.includes('授权') || description.includes('加密')) {
        if (round === 0) {
          return "您提到了安全相关的需求，能否详细说明您期望的安全级别和具体的安全机制？例如，是否需要加密、多因素认证或特定的合规要求？";
        } else if (round === 1) {
          return "关于用户认证和授权，您是否需要支持第三方登录（如Google、微信等）？您期望系统如何管理不同角色的权限？";
        } else if (round === 2) {
          return "您的系统是否需要符合特定的安全标准或法规（如GDPR、ISO27001等）？这会对系统架构产生什么影响？";
        } else if (round === 3) {
          return "您是否需要安全审计和监控功能？如何处理潜在的安全漏洞和威胁？";
        }
      }
      
      if (description.includes('性能') || description.includes('速度') || description.includes('响应') || description.includes('并发')) {
        if (round === 0) {
          return "您提到了性能方面的需求，能否具体说明您期望的性能指标？例如，响应时间、并发用户数或处理速度等。";
        } else if (round === 1) {
          return "您的系统预计会处理多大规模的数据？是否有特定的峰值时段需要考虑？";
        } else if (round === 2) {
          return "您对系统的可用性和容错性有什么要求？例如，是否需要高可用架构、灾难恢复策略等？";
        } else if (round === 3) {
          return "您是否需要性能监控和自动扩展功能？如何确定系统性能瓶颈并进行优化？";
        }
      }
      
      if (description.includes('用户体验') || description.includes('界面') || description.includes('交互') || description.includes('易用')) {
        if (round === 0) {
          return "您提到了用户体验方面的需求，能否详细描述您期望的用户界面和交互方式？有没有特定的设计风格或参考产品？";
        } else if (round === 1) {
          return "您的系统需要支持哪些设备和平台？是否需要响应式设计或原生应用？";
        } else if (round === 2) {
          return "您对系统的可访问性有什么要求？例如，是否需要支持残障人士使用，或者多语言支持？";
        } else if (round === 3) {
          return "您是否有用户研究或用户反馈机制的需求？如何收集和应用用户反馈来改进系统？";
        }
      }
      
      if (description.includes('数据') || description.includes('存储') || description.includes('分析') || description.includes('报表')) {
        if (round === 0) {
          return "您提到了数据相关的需求，能否详细说明您需要存储和处理的数据类型和规模？";
        } else if (round === 1) {
          return "您需要什么样的数据分析和报表功能？是否需要实时分析或定期报告？";
        } else if (round === 2) {
          return "您对数据备份、恢复和保留策略有什么要求？数据需要保存多长时间？";
        } else if (round === 3) {
          return "您是否需要数据治理和数据质量管理功能？如何确保数据的准确性和一致性？";
        }
      }
      
      if (description.includes('集成') || description.includes('接口') || description.includes('API') || description.includes('第三方')) {
        if (round === 0) {
          return "您提到了系统集成需求，能否详细说明需要与哪些系统集成，以及集成的方式和目的？";
        } else if (round === 1) {
          return "这些集成是实时的还是批量的？有没有特定的数据格式或协议要求？";
        } else if (round === 2) {
          return "您对集成的安全性和错误处理有什么要求？如何处理第三方系统不可用的情况？";
        } else if (round === 3) {
          return "您是否需要API管理和监控功能？如何跟踪和管理不同版本的API？";
        }
      }
      
      if (description.includes('流程') || description.includes('工作流') || description.includes('审批') || description.includes('自动化')) {
        if (round === 0) {
          return "您提到了业务流程相关需求，能否详细描述这些流程的步骤和参与者？";
        } else if (round === 1) {
          return "这些流程中是否有需要人工审批或干预的环节？如何处理异常情况？";
        } else if (round === 2) {
          return "您期望系统如何监控和报告这些流程的执行情况？是否需要流程优化建议？";
        } else if (round === 3) {
          return "您是否需要流程版本控制和变更管理功能？如何确保流程变更不会影响正在执行的实例？";
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
      
      if (allCriteria.includes('高性能') && allCriteria.includes('低成本') && round === 2) {
        return "您同时提到了高性能和低成本需求，这两者可能存在权衡。您能否详细说明哪些方面的性能是最关键的，以及在成本方面的具体限制？";
      }
      
      if (allCriteria.includes('简单') && allCriteria.includes('复杂') && round === 2) {
        return "您的回答中同时提到了简单性和复杂功能，能否澄清哪些方面需要保持简单，哪些功能可以更复杂？";
      }
      
      const domainTerms = [
        { term: '微服务', question: "您提到了微服务架构，能否详细说明您对服务边界划分和服务间通信的期望？" },
        { term: '区块链', question: "您提到了区块链技术，能否详细说明您期望通过区块链解决什么问题？是否需要公链、联盟链或私链？" },
        { term: '人工智能', question: "您提到了人工智能功能，能否详细说明您期望AI解决什么具体问题？您有哪些训练数据或模型要求？" },
        { term: '物联网', question: "您提到了物联网应用，能否详细说明需要连接的设备类型、数据收集频率和处理要求？" },
        { term: '大数据', question: "您提到了大数据处理需求，能否详细说明数据量级、数据来源和期望的分析结果？" }
      ];
      
      for (const { term, question } of domainTerms) {
        if (allCriteria.includes(term) && round === 2) {
          return question;
        }
      }
      
      if (currentExpectation.criteria.length >= 2) {
        const lastCriterion = currentExpectation.criteria[currentExpectation.criteria.length - 1].toLowerCase();
        const secondLastCriterion = currentExpectation.criteria[currentExpectation.criteria.length - 2].toLowerCase();
        
        if (lastCriterion.length < 50 && secondLastCriterion.length < 50 && round === 2) {
          return "您的回答比较简洁，能否更详细地描述您的需求和期望？特别是关于系统的关键功能和用户体验方面。";
        }
        
        if (lastCriterion.includes('，') && lastCriterion.includes('。') && lastCriterion.length > 100 && round === 2) {
          return "您提到了多个需求点，能否按照优先级对这些需求进行排序？哪些是必须实现的核心功能，哪些是可选的增强功能？";
        }
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
      '请', '您', '我们', '他们', '它', '这些', '那些', '一些', '所有', '任何', '每个', '以及',
      '但是', '因为', '所以', '如果', '当', '而且', '并且', '不', '没有', '很', '非常', '更加'
    ];
    
    const domainSpecificTags: Record<string, string[]> = {
      '安全': ['信息安全', '数据保护', '安全机制', '安全架构'],
      '认证': ['用户认证', '身份验证', '访问控制', '多因素认证'],
      '授权': ['权限管理', '角色授权', '访问控制', '细粒度权限'],
      '加密': ['数据加密', '端到端加密', '传输安全', '加密算法'],
      '隐私': ['隐私保护', '数据隐私', 'GDPR合规', '隐私设计'],
      '合规': ['法规遵从', '合规要求', '行业标准', '审计跟踪'],
      '风控': ['风险控制', '安全审计', '威胁检测', '漏洞管理'],
      
      '性能': ['高性能', '系统优化', '响应速度', '性能调优'],
      '并发': ['并发处理', '高并发', '负载均衡', '并发控制'],
      '可靠': ['系统可靠性', '容错机制', '故障恢复', '健壮性'],
      '可用': ['高可用性', '服务可用性', '冗余设计', '故障转移'],
      '扩展': ['可扩展性', '水平扩展', '垂直扩展', '弹性伸缩'],
      '监控': ['系统监控', '性能监控', '日志记录', '健康检查'],
      '缓存': ['数据缓存', '缓存策略', '分布式缓存', '缓存一致性'],
      
      '用户': ['用户体验', '用户管理', '用户交互', '用户旅程'],
      '界面': ['用户界面', 'UI设计', '交互设计', '视觉设计'],
      '交互': ['人机交互', '用户交互', '交互模式', '交互反馈'],
      '易用': ['易用性', '用户友好', '直观操作', '学习曲线'],
      '响应': ['响应式设计', '快速响应', '实时反馈', '交互响应'],
      '多语言': ['国际化', '本地化', '多语言支持', '文化适配'],
      '可访问': ['可访问性', '无障碍设计', '辅助功能', '普适设计'],
      '个性化': ['用户个性化', '定制体验', '偏好设置', '智能推荐'],
      
      '数据': ['数据管理', '数据处理', '数据分析', '数据架构'],
      '存储': ['数据存储', '持久化', '存储策略', '存储优化'],
      '备份': ['数据备份', '灾难恢复', '数据冗余', '备份策略'],
      '分析': ['数据分析', '商业智能', '预测分析', '数据挖掘'],
      '报表': ['数据可视化', '报表生成', '统计分析', '交互式报表'],
      '搜索': ['搜索功能', '信息检索', '全文搜索', '搜索优化'],
      '大数据': ['大数据处理', '数据湖', '数据仓库', '流处理'],
      
      '集成': ['系统集成', 'API集成', '第三方集成', '集成架构'],
      '接口': ['API设计', '接口规范', '服务接口', 'RESTful API'],
      '微服务': ['微服务架构', '服务编排', '服务网格', '服务发现'],
      '消息': ['消息队列', '事件驱动', '异步通信', '消息中间件'],
      '同步': ['数据同步', '实时同步', '状态同步', '双向同步'],
      
      '流程': ['业务流程', '工作流', '流程自动化', '流程优化'],
      '审批': ['审批流程', '审核机制', '多级审批', '审批追踪'],
      '自动化': ['流程自动化', '任务自动化', '智能自动化', 'RPA'],
      '规则': ['业务规则', '规则引擎', '决策系统', '规则管理'],
      
      '支付': ['支付处理', '交易系统', '金融安全', '支付网关'],
      '通知': ['消息通知', '提醒系统', '实时通信', '推送服务'],
      '移动': ['移动应用', '响应式设计', '跨平台', '移动优先'],
      '离线': ['离线功能', '本地存储', '同步机制', '断网恢复'],
      '社交': ['社交功能', '用户互动', '社区管理', '内容分享'],
      '电商': ['电子商务', '购物车', '订单管理', '商品目录'],
      '内容': ['内容管理', '富媒体', '版本控制', '内容分发'],
      
      '部署': ['系统部署', '云部署', '持续集成', '部署自动化'],
      '测试': ['自动化测试', '质量保证', '测试覆盖', '测试策略'],
      '架构': ['系统架构', '软件架构', '架构设计', '架构模式'],
      '模式': ['设计模式', '架构模式', '实现模式', '集成模式'],
      '云': ['云服务', '云原生', 'SaaS模型', '多云策略'],
      '容器': ['容器化', 'Docker', 'Kubernetes', '容器编排'],
      '前端': ['前端开发', 'UI框架', '客户端', '前端架构'],
      '后端': ['后端开发', '服务端', 'API服务', '后端架构']
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
        { pattern: /(移动|手机|平板).*?(应用|客户端|界面)/g, tag: '移动应用' },
        { pattern: /(多租户|租户隔离|SaaS)/g, tag: '多租户架构' },
        { pattern: /(事件驱动|消息队列|发布订阅)/g, tag: '事件驱动架构' },
        { pattern: /(机器学习|人工智能|智能算法)/g, tag: 'AI功能' },
        { pattern: /(离线工作|断网操作|本地优先)/g, tag: '离线优先' },
        { pattern: /(高并发|大流量|峰值处理)/g, tag: '高并发处理' }
      ];
      
      phrasePatterns.forEach(({ pattern, tag }) => {
        if (pattern.test(text)) {
          keyPhrases.push(tag);
        }
      });
      
      return keyPhrases;
    };
    
    const detectIndustry = (text: string): string[] => {
      const industries: string[] = [];
      
      const industryPatterns = [
        { pattern: /(电子商务|网上商城|购物平台|订单管理|商品目录|购物车)/g, tag: '电子商务' },
        { pattern: /(金融服务|银行|支付系统|交易处理|风险控制|投资管理)/g, tag: '金融科技' },
        { pattern: /(医疗系统|患者管理|医院信息|临床决策|健康记录|医疗设备)/g, tag: '医疗健康' },
        { pattern: /(教育平台|学习管理|课程内容|学生评估|在线教育|教学工具)/g, tag: '教育科技' },
        { pattern: /(社交网络|用户互动|社区管理|内容分享|社交媒体|用户关系)/g, tag: '社交平台' }
      ];
      
      industryPatterns.forEach(({ pattern, tag }) => {
        if (pattern.test(text)) {
          industries.push(tag);
        }
      });
      
      return industries;
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
          } else if (allText.includes('合规') || allText.includes('标准')) {
            bestTag = '安全合规';
          }
        } else if (keyword === '用户') {
          if (allText.includes('体验') || allText.includes('易用')) {
            bestTag = '用户体验';
          } else if (allText.includes('管理') || allText.includes('角色')) {
            bestTag = '用户管理';
          } else if (allText.includes('交互') || allText.includes('界面')) {
            bestTag = '用户交互';
          }
        } else if (keyword === '数据') {
          if (allText.includes('分析') || allText.includes('报表')) {
            bestTag = '数据分析';
          } else if (allText.includes('存储') || allText.includes('持久化')) {
            bestTag = '数据存储';
          } else if (allText.includes('安全') || allText.includes('保护')) {
            bestTag = '数据安全';
          }
        }
        
        domainTags.push(bestTag);
      }
    });
    
    const keyPhraseTags = analyzeKeyPhrases(allText);
    
    const industryTags = detectIndustry(allText);
    
    let semanticTags = Array.from(new Set([...domainTags, ...keyPhraseTags, ...industryTags]));
    
    const remainingSlots = 5 - semanticTags.length;
    if (remainingSlots > 0) {
      const wordFrequency: Record<string, number> = {};
      filteredWords.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
      
      const sortedWords = uniqueWords.sort((a, b) => (wordFrequency[b] || 0) - (wordFrequency[a] || 0));
      semanticTags = [...semanticTags, ...sortedWords.slice(0, remainingSlots)];
    }
    
    if (semanticTags.length < 3 && title) {
      let defaultTags: string[] = ['系统开发', '软件需求', '功能实现'];
      
      if (title.includes('管理') || title.includes('系统')) {
        defaultTags = ['管理系统', '业务流程', '数据处理'];
      } else if (title.includes('平台') || title.includes('门户')) {
        defaultTags = ['应用平台', '用户服务', '集成系统'];
      } else if (title.includes('移动') || title.includes('应用')) {
        defaultTags = ['移动应用', '用户体验', '前端开发'];
      }
      
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
