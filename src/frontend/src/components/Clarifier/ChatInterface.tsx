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
  subExpectations?: Partial<Expectation>[];
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
  const [currentStage, setCurrentStage] = useState<'initial' | 'clarification' | 'industry' | 'summary' | 'confirmation' | 'semantic_analysis' | 'refinement' | 'examples'>('initial');
  const [currentExpectation, setCurrentExpectation] = useState<Partial<Expectation>>({
    id: `exp-${Date.now()}`,
    criteria: [],
    semanticTags: [],
    priority: 'medium',
    subExpectations: []
  });
  const [clarificationRound, setClarificationRound] = useState(0);
  const [semanticAnalysisComplete, setSemanticAnalysisComplete] = useState(false);
  const [conversationContext, setConversationContext] = useState<{
    industry?: string;
    domain?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    detectedKeywords: string[];
    userPreferences: Record<string, string>;
    followUpQuestions: string[];
  }>({
    detectedKeywords: [],
    userPreferences: {},
    followUpQuestions: []
  });
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
    updateConversationContext(userInput);
    
    if (currentStage === 'initial') {
      setCurrentExpectation(prev => ({
        ...prev,
        title: userInput.split('.')[0] || userInput.substring(0, 30),
        description: userInput
      }));
      
      const complexity = analyzeComplexity(userInput);
      setConversationContext(prev => ({
        ...prev,
        complexity
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
      
      const maxRounds = conversationContext.complexity === 'complex' ? 4 : 
                        conversationContext.complexity === 'medium' ? 3 : 2;
      
      if (nextRound > maxRounds) {
        if (shouldAskForExamples(conversationContext)) {
          setCurrentStage('examples');
          setTimeout(() => {
            const examplesQuestion = "您能否提供一些具体的使用场景或用例，帮助我更好地理解这个需求在实际应用中的表现？";
            addSystemMessage(examplesQuestion, 'question');
          }, 1500);
        } else {
          setCurrentStage('industry');
          setTimeout(() => {
            const industryQuestion = "为了更好地理解您的需求，您能否分享一下类似行业中的设计或系统，作为参考或灵感来源？";
            addSystemMessage(industryQuestion, 'question');
          }, 1500);
        }
      } else {
        setTimeout(() => {
          const nextQuestion = generateClarificationQuestion(nextRound - 1);
          addSystemMessage(nextQuestion, 'question');
        }, 1500);
      }
    }
    else if (currentStage === 'examples') {
      const examples = userInput;
      
      const subExpectations = extractSubExpectations(examples);
      
      setCurrentExpectation(prev => ({
        ...prev,
        subExpectations: [...(prev.subExpectations || []), ...subExpectations]
      }));
      
      setCurrentStage('industry');
      setTimeout(() => {
        const industryQuestion = "非常感谢您提供的示例。为了更好地理解您的需求，您能否分享一下类似行业中的设计或系统，作为参考或灵感来源？";
        addSystemMessage(industryQuestion, 'question');
      }, 1500);
    }
    else if (currentStage === 'industry') {
      setCurrentExpectation(prev => ({
        ...prev,
        industryExamples: userInput
      }));
      
      if (shouldEnterRefinementStage(conversationContext)) {
        setCurrentStage('refinement');
        setTimeout(() => {
          const refinementQuestion = generateRefinementQuestion(conversationContext);
          addSystemMessage(refinementQuestion, 'question');
        }, 1500);
      } else {
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
    }
    else if (currentStage === 'refinement') {
      const refinementAnswer = userInput;
      
      updateExpectationWithRefinement(refinementAnswer);
      
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
            priority: 'medium',
            subExpectations: []
          });
          setClarificationRound(0);
          setSemanticAnalysisComplete(false);
          setConversationContext({
            detectedKeywords: [],
            userPreferences: {},
            followUpQuestions: []
          });
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
  
  const analyzeComplexity = (text: string): 'simple' | 'medium' | 'complex' => {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?。！？]+/).filter(Boolean).length;
    const technicalTerms = ['架构', '微服务', 'API', '数据库', '安全', '性能', '扩展', '集成', '部署', '测试'].filter(term => text.includes(term)).length;
    
    let complexityScore = 0;
    
    if (wordCount > 100) complexityScore += 2;
    else if (wordCount > 50) complexityScore += 1;
    
    if (sentenceCount > 7) complexityScore += 2;
    else if (sentenceCount > 3) complexityScore += 1;
    
    complexityScore += technicalTerms;
    
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'medium';
    return 'simple';
  };
  
  const updateConversationContext = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();
    
    const industries = {
      '电商': ['电商', '购物', '商城', '订单', '支付', '物流', '商品'],
      '金融': ['金融', '银行', '支付', '交易', '投资', '风控', '合规'],
      '医疗': ['医疗', '健康', '患者', '医院', '诊所', '医生', '病历'],
      '教育': ['教育', '学习', '课程', '学生', '教师', '培训', '考试'],
      '企业': ['企业', '公司', '业务', '流程', '部门', '员工', '管理']
    };
    
    let detectedIndustry = '';
    for (const [industry, keywords] of Object.entries(industries)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        detectedIndustry = industry;
        break;
      }
    }
    
    const domains = {
      '前端': ['界面', 'UI', '用户体验', '交互', '响应式', '前端'],
      '后端': ['服务器', 'API', '数据处理', '后端', '业务逻辑'],
      '数据': ['数据库', '存储', '分析', '报表', '大数据', 'BI'],
      '安全': ['安全', '认证', '授权', '加密', '隐私', '合规'],
      '移动': ['移动', 'APP', '手机', '平板', 'iOS', 'Android']
    };
    
    let detectedDomain = '';
    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        detectedDomain = domain;
        break;
      }
    }
    
    const keywordPatterns = [
      '高性能', '安全', '可扩展', '用户友好', '实时', '离线', '多语言',
      '响应式', '自动化', '智能', '集成', '微服务', '云原生', '容器化'
    ];
    
    const detectedKeywords = keywordPatterns.filter(keyword => lowerInput.includes(keyword));
    
    setConversationContext(prev => ({
      ...prev,
      industry: detectedIndustry || prev.industry,
      domain: detectedDomain || prev.domain,
      detectedKeywords: [...new Set([...prev.detectedKeywords, ...detectedKeywords])]
    }));
  };
  
  const shouldAskForExamples = (context: typeof conversationContext): boolean => {
    if (context.complexity === 'complex') return true;
    if (['电商', '金融', '医疗'].includes(context.industry || '')) return true;
    if (context.detectedKeywords.some(kw => ['微服务', '集成', '自动化', '智能'].includes(kw))) return true;
    
    return false;
  };
  
  const shouldEnterRefinementStage = (context: typeof conversationContext): boolean => {
    if (context.complexity === 'complex') return true;
    if (['安全', '数据'].includes(context.domain || '')) return true;
    if (context.detectedKeywords.length >= 3) return true;
    
    return false;
  };
  
  const generateRefinementQuestion = (context: typeof conversationContext): string => {
    if (context.domain === '安全') {
      if (context.complexity === 'complex') {
        return "关于安全需求，您能否详细说明需要符合哪些特定的安全标准或法规（如GDPR、ISO27001、等保2.0等）？以及您期望的安全级别、认证机制和数据加密策略？";
      } else {
        return "关于安全需求，您能否详细说明需要符合哪些特定的安全标准或法规？以及您期望的安全级别和具体的安全机制？";
      }
    }
    
    if (context.domain === '数据') {
      if (context.detectedKeywords.includes('大数据')) {
        return "关于大数据处理需求，您能否详细说明数据的来源、规模、处理频率，以及您期望的分析算法和可视化方式？您是否需要实时数据处理和预测分析功能？";
      } else if (context.complexity === 'complex') {
        return "关于数据处理需求，您能否详细说明数据的来源、规模、处理频率，以及对数据质量、一致性和完整性的要求？您是否需要数据治理和主数据管理功能？";
      } else {
        return "关于数据处理需求，您能否详细说明数据的来源、规模、处理频率，以及对数据质量和一致性的要求？";
      }
    }
    
    if (context.domain === '前端') {
      if (context.detectedKeywords.includes('移动')) {
        return "关于移动端用户界面，您期望支持哪些设备和操作系统？是否需要原生应用体验，或者响应式Web设计就足够了？您对离线功能有什么要求？";
      } else if (context.complexity === 'complex') {
        return "关于用户界面设计，您期望的品牌风格和交互模式是什么？系统需要支持哪些无障碍设计标准？您对动画和过渡效果有什么期望？";
      } else {
        return "关于用户界面设计，您能否详细描述您期望的视觉风格、交互方式和用户体验目标？";
      }
    }
    
    if (context.industry === '金融') {
      if (context.detectedKeywords.includes('风控')) {
        return "作为金融领域的风控系统，您需要哪些风险评估模型和监控机制？系统如何处理欺诈检测和异常交易？您对实时风险评估有什么要求？";
      } else if (context.complexity === 'complex') {
        return "作为金融领域的系统，您对交易处理、风险控制、合规报告和审计跟踪有什么特殊要求？系统需要支持哪些金融产品和服务？";
      } else {
        return "作为金融领域的系统，您对交易处理、风险控制和合规报告有什么特殊要求？";
      }
    }
    
    if (context.industry === '医疗') {
      if (context.detectedKeywords.includes('临床')) {
        return "作为医疗临床系统，您需要支持哪些临床工作流程和决策支持功能？系统如何与电子病历和医疗设备集成？您对临床数据标准有什么要求？";
      } else if (context.complexity === 'complex') {
        return "作为医疗领域的系统，您对患者数据隐私保护、医疗法规合规和互操作性有什么特殊要求？系统需要支持哪些医疗标准（如HL7、DICOM等）？";
      } else {
        return "作为医疗领域的系统，您对患者数据隐私保护和医疗法规合规有什么特殊要求？";
      }
    }
    
    if (context.industry === '电商') {
      if (context.detectedKeywords.includes('推荐')) {
        return "关于电商推荐系统，您期望基于哪些用户行为和属性进行个性化推荐？您对推荐算法的准确性和多样性有什么要求？如何评估推荐效果？";
      } else if (context.complexity === 'complex') {
        return "作为电商平台，您需要支持哪些支付方式、物流集成和库存管理功能？您对订单处理流程、促销机制和客户服务有什么特殊要求？";
      } else {
        return "作为电商平台，您需要支持哪些核心功能？例如商品管理、订单处理、支付集成和用户评价等。";
      }
    }
    
    if (context.industry === '教育') {
      if (context.detectedKeywords.includes('评估')) {
        return "关于教育评估系统，您需要支持哪些类型的评估（如形成性评估、总结性评估）？如何跟踪和分析学习进度？您对自动评分和反馈有什么要求？";
      } else if (context.complexity === 'complex') {
        return "作为教育平台，您需要支持哪些学习内容格式、互动方式和协作功能？系统如何适应不同的学习风格和特殊教育需求？";
      } else {
        return "作为教育平台，您需要支持哪些类型的学习内容和教学活动？您对学生进度跟踪和评估有什么要求？";
      }
    }
    
    if (context.detectedKeywords.includes('微服务')) {
      if (context.complexity === 'complex') {
        return "您提到了微服务架构，能否详细说明您对服务边界划分、服务发现、服务间通信和分布式事务的期望？您计划使用哪些服务网格或API网关技术？";
      } else {
        return "您提到了微服务架构，能否详细说明您对服务边界划分、服务发现和服务间通信的期望？";
      }
    }
    
    if (context.detectedKeywords.includes('人工智能') || context.detectedKeywords.includes('AI')) {
      if (context.complexity === 'complex') {
        return "您提到了AI功能，能否详细说明您期望AI解决什么具体问题？您有哪些训练数据或模型要求？系统需要支持哪些AI技术（如机器学习、深度学习、自然语言处理等）？";
      } else {
        return "您提到了AI功能，能否详细说明您期望AI解决什么具体问题？您有哪些训练数据或模型要求？";
      }
    }
    
    if (context.detectedKeywords.includes('物联网') || context.detectedKeywords.includes('IoT')) {
      if (context.complexity === 'complex') {
        return "您提到了物联网应用，能否详细说明需要连接的设备类型、数据收集频率和处理要求？您对边缘计算、设备管理和远程监控有什么期望？";
      } else {
        return "您提到了物联网应用，能否详细说明需要连接的设备类型、数据收集频率和处理要求？";
      }
    }
    
    if (context.detectedKeywords.includes('区块链')) {
      if (context.complexity === 'complex') {
        return "您提到了区块链技术，能否详细说明您期望通过区块链解决什么问题？您需要公链、联盟链还是私链？您对共识机制、智能合约和链上数据存储有什么要求？";
      } else {
        return "您提到了区块链技术，能否详细说明您期望通过区块链解决什么问题？是否需要公链、联盟链或私链？";
      }
    }
    
    if (context.complexity === 'complex') {
      return "基于您提供的详细信息，我想进一步了解一些关键细节。您对系统的性能指标、可用性要求、扩展性和国际化支持有什么具体的期望？您是否有特定的技术栈偏好或限制？";
    } else if (context.complexity === 'medium') {
      return "基于您提供的信息，我想进一步了解一些细节。您对系统的性能指标、可用性要求和扩展性有什么具体的期望？您有没有特定的技术偏好？";
    } else {
      return "基于您提供的信息，我想进一步了解一些基本细节。您对系统的主要功能和用户体验有什么具体的期望？";
    }
  };
  
  const extractSubExpectations = (examples: string): Partial<Expectation>[] => {
    const subExpectations: Partial<Expectation>[] = [];
    
    const sentences = examples.split(/[.!?。！？]+/).filter(Boolean);
    
    for (const sentence of sentences) {
      if (sentence.length < 10) continue; // 忽略过短的句子
      
      if (sentence.includes('功能') || sentence.includes('特性') || 
          sentence.includes('需要') || sentence.includes('应该')) {
        subExpectations.push({
          id: `sub-exp-${Date.now()}-${subExpectations.length}`,
          title: sentence.trim().substring(0, 30),
          description: sentence.trim(),
          criteria: []
        });
      }
    }
    
    return subExpectations;
  };
  
  const updateExpectationWithRefinement = (refinementAnswer: string) => {
    const lowerAnswer = refinementAnswer.toLowerCase();
    
    const preferencePatterns = [
      { pattern: /(高|强).*?(安全性|安全要求|安全标准)/g, key: '安全级别', value: '高' },
      { pattern: /(低|简单).*?(复杂度|复杂性)/g, key: '复杂度', value: '低' },
      { pattern: /(高|快).*?(性能|响应|速度)/g, key: '性能要求', value: '高' },
      { pattern: /(实时|即时|在线)/g, key: '处理模式', value: '实时' },
      { pattern: /(批量|定期|离线)/g, key: '处理模式', value: '批量' }
    ];
    
    const newPreferences: Record<string, string> = {};
    
    preferencePatterns.forEach(({ pattern, key, value }) => {
      if (pattern.test(lowerAnswer)) {
        newPreferences[key] = value;
      }
    });
    
    setConversationContext(prev => ({
      ...prev,
      userPreferences: { ...prev.userPreferences, ...newPreferences }
    }));
    
    const criteriaPatterns = [
      /必须(支持|实现|满足|符合)([^。，！？]+)/g,
      /需要(支持|实现|满足|符合)([^。，！？]+)/g,
      /应该(支持|实现|满足|符合)([^。，！？]+)/g
    ];
    
    const newCriteria: string[] = [];
    
    criteriaPatterns.forEach(pattern => {
      const matches = [...refinementAnswer.matchAll(pattern)];
      matches.forEach(match => {
        if (match[2] && match[2].trim().length > 0) {
          newCriteria.push(match[0].trim());
        }
      });
    });
    
    if (newCriteria.length > 0) {
      setCurrentExpectation(prev => ({
        ...prev,
        criteria: [...(prev.criteria || []), ...newCriteria]
      }));
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
    const { title, description, criteria, industryExamples, subExpectations } = expectation;
    const allText = `${title || ''} ${description || ''} ${criteria?.join(' ') || ''} ${industryExamples || ''}`;
    
    const subExpectationsText = subExpectations?.map(sub => 
      `${sub.title || ''} ${sub.description || ''} ${sub.criteria?.join(' ') || ''}`
    ).join(' ') || '';
    
    const fullText = `${allText} ${subExpectationsText}`;
    
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
        { pattern: /(高|大).*?(并发|流量|访问量|用户数)/g, tag: '高并发处理' },
        { pattern: /(高|强).*?(可用性|稳定性|可靠性)/g, tag: '高可用架构' },
        { pattern: /(快速|高效|低延迟).*?(响应|处理|加载)/g, tag: '高性能系统' },
        { pattern: /(水平|垂直|弹性).*?(扩展|扩容|伸缩)/g, tag: '可扩展架构' },
        { pattern: /(容错|故障恢复|灾备).*?(机制|能力|方案)/g, tag: '容错系统' },
        
        { pattern: /(多|不同).*?(角色|用户类型|权限级别)/g, tag: '多角色权限' },
        { pattern: /(第三方|外部|社交).*?(登录|认证|授权)/g, tag: '第三方认证' },
        { pattern: /(细粒度|精细|灵活).*?(权限|授权|访问控制)/g, tag: '细粒度权限' },
        { pattern: /(单点登录|SSO|统一认证)/g, tag: '单点登录' },
        { pattern: /(用户友好|易用|直观).*?(界面|交互|操作)/g, tag: '用户友好设计' },
        { pattern: /(个性化|定制|智能).*?(推荐|体验|设置)/g, tag: '个性化体验' },
        
        { pattern: /(云原生|云服务|云平台)/g, tag: '云原生架构' },
        { pattern: /(微服务|分布式).*?(架构|系统|设计)/g, tag: '微服务架构' },
        { pattern: /(移动|手机|平板).*?(应用|客户端|界面)/g, tag: '移动应用' },
        { pattern: /(多租户|租户隔离|SaaS)/g, tag: '多租户架构' },
        { pattern: /(事件驱动|消息队列|发布订阅)/g, tag: '事件驱动架构' },
        { pattern: /(机器学习|人工智能|智能算法)/g, tag: 'AI功能' },
        { pattern: /(离线工作|断网操作|本地优先)/g, tag: '离线优先' },
        { pattern: /(大规模|海量).*?(数据|用户|请求)/g, tag: '大规模处理' },
        { pattern: /(自动化|智能).*?(测试|部署|流程)/g, tag: '自动化流程' },
        
        { pattern: /(支付|交易|结算).*?(系统|平台|功能)/g, tag: '支付系统' },
        { pattern: /(电子商务|网上商城|购物平台)/g, tag: '电商平台' },
        { pattern: /(医疗|健康|患者).*?(系统|管理|记录)/g, tag: '医疗系统' },
        { pattern: /(教育|学习|培训).*?(平台|系统|工具)/g, tag: '教育平台' },
        { pattern: /(金融|银行|投资).*?(系统|服务|管理)/g, tag: '金融系统' },
        { pattern: /(社交|社区|互动).*?(平台|功能|网络)/g, tag: '社交平台' }
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
        { pattern: /(电子商务|网上商城|购物平台|订单管理|商品目录|购物车|商品详情|结算流程|促销活动|会员体系)/g, tag: '电子商务' },
        { pattern: /(金融服务|银行|支付系统|交易处理|风险控制|投资管理|理财产品|保险服务|信贷系统|资金管理|财务分析)/g, tag: '金融科技' },
        { pattern: /(医疗系统|患者管理|医院信息|临床决策|健康记录|医疗设备|诊断系统|处方管理|医疗保险|远程医疗|健康监测)/g, tag: '医疗健康' },
        { pattern: /(教育平台|学习管理|课程内容|学生评估|在线教育|教学工具|学习进度|考试系统|教学资源|学生档案|互动课堂)/g, tag: '教育科技' },
        { pattern: /(社交网络|用户互动|社区管理|内容分享|社交媒体|用户关系|好友系统|消息通知|动态流|个人主页|互动评论)/g, tag: '社交平台' },
        { pattern: /(企业管理|ERP系统|CRM系统|人力资源|供应链|库存管理|生产计划|销售管理|客户关系|业务流程|绩效考核)/g, tag: '企业系统' },
        { pattern: /(物流系统|配送管理|仓储管理|运输跟踪|订单履行|供应链优化|库存控制|路线规划|物流调度|货物追踪)/g, tag: '物流系统' },
        { pattern: /(内容管理|媒体平台|发布系统|编辑工具|内容分发|数字出版|内容审核|版权管理|多媒体处理|内容分析)/g, tag: '内容平台' },
        { pattern: /(物联网|智能设备|传感器网络|设备管理|数据采集|远程控制|智能家居|工业物联网|设备互联|边缘计算)/g, tag: '物联网' },
        { pattern: /(游戏平台|游戏开发|虚拟世界|游戏引擎|玩家管理|游戏道具|游戏场景|多人游戏|游戏数据|游戏社区)/g, tag: '游戏产业' }
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
    
    const contextualTags: string[] = [];
    if (conversationContext.industry) {
      switch (conversationContext.industry) {
        case '金融':
          contextualTags.push('金融科技');
          break;
        case '医疗':
          contextualTags.push('医疗健康');
          break;
        case '电商':
          contextualTags.push('电子商务');
          break;
        case '教育':
          contextualTags.push('教育科技');
          break;
        case '社交':
          contextualTags.push('社交平台');
          break;
        case '企业':
          contextualTags.push('企业系统');
          break;
      }
    }
    
    if (conversationContext.domain) {
      switch (conversationContext.domain) {
        case '微服务':
          contextualTags.push('微服务架构');
          break;
        case '人工智能':
        case 'AI':
          contextualTags.push('AI功能');
          break;
        case '物联网':
        case 'IoT':
          contextualTags.push('物联网');
          break;
        case '区块链':
          contextualTags.push('区块链技术');
          break;
        case '云原生':
          contextualTags.push('云原生架构');
          break;
      }
    }
    
    if (conversationContext.complexity === 'complex') {
      contextualTags.push('高复杂度');
    }
    
    let semanticTags = Array.from(new Set([...domainTags, ...keyPhraseTags, ...industryTags, ...contextualTags]));
    
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
      } else if (conversationContext.industry) {
        switch (conversationContext.industry) {
          case '金融':
            defaultTags = ['金融系统', '安全合规', '交易处理'];
            break;
          case '医疗':
            defaultTags = ['医疗系统', '患者管理', '健康数据'];
            break;
          case '电商':
            defaultTags = ['电商平台', '订单管理', '用户体验'];
            break;
          case '教育':
            defaultTags = ['教育平台', '学习管理', '内容交付'];
            break;
        }
      }
      
      const neededTags = 3 - semanticTags.length;
      semanticTags = [...semanticTags, ...defaultTags.slice(0, neededTags)];
    }
    
    const prioritizeTags = (tags: string[]): string[] => {
      const tagWeights: Record<string, number> = {};
      
      tags.forEach(tag => {
        tagWeights[tag] = 1;
        
        if (industryTags.includes(tag)) {
          tagWeights[tag] += 3;
        }
        
        if (contextualTags.includes(tag)) {
          tagWeights[tag] += 2;
        }
        
        if (keyPhraseTags.includes(tag)) {
          tagWeights[tag] += 2;
        }
        
        if (domainTags.includes(tag)) {
          tagWeights[tag] += 1.5;
        }
      });
      
      return tags.sort((a, b) => (tagWeights[b] || 0) - (tagWeights[a] || 0));
    };
    
    return prioritizeTags(semanticTags).slice(0, 7);
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
