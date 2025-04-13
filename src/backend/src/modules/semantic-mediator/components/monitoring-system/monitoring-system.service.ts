import { Injectable, Logger } from '@nestjs/common';
import { IMonitoringSystem } from '../../interfaces/monitoring-system.interface';
import { MemoryService } from '../../../memory/memory.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';

/**
 * 监控系统服务
 * 提供全面的监控、日志记录和调试功能
 */
@Injectable()
export class MonitoringSystemService implements IMonitoringSystem {
  private readonly logger = new Logger(MonitoringSystemService.name);
  private readonly debugSessions: Map<string, any> = new Map();

  constructor(private readonly memoryService: MemoryService) {}

  /**
   * 记录转换事件
   * @param event 事件对象
   * @returns 事件ID
   */
  async logTransformationEvent(event: any): Promise<string> {
    this.logger.debug('Logging transformation event');

    const eventId = `transformation_event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        id: eventId,
        type: 'transformation_event',
        timestamp: new Date().toISOString(),
        event,
      },
      tags: ['monitoring', 'transformation_event'],
    });

    this.logger.debug(`Transformation event logged with ID: ${eventId}`);
    return eventId;
  }

  /**
   * 记录错误
   * @param error 错误对象
   * @param context 上下文信息
   * @returns 错误ID
   */
  async logError(error: Error, context?: any): Promise<string> {
    this.logger.debug('Logging error');

    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        id: errorId,
        type: 'error',
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        context: context || {},
      },
      tags: ['monitoring', 'error'],
    });

    this.logger.debug(`Error logged with ID: ${errorId}`);
    return errorId;
  }

  /**
   * 记录性能指标
   * @param metrics 性能指标对象
   * @returns 是否成功
   */
  async recordPerformanceMetrics(metrics: any): Promise<boolean> {
    this.logger.debug('Recording performance metrics');

    const metricsId = `metrics_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        id: metricsId,
        type: 'performance_metrics',
        timestamp: new Date().toISOString(),
        metrics,
      },
      tags: ['monitoring', 'performance_metrics'],
    });

    this.logger.debug('Performance metrics recorded');
    return true;
  }

  /**
   * 获取转换历史
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 转换历史记录
   */
  async getTransformationHistory(filters?: any, limit: number = 50): Promise<any[]> {
    this.logger.debug(`Getting transformation history (limit: ${limit})`);

    const memories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM, limit);

    const filteredMemories = memories.filter((memory) => {
      const hasTags =
        memory.tags &&
        memory.tags.includes('monitoring') &&
        memory.tags.includes('transformation_event');

      let matchesFilters = true;
      if (filters && Object.keys(filters).length > 0) {
        matchesFilters = Object.entries(filters).every(([key, value]) => {
          return memory.metadata && memory.metadata[key] === value;
        });
      }

      return hasTags && matchesFilters;
    });

    const history = filteredMemories.map((memory) => memory.content);

    this.logger.debug(`Retrieved ${history.length} transformation events`);
    return history;
  }

  /**
   * 获取错误历史
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 错误历史记录
   */
  async getErrorHistory(filters?: any, limit: number = 50): Promise<any[]> {
    this.logger.debug(`Getting error history (limit: ${limit})`);

    const memories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM, limit);

    const filteredMemories = memories.filter((memory) => {
      const hasTags =
        memory.tags && memory.tags.includes('monitoring') && memory.tags.includes('error');

      let matchesFilters = true;
      if (filters && Object.keys(filters).length > 0) {
        matchesFilters = Object.entries(filters).every(([key, value]) => {
          return memory.metadata && memory.metadata[key] === value;
        });
      }

      return hasTags && matchesFilters;
    });

    const history = filteredMemories.map((memory) => memory.content);

    this.logger.debug(`Retrieved ${history.length} error events`);
    return history;
  }

  /**
   * 获取性能报告
   * @param timeRange 时间范围
   * @returns 性能报告
   */
  async getPerformanceReport(timeRange?: { start: Date; end: Date }): Promise<any> {
    this.logger.debug('Generating performance report');

    const memories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM);

    const filteredMemories = memories.filter((memory) => {
      const hasTags =
        memory.tags &&
        memory.tags.includes('monitoring') &&
        memory.tags.includes('performance_metrics');

      let isInTimeRange = true;
      if (timeRange) {
        const createdAt = memory.createdAt || new Date(0);
        isInTimeRange = createdAt >= timeRange.start && createdAt <= timeRange.end;
      }

      return hasTags && isInTimeRange;
    });

    const metrics = filteredMemories.map((memory) => memory.content.metrics);

    const aggregatedMetrics = this.aggregateMetrics(metrics);

    this.logger.debug('Performance report generated');
    return {
      timeRange,
      metrics: aggregatedMetrics,
      rawData: metrics,
    };
  }

  /**
   * 创建调试会话
   * @param context 上下文信息
   * @returns 会话ID
   */
  async createDebugSession(context?: any): Promise<string> {
    this.logger.debug('Creating debug session');

    const sessionId = `debug_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const session = {
      id: sessionId,
      startTime: new Date().toISOString(),
      status: 'active',
      context: context || {},
      data: [],
    };

    this.debugSessions.set(sessionId, session);

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        ...session,
        type: 'debug_session',
      },
      tags: ['monitoring', 'debug_session'],
    });

    this.logger.debug(`Debug session created with ID: ${sessionId}`);
    return sessionId;
  }

  /**
   * 结束调试会话
   * @param sessionId 会话ID
   * @returns 是否成功
   */
  async endDebugSession(sessionId: string): Promise<boolean> {
    this.logger.debug(`Ending debug session: ${sessionId}`);

    const session = this.debugSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Debug session not found: ${sessionId}`);
      return false;
    }

    session.status = 'completed';
    session.endTime = new Date().toISOString();

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        ...session,
        type: 'debug_session',
      },
      tags: ['monitoring', 'debug_session'],
    });

    this.logger.debug(`Debug session ended: ${sessionId}`);
    return true;
  }

  /**
   * 记录调试信息
   * @param sessionId 会话ID
   * @param data 调试数据
   * @returns 是否成功
   */
  async logDebugData(sessionId: string, data: any): Promise<boolean> {
    this.logger.debug(`Logging debug data for session: ${sessionId}`);

    const session = this.debugSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Debug session not found: ${sessionId}`);
      return false;
    }

    const debugEntry = {
      timestamp: new Date().toISOString(),
      data,
    };

    session.data.push(debugEntry);

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        sessionId,
        type: 'debug_data',
        entry: debugEntry,
      },
      tags: ['monitoring', 'debug_data'],
    });

    this.logger.debug(`Debug data logged for session: ${sessionId}`);
    return true;
  }

  /**
   * 获取调试会话数据
   * @param sessionId 会话ID
   * @returns 会话数据
   */
  async getDebugSessionData(sessionId: string): Promise<any> {
    this.logger.debug(`Getting debug session data: ${sessionId}`);

    const session = this.debugSessions.get(sessionId);
    if (!session) {
      const allMemories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM);

      const sessionMemories = allMemories.filter(
        (memory) =>
          memory.tags &&
          memory.tags.includes('monitoring') &&
          memory.tags.includes('debug_session') &&
          memory.content &&
          memory.content.id === sessionId,
      );

      if (sessionMemories.length === 0) {
        this.logger.warn(`Debug session not found: ${sessionId}`);
        return null;
      }

      const sessionData = sessionMemories[0].content;

      const allDataMemories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM);

      const dataMemories = allDataMemories.filter(
        (memory) =>
          memory.tags &&
          memory.tags.includes('monitoring') &&
          memory.tags.includes('debug_data') &&
          memory.content &&
          memory.content.sessionId === sessionId,
      );

      sessionData.data = dataMemories
        .map((memory) => memory.content.entry)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return sessionData;
    }

    this.logger.debug(`Retrieved debug session data: ${sessionId}`);
    return session;
  }

  /**
   * 聚合指标
   * @param metrics 指标数组
   * @returns 聚合结果
   */
  private aggregateMetrics(metrics: any[]): any {
    if (!metrics || metrics.length === 0) {
      return {
        count: 0,
      };
    }

    const result: any = {
      count: metrics.length,
      averages: {},
      min: {},
      max: {},
    };

    const allKeys = new Set<string>();
    metrics.forEach((metric) => {
      Object.keys(metric).forEach((key) => {
        if (typeof metric[key] === 'number') {
          allKeys.add(key);
        }
      });
    });

    allKeys.forEach((key) => {
      const values = metrics
        .filter((metric) => typeof metric[key] === 'number')
        .map((metric) => metric[key]);

      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        result.averages[key] = sum / values.length;
        result.min[key] = Math.min(...values);
        result.max[key] = Math.max(...values);
      }
    });

    return result;
  }
}
