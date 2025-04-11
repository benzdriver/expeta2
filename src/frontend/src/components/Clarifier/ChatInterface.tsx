import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';
import type { Message } from '../../services/logging.service';
import type { Expectation, ConversationStage, ConversationContext, ChatInterfaceProps } from './types';

const loggingService = (() => {
  try {
    return require('../../services/logging.service').default;
  } catch (e) {
    console.error('Failed to load logging service:', e);
    return {
      startSession: () => {},
      endSession: () => {},
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {},
      logSessionMessage: () => {},
      logSessionStateChange: () => {}
    };
  }
})();

const ConversationLogger = React.lazy(() => import('./ConversationLogger'));

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  initialMessages = [], 
  onSendMessage,
  onExpectationCreated,
  enableLogging = true,
  sessionId = `session-${Date.now()}`
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
  const [currentStage, setCurrentStage] = useState<ConversationStage>('initial');
  const [currentExpectation, setCurrentExpectation] = useState<Partial<Expectation>>({
    id: `exp-${Date.now()}`,
    criteria: [],
    semanticTags: [],
    priority: 'medium',
    subExpectations: []
  });
  const [clarificationRound, setClarificationRound] = useState(0);
  const [semanticAnalysisComplete, setSemanticAnalysisComplete] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    detectedKeywords: [],
    userPreferences: {},
    followUpQuestions: []
  });
  const [showLogger, setShowLogger] = useState(false);
  const [requirementUnderstanding, setRequirementUnderstanding] = useState<string>('');
  const [showUnderstandingSummary, setShowUnderstandingSummary] = useState<boolean>(false);
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

    if (enableLogging) {
      try {
        loggingService.logSessionMessage(sessionId, newUserMessage);
        loggingService.logSessionStateChange(sessionId, currentStage, currentStage, {
          userInput: inputValue,
          clarificationRound
        });
      } catch (error) {
        console.error('Failed to log user message:', error);
      }
    }

    processUserInput(inputValue);
  };

  const processUserInput = (userInput: string) => {
    if (enableLogging) {
      try {
        loggingService.debug('ConversationFlow', '处理用户输入', {
          currentStage,
          inputLength: userInput.length,
          clarificationRound,
          timestamp: new Date().toISOString()
        });
        
        loggingService.info('ConversationFlow', `用户输入处理 - 阶段: ${currentStage}`, {
          stage: currentStage,
          clarificationRound,
          inputLength: userInput.length,
          expectationId: currentExpectation.id,
          sessionId,
          messageCount: messages.length,
          semanticAnalysisComplete,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to log user input processing:', error);
      }
    }
    
    updateConversationContext(userInput);
    
    // In a real implementation, this would call the backend API
    // For now, we'll simulate the backend response with a timeout
    setTimeout(() => {
      // Update clarification round
      const newRound = clarificationRound + 1;
      setClarificationRound(newRound);
      
      // Generate a simulated understanding based on user input
      const newUnderstanding = generateUnderstandingSummary(userInput, newRound);
      setRequirementUnderstanding(newUnderstanding);
      
      // Create system response with understanding summary
      const systemResponse: Message = {
        id: `msg-${Date.now()}`,
        sender: 'system',
        content: `感谢您的输入。基于我们的对话，我对您的需求理解如下：\n\n${newUnderstanding}\n\n这个理解是否准确？如果有任何需要修正或补充的地方，请告诉我。`,
        timestamp: new Date(),
        type: 'understanding_summary'
      };
      
      setMessages(prev => [...prev, systemResponse]);
      setIsTyping(false);
      setShowUnderstandingSummary(true);
      
      if (enableLogging) {
        try {
          loggingService.logSessionMessage(sessionId, systemResponse);
          loggingService.logSessionStateChange(sessionId, currentStage, 'clarifying', {
            clarificationRound: newRound,
            understandingSummaryGenerated: true,
            understandingLength: newUnderstanding.length
          });
        } catch (error) {
          console.error('Failed to log system response:', error);
        }
      }
      
      // Update conversation stage if needed
      if (currentStage === 'initial') {
        setCurrentStage('clarifying');
      }
    }, 1500);
  };

  const updateConversationContext = (userInput: string) => {
    // Extract keywords from user input
    const keywords = userInput.split(' ')
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase());
    
    // Update conversation context with new keywords
    setConversationContext(prev => ({
      ...prev,
      detectedKeywords: [...new Set([...prev.detectedKeywords, ...keywords])]
    }));
    
    if (enableLogging) {
      try {
        loggingService.debug('ConversationContext', '更新对话上下文', {
          newKeywords: keywords,
          totalKeywords: [...new Set([...conversationContext.detectedKeywords, ...keywords])].length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to log conversation context update:', error);
      }
    }
  };

  const generateUnderstandingSummary = (userInput: string, round: number): string => {
    // In a real implementation, this would come from the backend
    // For now, we'll generate a simple summary based on the input
    const complexity = analyzeComplexity(userInput);
    const industry = detectIndustryFromInput(userInput) || '未指定行业';
    
    // Generate a more detailed understanding summary based on the conversation round
    if (round === 1) {
      return `您需要一个${complexity === 'complex' ? '复杂的' : complexity === 'medium' ? '中等复杂度的' : '简单的'}软件系统，适用于${industry}领域。\n\n主要功能需求：\n- ${userInput.split('.')[0] || '需要进一步澄清'}\n\n我需要了解更多关于用户界面偏好、性能要求和安全性考虑的信息。`;
    } else {
      // For subsequent rounds, incorporate previous context
      const previousKeywords = conversationContext.detectedKeywords.slice(0, 5).join(', ');
      return `基于我们的对话，您需要一个${complexity === 'complex' ? '复杂的' : complexity === 'medium' ? '中等复杂度的' : '简单的'}软件系统，适用于${industry}领域。\n\n主要关注点：${previousKeywords}\n\n第${round}轮澄清后的理解：\n- ${userInput.split('.').slice(0, 2).join('.')}\n\n我们已经明确了基本需求，但仍需要讨论实现细节、集成需求和部署策略。`;
    }
  };

  const analyzeComplexity = (text: string): 'simple' | 'medium' | 'complex' => {
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 20) return 'simple';
    if (wordCount < 50) return 'medium';
    return 'complex';
  };

  const detectIndustryFromInput = (input: string): string | null => {
    const industries = [
      { name: '电子商务', keywords: ['电商', '购物', '商城', '支付', '订单'] },
      { name: '金融科技', keywords: ['金融', '银行', '支付', '投资', '理财'] },
      { name: '医疗健康', keywords: ['医疗', '健康', '医院', '患者', '诊断'] },
      { name: '教育科技', keywords: ['教育', '学习', '课程', '学生', '教师'] },
      { name: '企业服务', keywords: ['企业', '管理', '办公', 'CRM', 'ERP'] }
    ];
    
    const lowercaseInput = input.toLowerCase();
    for (const industry of industries) {
      if (industry.keywords.some(keyword => lowercaseInput.includes(keyword))) {
        return industry.name;
      }
    }
    
    return null;
  };

  const formatTime = (date: Date): string => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderMessageContent = (message: Message): JSX.Element => {
    if (message.type === 'understanding_summary') {
      return (
        <div className="understanding-summary">
          {message.content.split('\n\n').map((section, sectionIndex) => {
            if (sectionIndex === 1) {
              // This is the understanding summary section
              return (
                <div key={sectionIndex} className="understanding-details">
                  {section.split('\n').map((line, lineIndex) => {
                    if (line.startsWith('-')) {
                      return <li key={lineIndex} className="understanding-point">{line.substring(1).trim()}</li>;
                    } else {
                      return <p key={lineIndex}>{line}</p>;
                    }
                  })}
                </div>
              );
            } else {
              return <p key={sectionIndex}>{section}</p>;
            }
          })}
          <div className="understanding-actions">
            <button className="confirm-button" onClick={() => confirmUnderstanding(true)}>
              确认理解正确
            </button>
            <button className="edit-button" onClick={() => confirmUnderstanding(false)}>
              需要修正
            </button>
          </div>
        </div>
      );
    } else if (message.type === 'summary') {
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

  const confirmUnderstanding = (isCorrect: boolean) => {
    if (enableLogging) {
      try {
        loggingService.info('ConversationFlow', `用户${isCorrect ? '确认' : '修正'}理解`, {
          clarificationRound,
          isCorrect,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to log understanding confirmation:', error);
      }
    }
    
    if (isCorrect) {
      // If understanding is correct, proceed to next stage
      const confirmationMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        content: '理解正确，请继续。',
        timestamp: new Date(),
        type: 'confirmation'
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      
      // Simulate system response
      setTimeout(() => {
        const nextStageMessage: Message = {
          id: `msg-${Date.now()}`,
          sender: 'system',
          content: '非常感谢您的确认。现在我将提出一些更具体的问题，以便更好地理解您的需求细节。\n\n您对系统的用户界面有什么特定的偏好或要求吗？例如，您是否偏好现代简约风格，或者有特定的色彩方案？',
          timestamp: new Date(),
          type: 'regular'
        };
        
        setMessages(prev => [...prev, nextStageMessage]);
        
        if (enableLogging) {
          try {
            loggingService.logSessionMessage(sessionId, nextStageMessage);
          } catch (error) {
            console.error('Failed to log next stage message:', error);
          }
        }
      }, 1000);
    } else {
      // If understanding needs correction, prompt for more details
      const correctionPromptMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: 'system',
        content: '感谢您的反馈。请告诉我哪些部分需要修正或补充，以便我能更准确地理解您的需求。',
        timestamp: new Date(),
        type: 'regular'
      };
      
      setMessages(prev => [...prev, correctionPromptMessage]);
      
      if (enableLogging) {
        try {
          loggingService.logSessionMessage(sessionId, correctionPromptMessage);
        } catch (error) {
          console.error('Failed to log correction prompt message:', error);
        }
      }
    }
  };

  const toggleLogger = () => {
    setShowLogger(!showLogger);
  };

  return (
    <React.Fragment>
      {enableLogging && showLogger && (
        <React.Suspense fallback={<div>Loading logger...</div>}>
          <ConversationLogger sessionId={sessionId} visible={showLogger} onClose={toggleLogger} />
        </React.Suspense>
      )}
      
      <section className="chat-section">
        <div className="section-header">
          <h2>交互式澄清</h2>
          <div className="section-actions">
            <button className="secondary-button" onClick={toggleLogger}>
              <span className="material-symbols-rounded">monitoring</span>
              <span>日志</span>
            </button>
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
        <div className="conversation-status">
          <div className="status-item">
            <span className="status-label">当前阶段:</span>
            <span className="status-value">{
              currentStage === 'initial' ? '初始理解' :
              currentStage === 'clarifying' ? '需求澄清' :
              currentStage === 'refining' ? '细节完善' :
              currentStage === 'finalizing' ? '最终确认' : '未知'
            }</span>
          </div>
          <div className="status-item">
            <span className="status-label">澄清轮次:</span>
            <span className="status-value">{clarificationRound}</span>
          </div>
          <div className="status-item">
            <span className="status-label">会话ID:</span>
            <span className="status-value">{sessionId.substring(0, 8)}...</span>
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
    </React.Fragment>
  );
};

export default ChatInterface;
