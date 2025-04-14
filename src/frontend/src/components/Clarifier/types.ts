import type { Message } from '../../services/logging.service';

/**
 * 消息类型接口 - 重新导出从logging.service导入的Message接口
 */
export type { Message };

/**
 * 期望模型接口
 */
export interface Expectation {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  semanticTags?: string[];
  priority?: 'low' | 'medium' | 'high';
  industryExamples?: string;
  subExpectations?: Partial<Expectation>[];
}

/**
 * 会话状态类型
 */
export type ConversationStage = 
  | 'initial' 
  | 'clarification' 
  | 'industry' 
  | 'summary' 
  | 'confirmation' 
  | 'semantic_analysis' 
  | 'refinement' 
  | 'examples';

/**
 * 会话上下文接口
 */
export interface ConversationContext {
  industry?: string;
  domain?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  detectedKeywords: string[];
  userPreferences: Record<string, string>;
  followUpQuestions: string[];
}

/**
 * 聊天界面属性接口
 */
export interface ChatInterfaceProps {
  initialMessages?: Message[];
  onSendMessage?: (message: string) => void;
  onExpectationCreated?: (expectation: Expectation) => void;
  _onExpectationCreated?: (expectation: Expectation) => void;
  enableLogging?: boolean;
  sessionId?: string;
}
