import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatInterface from '../ChatInterface';
import { ConversationStage } from '../types';
import loggingService from '../../../services/logging.service';

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

describe('ChatInterface Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('renders welcome message on initial load', () => {
    render(<ChatInterface />);
    expect(screen.getByText(/欢迎使用Expeta 2.0的需求澄清模块/)).toBeInTheDocument();
  });

  test('allows user to send a message', async () => {
    render(<ChatInterface />);
    
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
    const onExpectationCreated = jest.fn();
    
    const _currentStage: ConversationStage = 'initial';
    const _clarificationRound = 0;
    
    render(
      <ChatInterface 
        onSendMessage={onSendMessage} 
        onExpectationCreated={onExpectationCreated}
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
    
    const mockLoggingService = jest.mocked(loggingService);
    expect(mockLoggingService.logSessionStateChange).toHaveBeenCalled();
    expect(mockLoggingService.logSessionMessage).toHaveBeenCalled();
  });

  test('logs session events properly with detailed tracking', () => {
    const mockLoggingService = jest.mocked(loggingService);
    render(<ChatInterface sessionId="test-session-123" enableLogging={true} />);
    
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
    render(<ChatInterface />);
    
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
    const onExpectationCreated = jest.fn();
    
    render(<ChatInterface onExpectationCreated={onExpectationCreated} />);
    
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
        expect((input as HTMLInputElement).value).toBe('');
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
      expect(onExpectationCreated).toHaveBeenCalled();
    });
  });
});
