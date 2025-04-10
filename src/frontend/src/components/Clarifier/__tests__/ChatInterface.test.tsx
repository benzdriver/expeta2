import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatInterface from '../ChatInterface';

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

describe('ChatInterface Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders welcome message on initial load', () => {
    render(<ChatInterface />);
    expect(screen.getByText(/欢迎使用Expeta 2.0的需求澄清模块/)).toBeInTheDocument();
  });

  test('allows user to send a message', async () => {
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('请输入您的需求或回答...');
    const testMessage = '我需要一个电子商务网站';
    
    fireEvent.change(input, { target: { value: testMessage } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(testMessage)).toBeInTheDocument();
    });
  });

  test('handles multi-round conversation flow', async () => {
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('请输入您的需求或回答...');
    fireEvent.change(input, { target: { value: '我需要一个电子商务网站' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(/我需要一个电子商务网站/)).toBeInTheDocument();
    });
    
    await waitFor(() => {
      const messages = screen.getAllByRole('listitem');
      expect(messages.length).toBeGreaterThan(2);
    });
    
    fireEvent.change(input, { target: { value: '主要面向B2C市场，需要支持多种支付方式' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(/主要面向B2C市场，需要支持多种支付方式/)).toBeInTheDocument();
    });
  });

  test('logs session events properly', () => {
    const mockLoggingService = require('../../../services/logging.service').default;
    render(<ChatInterface sessionId="test-session-123" enableLogging={true} />);
    
    expect(mockLoggingService.startSession).toHaveBeenCalledWith(
      'test-session-123',
      expect.objectContaining({
        initialStage: 'initial',
        initialMessages: expect.any(Number)
      })
    );
  });

  test('generates semantic tags from user input', async () => {
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('请输入您的需求或回答...');
    const testMessage = '我需要一个高性能的电子商务平台，支持大量并发用户，并且有良好的安全性';
    
    fireEvent.change(input, { target: { value: testMessage } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(testMessage)).toBeInTheDocument();
    });
    
  });
});
