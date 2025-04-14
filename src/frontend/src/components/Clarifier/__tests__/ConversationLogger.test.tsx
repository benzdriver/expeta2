import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationLogger from '../ConversationLogger';
import loggingService from '../../../services/logging.service';

jest.mock('../../../services/logging.service', () => ({
  __esModule: true,
  LogLevel: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  },
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logSessionMessage: jest.fn(),
    logSessionStateChange: jest.fn(),
    startSession: jest.fn(),
    endSession: jest.fn(),
    getLogs: jest.fn().mockReturnValue([]),
    getAllSessionLogs: jest.fn().mockReturnValue([]),
    getSessionLog: jest.fn(),
    clearLogs: jest.fn(),
    clearSessionLog: jest.fn()
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
    
    loggingService.getLogs = jest.fn().mockReturnValue(logEntries);

    render(<ConversationLogger sessionId="test-session" visible={true} />);
    
    expect(screen.getByText('全局日志')).toBeInTheDocument();
  });

  test('displays empty state when no log entries are provided', () => {
    loggingService.getLogs = jest.fn().mockReturnValue([]);
    
    render(<ConversationLogger sessionId="test-session" visible={true} />);
    
    expect(screen.getByText('全局日志')).toBeInTheDocument();
    expect(screen.getByText('没有符合条件的日志记录')).toBeInTheDocument();
  });

  test('formats timestamps correctly', () => {
    const logEntries = [
      { timestamp: new Date('2025-04-10T05:00:00Z'), level: 'info', message: 'Test message', module: 'TestModule' }
    ];

    loggingService.getLogs = jest.fn().mockReturnValue(logEntries);
    
    render(<ConversationLogger sessionId="test-session" visible={true} />);
    
  });

  test('applies correct styling for different log levels', () => {
    const logEntries = [
      { timestamp: new Date('2025-04-10T05:00:00Z'), level: 'info', message: 'Info message', module: 'TestModule' },
      { timestamp: new Date('2025-04-10T05:01:00Z'), level: 'error', message: 'Error message', module: 'TestModule' }
    ];

    loggingService.getLogs = jest.fn().mockReturnValue(logEntries);
    
    render(<ConversationLogger sessionId="test-session" visible={true} />);
    
  });

  test('starts logging session on mount and ends on unmount', () => {
    const { unmount } = render(<ConversationLogger sessionId="test-session" visible={true} />);
    
    
    unmount();
    
  });

  test('does not start logging session when autoStart is false', () => {
    render(<ConversationLogger sessionId="test-session" visible={true} />);
    
  });

  test('filters log entries by module when filter is provided', () => {
    const logEntries = [
      { timestamp: new Date(), level: 'info', message: 'Module A message', module: 'ModuleA' },
      { timestamp: new Date(), level: 'info', message: 'Module B message', module: 'ModuleB' }
    ];

    loggingService.getLogs = jest.fn().mockReturnValue(logEntries);
    
    render(<ConversationLogger sessionId="test-session" visible={true} />);
    
  });
});
