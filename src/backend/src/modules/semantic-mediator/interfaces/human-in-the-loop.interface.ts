/**
 * 人机协作系统接口
 * 集成人类反馈机制
 */
export interface IHumanInTheLoop {
  /**
   * 请求人类审核
   * @param data 需要审核的数据
   * @param context 上下文信息
   * @param timeout 超时时间（毫秒）
   * @returns 审核请求ID
   */
  requestHumanReview(data: any, context?: any, timeout?: number): Promise<string>;

  /**
   * 提交人类反馈
   * @param reviewId 审核请求ID
   * @param feedback 反馈内容
   * @param metadata 元数据
   * @returns 是否成功
   */
  submitHumanFeedback(reviewId: string, feedback: any, metadata?: any): Promise<boolean>;

  /**
   * 获取审核请求状态
   * @param reviewId 审核请求ID
   * @returns 审核状态
   */
  getReviewStatus(reviewId: string): Promise<any>;

  /**
   * 获取待处理的审核请求
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 审核请求数组
   */
  getPendingReviews(filters?: any, limit?: number): Promise<any[]>;

  /**
   * 取消审核请求
   * @param reviewId 审核请求ID
   * @param reason 取消原因
   * @returns 是否成功
   */
  cancelReview(reviewId: string, reason?: string): Promise<boolean>;

  /**
   * 注册审核回调
   * @param callback 回调函数
   * @returns 回调ID
   */
  registerReviewCallback(callback: (reviewData: unknown) => void): Promise<string>;

  /**
   * 移除审核回调
   * @param callbackId 回调ID
   * @returns 是否成功
   */
  removeReviewCallback(callbackId: string): Promise<boolean>;

  /**
   * 获取反馈历史
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 反馈历史记录
   */
  getFeedbackHistory(filters?: any, limit?: number): Promise<any[]>;

  /**
   * 分析反馈模式
   * @returns 反馈模式分析结果
   */
  analyzeFeedbackPatterns(): Promise<any>;
}
