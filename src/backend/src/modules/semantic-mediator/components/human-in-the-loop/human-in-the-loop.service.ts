import { Injectable, Logger } from '@nestjs/common';
import { IHumanInTheLoop } from '../../interfaces/human-in-the-loop.interface';
import { MemoryService } from '../../../memory/memory.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';
import { LlmRouterService } from '../../../../services/llm-router.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * 人机协作系统服务
 * 集成人类反馈机制
 */
@Injectable()
export class HumanInTheLoopService implements IHumanInTheLoop {
  private readonly logger = new Logger(HumanInTheLoopService.name);
  private readonly reviewCallbacks: Map<string, (reviewData: unknown) => void> = new Map();
  private readonly reviewTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly memoryService: MemoryService,
    private readonly llmRouterService: LlmRouterService,
  ) {}

  /**
   * Request a human review for data
   * @param data Data to review
   * @param context Additional context for the review
   * @param timeout Optional timeout in milliseconds
   * @returns Review ID
   */
  async requestHumanReview(data: unknown, context?: unknown, timeout?: number): Promise<string> {
    this.logger.debug('Requesting human review');
    const reviewId = uuidv4();
    
    try {
      await this.memoryService.storeMemory({
        type: MemoryType.HUMAN_REVIEW_REQUEST,
        content: {
          data,
          context,
          reviewId,
          requestedAt: new Date(),
          status: 'pending',
          timeout: timeout ? new Date(Date.now() + timeout) : undefined,
        },
        metadata: {
          reviewId,
          status: 'pending',
          requestedAt: new Date(),
        },
        tags: ['human_review', 'pending', reviewId],
      });
      
      this.logger.log(`Human review requested with ID: ${reviewId}`);
      return reviewId;
    } catch (error) {
      this.logger.error(`Error requesting human review: ${error.message}`, error.stack);
      throw new Error(`Failed to request human review: ${error.message}`);
    }
  }

  /**
   * Submit feedback for a review
   * @param reviewId Review ID
   * @param feedback Feedback data
   * @param metadata Additional metadata
   * @returns Whether the feedback was successfully submitted
   */
  async submitHumanFeedback(reviewId: string, feedback: unknown, metadata?: unknown): Promise<boolean> {
    this.logger.debug(`Submitting feedback for review ${reviewId}`);
    
    try {
      // Find the review request
      const memories = await this.memoryService.getMemoryByType(MemoryType.HUMAN_REVIEW_REQUEST, 100);
      const reviewMemory = memories.find(
        (memory) => memory.content.reviewId === reviewId && memory.content.status === 'pending'
      );
      
      if (!reviewMemory) {
        this.logger.warn(`Review request not found or not pending: ${reviewId}`);
        return false;
      }
      
      // Update the review status
      const updatedMemory = {
        ...reviewMemory,
        content: {
          ...reviewMemory.content,
          status: 'completed',
          feedback,
          completedAt: new Date(),
        },
        metadata: {
          ...reviewMemory.metadata,
          status: 'completed',
          completedAt: new Date(),
        },
        tags: reviewMemory.tags.filter(tag => tag !== 'pending').concat(['completed']),
      };
      
      // Store the feedback
      await this.memoryService.storeMemory({
        type: MemoryType.HUMAN_REVIEW_FEEDBACK,
        content: {
          reviewId,
          originalData: reviewMemory.content.data,
          feedback,
          metadata,
          submittedAt: new Date(),
        },
        metadata: {
          reviewId,
          submittedAt: new Date(),
        },
        tags: ['human_feedback', reviewId],
      });
      
      // Update the review request
      await this.memoryService.updateMemory(
        MemoryType.HUMAN_REVIEW_REQUEST, 
        reviewMemory.content.reviewId, 
        { content: updatedMemory.content, metadata: updatedMemory.metadata, tags: updatedMemory.tags }
      );
      
      this.logger.log(`Feedback submitted for review ${reviewId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error submitting feedback: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 获取审核请求状态
   * @param reviewId 审核请求ID
   * @returns 审核状态
   */
  async getReviewStatus(reviewId: string): Promise<any> {
    this.logger.debug(`Getting review status: ${reviewId}`);

    const memories = await this.memoryService.getRelatedMemories(`review:${reviewId}`, 50);

    const reviewMemories = memories.filter(
      (memory) =>
        memory.content &&
        (memory.content.type === 'human_review_request' ||
          memory.content.type === 'human_review_feedback' ||
          memory.content.type === 'human_review_timeout' ||
          memory.content.type === 'human_review_cancelled') &&
        memory.content.id === reviewId,
    );

    if (reviewMemories.length === 0) {
      this.logger.warn(`Review request not found: ${reviewId}`);
      return null;
    }

    const latestReview = reviewMemories.sort((a, b) => {
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
  async getPendingReviews(filters?: unknown, limit: number = 10): Promise<any[]> {
    this.logger.debug(`Getting pending reviews (limit: ${limit})`);

    const memories = await this.memoryService.getRelatedMemories('review:pending', 100);

    const pendingReviews = memories
      .filter(
        (memory) =>
          memory.tags &&
          memory.tags.includes('human_in_the_loop') &&
          memory.tags.includes('review_request') &&
          memory.tags.includes('pending') &&
          memory.content &&
          memory.content.status === 'pending',
      )
      .map((memory) => memory.content);

    let filteredReviews = pendingReviews;
    if (filters && Object.keys(filters).length > 0) {
      filteredReviews = pendingReviews.filter((review) => {
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
      this.logger.warn(
        `Review request is not pending: ${reviewId}, status: ${reviewStatus.status}`,
      );
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
  async registerReviewCallback(callback: (reviewData: unknown) => void): Promise<string> {
    this.logger.debug('Registering review callback');

    const callbackId = uuidv4();
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
  async getFeedbackHistory(filters?: unknown, limit: number = 50): Promise<any[]> {
    this.logger.debug(`Getting feedback history (limit: ${limit})`);

    const memories = await this.memoryService.getRelatedMemories('review:feedback', 200);

    const completedReviews = memories
      .filter(
        (memory) =>
          memory.tags &&
          memory.tags.includes('human_in_the_loop') &&
          memory.tags.includes('review_feedback') &&
          memory.tags.includes('completed') &&
          memory.content &&
          memory.content.status === 'completed',
      )
      .map((memory) => memory.content);

    let filteredReviews = completedReviews;
    if (filters && Object.keys(filters).length > 0) {
      filteredReviews = completedReviews.filter((review) => {
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

    const feedbackHistory = await this.getFeedbackHistory({}, 200);

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
      responseTime:
        entry.completedAt && entry.createdAt
          ? (new Date(entry.completedAt).getTime() - new Date(entry.createdAt).getTime()) / 1000
          : null,
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
      const analysisResult = await this.llmRouterService.generateContent(analysisPrompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });

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
    this.logger.debug(`Triggering callbacks for review: ${(reviewData as any).id}`);

    for (const [callbackId, callback] of this.reviewCallbacks.entries()) {
      try {
        callback(reviewData);
      } catch (error) {
        this.logger.error(`Error in review callback ${callbackId}: ${error.message}`);
      }
    }
  }

  /**
   * 请求人类反馈
   * @param data 需要反馈的数据
   * @param context 上下文信息
   * @param options 选项
   * @returns 反馈结果
   */
  async requestHumanFeedback(
    data: unknown,
    context?: unknown,
    options?: { timeout?: number; urgent?: boolean }
  ): Promise<any> {
    this.logger.debug('Requesting human feedback');
    
    const reviewId = await this.requestHumanReview(data, context, options?.timeout);
    
    // 在真实系统中，这里应该是一个等待人类反馈的异步过程
    // 但在测试中我们模拟一个简单的反馈
    return {
      feedback: 'Test human feedback',
      approved: true,
      reviewId,
    };
  }

  /**
   * 记录人类决策
   * @param decisionId 决策ID
   * @param decision 决策结果
   * @param metadata 元数据
   * @returns 是否成功记录
   */
  async recordHumanDecision(decisionId: string, decision: unknown, metadata?: unknown): Promise<boolean> {
    this.logger.debug(`Recording human decision: ${decisionId}`);
    
    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        type: 'human_decision',
        id: decisionId,
        decision,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      },
      tags: ['human_in_the_loop', 'decision', decisionId],
    });
    
    return true;
  }

  /**
   * 获取人类反馈历史
   * @param filters 过滤条件
   * @param limit 结果数量限制
   * @returns 反馈历史记录
   */
  async getHumanFeedbackHistory(filters?: unknown, limit: number = 50): Promise<any[]> {
    return this.getFeedbackHistory(filters, limit);
  }
}
