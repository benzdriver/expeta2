/**
 * 监控系统接口
 * 提供全面的监控、日志记录和调试功能
 */
export interface IMonitoringSystem {
  /**
   * 记录转换事件
   * @param event 事件对象
   * @returns 事件ID
   */
  logTransformationEvent(event: unknown): Promise<string>;

  /**
   * 记录错误
   * @param error 错误对象
   * @param context 上下文信息
   * @returns 错误ID
   */
  logError(error: Error, context?: unknown): Promise<string>;

  /**
   * 记录性能指标
   * @param metrics 性能指标对象
   * @returns 是否成功
   */
  recordPerformanceMetrics(metrics: unknown): Promise<boolean>;

  /**
   * 获取转换历史
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 转换历史记录
   */
  getTransformationHistory(filters?: unknown, limit?: number): Promise<any[]>;

  /**
   * 获取错误历史
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 错误历史记录
   */
  getErrorHistory(filters?: unknown, limit?: number): Promise<any[]>;

  /**
   * 获取性能报告
   * @param timeRange 时间范围
   * @returns 性能报告
   */
  getPerformanceReport(timeRange?: { start: Date; end: Date }): Promise<any>;

  /**
   * 创建调试会话
   * @param context 上下文信息
   * @returns 会话ID
   */
  createDebugSession(context?: unknown): Promise<string>;

  /**
   * 结束调试会话
   * @param sessionId 会话ID
   * @returns 是否成功
   */
  endDebugSession(sessionId: string): Promise<boolean>;

  /**
   * 记录调试信息
   * @param sessionId 会话ID
   * @param data 调试数据
   * @returns 是否成功
   */
  logDebugData(sessionId: string, data: unknown): Promise<boolean>;

  /**
   * 获取调试会话数据
   * @param sessionId 会话ID
   * @returns 会话数据
   */
  getDebugSessionData(sessionId: string): Promise<any>;
}
