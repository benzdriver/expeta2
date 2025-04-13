import { Injectable, Logger } from '@nestjs/common';
import { IHumanInTheLoop } from '../../interfaces/human-in-the-loop.interface';
import { MemoryService } from '../../../memory/memory.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';
import { LlmService } from '../../../../services/llm.service';

/**
 * 人机协作系统服务
 * 集成人类反馈机制
 */
@Injectable()
export class HumanInTheLoopService implements IHumanInTheLoop {
  private readonly logger = new Logger(HumanInTheLoopService.name);
  private readonly reviewCallbacks: Map<string, Function> = new Map();
  private readonly reviewTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly memoryService: MemoryService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * 请求人类审核
   * @param data 需要审核的数据
   * @param context 上下文信息
   * @param timeout 超时时间（毫秒）
   * @returns 审核请求ID
   */
  async requestHumanReview(
    data: any,
    context?: any,
    timeout?: number,
  ): Promise<string> {
    this.logger.debug('Requesting human review');
    
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const reviewRequest = {
      id: reviewId,
      status: 'pending',
      data,
      context: context || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        type: 'human_review_request',
        ...reviewRequest,
      },
      tags: ['human_in_the_loop', 'review_request', 'pending'],
    });
    
    if (timeout && timeout > 0) {
      const timeoutHandler = setTimeout(async () => {
        await this.handleReviewTimeout(reviewId);
      }, timeout);
      
      this.reviewTimeouts.set(reviewId, timeoutHandler);
    }
    
    this.triggerCallbacks(reviewRequest);
    
    this.logger.debug(`Human review requested with ID: ${reviewId}`);
    return reviewId;
  }

  /**
   * 提交人类反馈
   * @param reviewId 审核请求ID
   * @param feedback 反馈内容
   * @param metadata 元数据
   * @returns 是否成功
   */
  async submitHumanFeedback(
    reviewId: string,
    feedback: any,
    metadata?: any,
  ): Promise<boolean> {
    this.logger.debug(`Submitting human feedback for review: ${reviewId}`);
    
    const reviewStatus = await this.getReviewStatus(reviewId);
    
    if (!reviewStatus) {
      this.logger.warn(`Review request not found: ${reviewId}`);
      return false;
    }
    
    if (reviewStatus.status !== 'pending') {
      this.logger.warn(`Review request is not pending: ${reviewId}, status: ${reviewStatus.status}`);
      return false;
    }
    
    if (this.reviewTimeouts.has(reviewId)) {
      clearTimeout(this.reviewTimeouts.get(reviewId));
      this.reviewTimeouts.delete(reviewId);
    }
    
    const updatedReview = {
      ...reviewStatus,
      status: 'completed',
      feedback,
      metadata: {
        ...reviewStatus.metadata || {},
        ...metadata || {},
      },
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        type: 'human_review_feedback',
        ...updatedReview,
      },
      tags: ['human_in_the_loop', 'review_feedback', 'completed'],
    });
    
    this.triggerCallbacks(updatedReview);
    
    this.logger.debug(`Human feedback submitted for review: ${reviewId}`);
    return true;
  }

  /**
   * 获取审核请求状态
   * @param reviewId 审核请求ID
   * @returns 审核状态
   */
  async getReviewStatus(reviewId: string): Promise<any> {
    this.logger.debug(`Getting review status: ${reviewId}`);
    
    const memories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM);
    
    const reviewMemories = memories.filter(memory => 
      memory.content && 
      (memory.content.type === 'human_review_request' || 
       memory.content.type === 'human_review_feedback' || 
       memory.content.type === 'human_review_timeout' || 
       memory.content.type === 'human_review_cancelled') && 
      memory.content.id === reviewId
    );
    
    if (reviewMemories.length === 0) {
      this.logger.warn(`Review request not found: ${reviewId}`);
      return null;
    }
    
    const latestReview = reviewMemories
      .sort((a, b) => {
        const dateA = new Date(a.content.updatedAt);
        const dateB = new Date(b.content.updatedAt);
        return dateB.getTime() - dateA.getTime();
      })[0].content;
    
    this.logger.debug(`Retrieved review status: ${reviewId}, status: ${latestReview.status}`);
    return latestReview;
  }

  /**
   * 获取待处理的审核请求
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 审核请求数组
   */
  async getPendingReviews(filters?: any, limit: number = 10): Promise<any[]> {
    this.logger.debug(`Getting pending reviews (limit: ${limit})`);
    
    const memories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM);
    
    const pendingReviews = memories
      .filter(memory => 
        memory.tags && 
        memory.tags.includes('human_in_the_loop') && 
        memory.tags.includes('review_request') && 
        memory.tags.includes('pending') &&
        memory.content && 
        memory.content.status === 'pending'
      )
      .map(memory => memory.content);
    
    let filteredReviews = pendingReviews;
    if (filters && Object.keys(filters).length > 0) {
      filteredReviews = pendingReviews.filter(review => {
        return Object.entries(filters).every(([key, value]) => {
          const keyParts = key.split('.');
          let obj = review;
          
          for (let i = 0; i < keyParts.length - 1; i++) {
            if (!obj[keyParts[i]]) return false;
            obj = obj[keyParts[i]];
          }
          
          const lastKey = keyParts[keyParts.length - 1];
          return obj[lastKey] === value;
        });
      });
    }
    
    const sortedReviews = filteredReviews
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, limit);
    
    this.logger.debug(`Retrieved ${sortedReviews.length} pending reviews`);
    return sortedReviews;
  }

  /**
   * 取消审核请求
   * @param reviewId 审核请求ID
   * @param reason 取消原因
   * @returns 是否成功
   */
  async cancelReview(reviewId: string, reason?: string): Promise<boolean> {
    this.logger.debug(`Cancelling review: ${reviewId}`);
    
    const reviewStatus = await this.getReviewStatus(reviewId);
    
    if (!reviewStatus) {
      this.logger.warn(`Review request not found: ${reviewId}`);
      return false;
    }
    
    if (reviewStatus.status !== 'pending') {
      this.logger.warn(`Review request is not pending: ${reviewId}, status: ${reviewStatus.status}`);
      return false;
    }
    
    if (this.reviewTimeouts.has(reviewId)) {
      clearTimeout(this.reviewTimeouts.get(reviewId));
      this.reviewTimeouts.delete(reviewId);
    }
    
    const updatedReview = {
      ...reviewStatus,
      status: 'cancelled',
      reason: reason || 'Cancelled by system',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        type: 'human_review_cancelled',
        ...updatedReview,
      },
      tags: ['human_in_the_loop', 'review_cancelled'],
    });
    
    this.triggerCallbacks(updatedReview);
    
    this.logger.debug(`Review cancelled: ${reviewId}`);
    return true;
  }

  /**
   * 注册审核回调
   * @param callback 回调函数
   * @returns 回调ID
   */
  async registerReviewCallback(callback: Function): Promise<string> {
    this.logger.debug('Registering review callback');
    
    const callbackId = `callback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.reviewCallbacks.set(callbackId, callback);
    
    this.logger.debug(`Review callback registered with ID: ${callbackId}`);
    return callbackId;
  }

  /**
   * 移除审核回调
   * @param callbackId 回调ID
   * @returns 是否成功
   */
  async removeReviewCallback(callbackId: string): Promise<boolean> {
    this.logger.debug(`Removing review callback: ${callbackId}`);
    
    const exists = this.reviewCallbacks.has(callbackId);
    if (!exists) {
      this.logger.warn(`Review callback not found: ${callbackId}`);
      return false;
    }
    
    this.reviewCallbacks.delete(callbackId);
    
    this.logger.debug(`Review callback removed: ${callbackId}`);
    return true;
  }

  /**
   * 获取反馈历史
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 反馈历史记录
   */
  async getFeedbackHistory(filters?: any, limit: number = 50): Promise<any[]> {
    this.logger.debug(`Getting feedback history (limit: ${limit})`);
    
    const memories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM);
    
    const completedReviews = memories
      .filter(memory => 
        memory.tags && 
        memory.tags.includes('human_in_the_loop') && 
        memory.tags.includes('review_feedback') && 
        memory.tags.includes('completed') &&
        memory.content && 
        memory.content.status === 'completed'
      )
      .map(memory => memory.content);
    
    let filteredReviews = completedReviews;
    if (filters && Object.keys(filters).length > 0) {
      filteredReviews = completedReviews.filter(review => {
        return Object.entries(filters).every(([key, value]) => {
          const keyParts = key.split('.');
          let obj = review;
          
          for (let i = 0; i < keyParts.length - 1; i++) {
            if (!obj[keyParts[i]]) return false;
            obj = obj[keyParts[i]];
          }
          
          const lastKey = keyParts[keyParts.length - 1];
          return obj[lastKey] === value;
        });
      });
    }
    
    const sortedReviews = filteredReviews
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, limit);
    
    this.logger.debug(`Retrieved ${sortedReviews.length} feedback history entries`);
    return sortedReviews;
  }

  /**
   * 分析反馈模式
   * @returns 反馈模式分析结果
   */
  async analyzeFeedbackPatterns(): Promise<any> {
    this.logger.debug('Analyzing feedback patterns');
    
    const feedbackHistory = await this.getFeedbackHistory({}, 100);
    
    if (feedbackHistory.length === 0) {
      this.logger.debug('No feedback history available for analysis');
      return {
        patterns: [],
        insights: 'No feedback data available for analysis',
      };
    }
    
    const analysisData = feedbackHistory.map(entry => ({
      id: entry.id,
      dataType: entry.data ? typeof entry.data : 'unknown',
      feedbackType: entry.feedback ? typeof entry.feedback : 'unknown',
      responseTime: entry.completedAt && entry.createdAt ? 
        (new Date(entry.completedAt).getTime() - new Date(entry.createdAt).getTime()) / 1000 : 
        null,
      context: entry.context || {},
      metadata: entry.metadata || {},
    }));
    
    const analysisPrompt = `
分析以下人类反馈模式：

${JSON.stringify(analysisData, null, 2)}

请提供以下信息：
1. 最常见的反馈类型和模式
2. 平均响应时间和趋势
3. 可能的改进建议
4. 任何其他有价值的见解

以JSON格式返回结果，包含patterns数组和insights字符串。
`;

    try {
      const analysisResult = await this.llmService.generateContent(
        analysisPrompt,
        {
          temperature: 0.3,
          maxTokens: 2000,
        }
      );
      
      const parsedResult = JSON.parse(analysisResult);
      this.logger.debug('Feedback pattern analysis completed');
      return parsedResult;
    } catch (error) {
      this.logger.error(`Error analyzing feedback patterns: ${error.message}`);
      return {
        patterns: [],
        insights: 'Failed to analyze feedback patterns due to an error',
        error: error.message,
      };
    }
  }

  /**
   * 处理审核超时
   * @param reviewId 审核请求ID
   */
  private async handleReviewTimeout(reviewId: string): Promise<void> {
    this.logger.debug(`Handling review timeout: ${reviewId}`);
    
    const reviewStatus = await this.getReviewStatus(reviewId);
    
    if (!reviewStatus || reviewStatus.status !== 'pending') {
      return;
    }
    
    const updatedReview = {
      ...reviewStatus,
      status: 'timeout',
      timeoutAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        type: 'human_review_timeout',
        ...updatedReview,
      },
      tags: ['human_in_the_loop', 'review_timeout'],
    });
    
    this.triggerCallbacks(updatedReview);
    
    this.logger.debug(`Review timeout handled: ${reviewId}`);
  }

  /**
   * 触发回调
   * @param reviewData 审核数据
   */
  private triggerCallbacks(reviewData: any): void {
    this.logger.debug(`Triggering callbacks for review: ${reviewData.id}`);
    
    for (const [callbackId, callback] of this.reviewCallbacks.entries()) {
      try {
        callback(reviewData);
      } catch (error) {
        this.logger.error(`Error in review callback ${callbackId}: ${error.message}`);
      }
    }
  }
}
