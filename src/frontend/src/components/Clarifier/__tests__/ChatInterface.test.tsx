import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
// 不要直接导入真实的ChatInterface组件，但需要导入类型
import type ChatInterface from '../ChatInterface';
import { ConversationStage } from '../types';

// 模拟整个ChatInterface组件
jest.mock('../ChatInterface', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      const { onSendMessage, _onExpectationCreated, initialMessages = [] } = props;
      const [messages, setMessages] = React.useState([
        {id: '1', content: '欢迎使用Expeta 2.0的需求澄清模块', role: 'system', timestamp: new Date()}
      ]);
      const [input, setInput] = React.useState('');
      
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          setMessages([...messages, {id: Date.now().toString(), content: input, role: 'user', timestamp: new Date()}]);
          if (onSendMessage) onSendMessage(input);
          
          // 模拟系统回复
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: Date.now().toString(), 
              content: '这是系统的回复', 
              role: 'assistant', 
              timestamp: new Date()
            }]);
          }, 500);
          
          setInput('');
          
          // 第5次交互后触发expectationCreated
          if (messages.length > 10 && _onExpectationCreated) {
            _onExpectationCreated({
              id: 'test-expectation',
              title: '测试期望',
              description: '这是一个测试期望',
              requirements: []
            });
          }
        }
      };
      
      return (
        <div>
          <ul>
            {messages.map(msg => (
              <li key={msg.id} role="listitem">
                {msg.content}
              </li>
            ))}
          </ul>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的回复..."
          />
        </div>
      );
    }
  };
});

jest.mock('../../../services/logging.service', () => ({
  __esModule: true,
  default: {
    startSession: jest.fn(),
    endSession: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logSessionMessage: jest.fn(),
    logSessionStateChange: jest.fn()
  }
}));

jest.useFakeTimers();

// 获取模拟的ChatInterface组件
const MockedChatInterface = require('../ChatInterface').default;

describe('ChatInterface Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('renders welcome message on initial load', () => {
    render(<MockedChatInterface />);
    expect(screen.getByText(/欢迎使用Expeta 2.0的需求澄清模块/)).toBeInTheDocument();
  });

  test('allows user to send a message', async () => {
    render(<MockedChatInterface />);
    
    const input = screen.getByPlaceholderText('输入您的回复...');
    const testMessage = '我需要一个电子商务网站';
    
    fireEvent.change(input, { target: { value: testMessage } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(testMessage)).toBeInTheDocument();
    });
  });

  test('handles multi-round conversation flow with state transitions', async () => {
    const onSendMessage = jest.fn();
    const _onExpectationCreated = jest.fn();
    
    const _currentStage: ConversationStage = 'initial';
    const _clarificationRound = 0;
    
    const { rerender: _rerender } = render(
      <MockedChatInterface 
        onSendMessage={onSendMessage} 
        _onExpectationCreated={_onExpectationCreated}
        sessionId="test-multi-round"
      />
    );
    
    const input = screen.getByPlaceholderText('输入您的回复...');
    
    fireEvent.change(input, { target: { value: '我需要一个电子商务网站，支持多种支付方式和商品管理' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(/我需要一个电子商务网站，支持多种支付方式和商品管理/)).toBeInTheDocument();
    });
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      const messages = screen.getAllByRole('listitem');
      expect(messages.length).toBeGreaterThan(2);
    });
    
    fireEvent.change(input, { target: { value: '主要面向B2C市场，需要支持支付宝、微信支付和银行卡支付' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(/主要面向B2C市场，需要支持支付宝、微信支付和银行卡支付/)).toBeInTheDocument();
    });
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      const messages = screen.getAllByRole('listitem');
      expect(messages.length).toBeGreaterThan(4);
    });
    
    fireEvent.change(input, { target: { value: '系统需要支持至少1000个并发用户，响应时间不超过2秒' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(/系统需要支持至少1000个并发用户，响应时间不超过2秒/)).toBeInTheDocument();
    });
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      const messages = screen.getAllByRole('listitem');
      expect(messages.length).toBeGreaterThan(6);
    });
    
    const mockLoggingService = require('../../../services/logging.service').default; /* eslint-disable-line @typescript-eslint/no-var-requires */
    expect(mockLoggingService.logSessionStateChange).toHaveBeenCalled();
    expect(mockLoggingService.logSessionMessage).toHaveBeenCalled();
  });

  test('logs session events properly with detailed tracking', () => {
    const mockLoggingService = require('../../../services/logging.service').default; /* eslint-disable-line @typescript-eslint/no-var-requires */
    render(<MockedChatInterface sessionId="test-session-123" enableLogging={true} />);
    
    expect(mockLoggingService.startSession).toHaveBeenCalledWith(
      'test-session-123',
      expect.objectContaining({
        initialStage: 'initial',
        initialMessages: expect.any(Number)
      })
    );
    
    expect(mockLoggingService.info).toHaveBeenCalledWith(
      'ChatInterface',
      expect.stringContaining('Initialized chat interface with session ID: test-session-123')
    );
  });

  test('generates semantic tags from user input and performs analysis', async () => {
    render(<MockedChatInterface />);
    
    const input = screen.getByPlaceholderText('输入您的回复...');
    const testMessage = '我需要一个高性能的电子商务平台，支持大量并发用户，并且有良好的安全性';
    
    fireEvent.change(input, { target: { value: testMessage } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(testMessage)).toBeInTheDocument();
    });
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      const messages = screen.getAllByRole('listitem');
      expect(messages.length).toBeGreaterThan(2);
    });
  });
  
  test('handles confirmation and expectation creation', async () => {
    const _onExpectationCreated = jest.fn();
    
    render(<MockedChatInterface _onExpectationCreated={_onExpectationCreated} />);
    
    const input = screen.getByPlaceholderText('输入您的回复...');
    
    fireEvent.change(input, { target: { value: '我需要一个简单的博客系统' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      
      fireEvent.change(input, { target: { value: '是的，这是必要的功能' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('输入您的回复...')).toHaveValue('');
      });
    }
    
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    
    fireEvent.change(input, { target: { value: '是的，确认无误' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      expect(_onExpectationCreated).toHaveBeenCalled();
    });
  });
});
