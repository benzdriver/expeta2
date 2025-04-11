import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationLogger from '../ConversationLogger';
import loggingService from '../../../services/logging.service';

jest.mock('../../../services/logging.service', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logSessionMessage: jest.fn(),
    logSessionStateChange: jest.fn(),
    startSession: jest.fn(),
    endSession: jest.fn()
  }
}));

describe('ConversationLogger Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders conversation log entries correctly', () => {
    const logEntries = [
      { timestamp: new Date('2025-04-10T05:00:00Z'), level: 'info', message: 'Test info message', module: 'TestModule' },
      { timestamp: new Date('2025-04-10T05:01:00Z'), level: 'debug', message: 'Test debug message', module: 'TestModule' },
      { timestamp: new Date('2025-04-10T05:02:00Z'), level: 'warn', message: 'Test warning message', module: 'TestModule' },
      { timestamp: new Date('2025-04-10T05:03:00Z'), level: 'error', message: 'Test error message', module: 'TestModule' }
    ];

    render(<ConversationLogger logEntries={logEntries} sessionId="test-session" />);
    
    expect(screen.getByText('会话日志')).toBeInTheDocument();
    expect(screen.getByText('Test info message')).toBeInTheDocument();
    expect(screen.getByText('Test debug message')).toBeInTheDocument();
    expect(screen.getByText('Test warning message')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  test('displays empty state when no log entries are provided', () => {
    render(<ConversationLogger logEntries={[]} sessionId="test-session" />);
    
    expect(screen.getByText('会话日志')).toBeInTheDocument();
    expect(screen.getByText('暂无日志记录')).toBeInTheDocument();
  });

  test('formats timestamps correctly', () => {
    const logEntries = [
      { timestamp: new Date('2025-04-10T05:00:00Z'), level: 'info', message: 'Test message', module: 'TestModule' }
    ];

    render(<ConversationLogger logEntries={logEntries} sessionId="test-session" />);
    
    expect(screen.getByText(/05:00:00/)).toBeInTheDocument();
  });

  test('applies correct styling for different log levels', () => {
    const logEntries = [
      { timestamp: new Date('2025-04-10T05:00:00Z'), level: 'info', message: 'Info message', module: 'TestModule' },
      { timestamp: new Date('2025-04-10T05:01:00Z'), level: 'error', message: 'Error message', module: 'TestModule' }
    ];

    render(<ConversationLogger logEntries={logEntries} sessionId="test-session" />);
    
    const infoEntry = screen.getByText('Info message').closest('.log-entry');
    const errorEntry = screen.getByText('Error message').closest('.log-entry');
    
    expect(infoEntry).toHaveClass('info');
    expect(errorEntry).toHaveClass('error');
  });

  test('starts logging session on mount and ends on unmount', () => {
    const { unmount } = render(<ConversationLogger logEntries={[]} sessionId="test-session" autoStart={true} />);
    
    expect(loggingService.startSession).toHaveBeenCalledWith('test-session', expect.any(Object));
    
    unmount();
    
    expect(loggingService.endSession).toHaveBeenCalledWith('test-session');
  });

  test('does not start logging session when autoStart is false', () => {
    render(<ConversationLogger logEntries={[]} sessionId="test-session" autoStart={false} />);
    
    expect(loggingService.startSession).not.toHaveBeenCalled();
  });

  test('filters log entries by module when filter is provided', () => {
    const logEntries = [
      { timestamp: new Date(), level: 'info', message: 'Module A message', module: 'ModuleA' },
      { timestamp: new Date(), level: 'info', message: 'Module B message', module: 'ModuleB' }
    ];

    render(<ConversationLogger logEntries={logEntries} sessionId="test-session" moduleFilter="ModuleA" />);
    
    expect(screen.getByText('Module A message')).toBeInTheDocument();
    expect(screen.queryByText('Module B message')).not.toBeInTheDocument();
  });
});
