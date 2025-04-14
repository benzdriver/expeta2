export interface Message {
  id: string;
  sender: 'user' | 'system';
  content: string;
  timestamp: Date;
  type?: 'question' | 'summary' | 'confirmation' | 'regular';
  expectationId?: string;
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * 会话日志接口
 */
export interface SessionLog {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messages: Message[];
  logs: LogEntry[];
  metadata: Record<string, unknown>;
}

/**
 * 日志服务类
 * 负责记录系统各模块的日志信息，特别是会话流程和状态变化
 */
export class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private sessions: Map<string, SessionLog> = new Map();
  private consoleEnabled = true;
  private storageEnabled = true;
  private maxLogSize = 1000;

  private constructor() {
    this.logs = [];
    this.sessions = new Map();
  }

  /**
   * 获取日志服务单例
   */
  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * 记录调试级别日志
   */
  public debug(module: string, message: string, data?: Record<string, unknown> | Error): void {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  /**
   * 记录信息级别日志
   */
  public info(module: string, message: string, data?: Record<string, unknown> | Error): void {
    this.log(LogLevel.INFO, module, message, data);
  }

  /**
   * 记录警告级别日志
   */
  public warn(module: string, message: string, data?: Record<string, unknown> | Error): void {
    this.log(LogLevel.WARN, module, message, data);
  }

  /**
   * 记录错误级别日志
   */
  public error(module: string, message: string, data?: Record<string, unknown> | Error): void {
    this.log(LogLevel.ERROR, module, message, data);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, module: string, message: string, data?: Record<string, unknown> | Error): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      module,
      message,
      data: data instanceof Error ? { error: data.message, stack: data.stack } : data
    };

    this.logs.push(logEntry);

    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    if (this.consoleEnabled) {
      const consoleMethod = this.getConsoleMethod(level);
      if (data) {
        console[consoleMethod](`[${module}] ${message}`, data);
      } else {
        console[consoleMethod](`[${module}] ${message}`);
      }
    }

    if (this.storageEnabled) {
      this.saveLogsToStorage();
    }
  }

  /**
   * 获取控制台方法
   */
  private getConsoleMethod(level: LogLevel): 'debug' | 'info' | 'warn' | 'error' {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * 保存日志到本地存储
   */
  private saveLogsToStorage(): void {
    try {
      localStorage.setItem('expeta_logs', JSON.stringify(this.logs.slice(-100)));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  /**
   * 从本地存储加载日志
   */
  public loadLogsFromStorage(): void {
    try {
      const storedLogs = localStorage.getItem('expeta_logs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs) as LogEntry[];
        this.logs = [...parsedLogs, ...this.logs];
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }

  /**
   * 获取所有日志
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 清除所有日志
   */
  public clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem('expeta_logs');
    } catch (error) {
      console.error('Failed to clear logs from storage:', error);
    }
  }

  /**
   * 启动新会话
   */
  public startSession(sessionId: string, metadata: Record<string, unknown> = {}): void {
    const session: SessionLog = {
      sessionId,
      startTime: new Date(),
      messages: [],
      logs: [],
      metadata
    };
    this.sessions.set(sessionId, session);
    this.info('SessionManager', `Started new session: ${sessionId}`, metadata);
  }

  /**
   * 结束会话
   */
  public endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = new Date();
      this.info('SessionManager', `Ended session: ${sessionId}`, {
        duration: session.endTime.getTime() - session.startTime.getTime(),
        messageCount: session.messages.length
      });
    }
  }

  /**
   * 记录会话消息
   */
  public logSessionMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      this.debug('SessionManager', `Added message to session: ${sessionId}`, {
        messageId: message.id,
        sender: message.sender,
        type: message.type
      });
    } else {
      this.warn('SessionManager', `Attempted to add message to non-existent session: ${sessionId}`);
    }
  }

  /**
   * 记录会话状态变化
   */
  public logSessionStateChange(
    sessionId: string, 
    previousState: string, 
    newState: string, 
    data?: Record<string, unknown>
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        module: 'SessionManager',
        message: `Session state changed: ${previousState} -> ${newState}`,
        data
      };
      session.logs.push(logEntry);
      this.info('SessionManager', `Session state changed: ${sessionId}`, {
        previousState,
        newState,
        data
      });
    } else {
      this.warn('SessionManager', `Attempted to log state change for non-existent session: ${sessionId}`);
    }
  }

  /**
   * 获取会话日志
   */
  public getSessionLog(sessionId: string): SessionLog | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取所有会话日志
   */
  public getAllSessionLogs(): SessionLog[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 清除会话日志
   */
  public clearSessionLog(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.info('SessionManager', `Cleared session log: ${sessionId}`);
  }

  /**
   * 清除所有会话日志
   */
  public clearAllSessionLogs(): void {
    this.sessions.clear();
    this.info('SessionManager', 'Cleared all session logs');
  }

  /**
   * 设置控制台日志启用状态
   */
  public setConsoleEnabled(enabled: boolean): void {
    this.consoleEnabled = enabled;
  }

  /**
   * 设置存储日志启用状态
   */
  public setStorageEnabled(enabled: boolean): void {
    this.storageEnabled = enabled;
  }
}

export default LoggingService.getInstance();
