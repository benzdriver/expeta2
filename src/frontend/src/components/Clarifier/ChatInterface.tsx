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
      "您能否描述一下理想情况下，用户使用这个系统的完整流程？"
    ];
    
    return clarificationQuestions[round % clarificationQuestions.length];
  };

  const extractSemanticTags = (expectation: Partial<Expectation>): string[] => {
    const { title, description, criteria, industryExamples } = expectation;
    const allText = `${title || ''} ${description || ''} ${criteria?.join(' ') || ''} ${industryExamples || ''}`;
    
    const commonWords = ['的', '了', '和', '与', '或', '在', '是', '有', '这个', '那个', '如何', '什么', '为什么'];
    const words = allText.split(/\s+|[,.;，。；]/);
    
    const filteredWords = words
      .filter(word => word.length >= 2)
      .filter(word => !commonWords.includes(word))
      .map(word => word.trim())
      .filter(Boolean);
    
    const uniqueWords = Array.from(new Set(filteredWords));
    const semanticTags = uniqueWords.slice(0, 5);
    
    if (semanticTags.length < 3 && title) {
      semanticTags.push('系统开发', '软件需求', '功能实现');
    }
    
    return semanticTags;
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
    const { description, criteria } = expectation;
    const allText = `${description || ''} ${criteria?.join(' ') || ''}`;
    
    const highPriorityKeywords = ['紧急', '关键', '核心', '必须', '立即', '重要', '安全', '主要', '基础'];
    
    const lowPriorityKeywords = ['次要', '可选', '建议', '未来', '考虑', '如果可能', '额外', '增强', '改进'];
    
    const containsHighPriority = highPriorityKeywords.some(keyword => 
      allText.includes(keyword)
    );
    
    const containsLowPriority = lowPriorityKeywords.some(keyword => 
      allText.includes(keyword)
    );
    
    if (containsHighPriority) {
      return 'high';
    } else if (containsLowPriority) {
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
