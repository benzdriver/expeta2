import { Test, TestingModule } from '@nestjs/testing';
import { HumanInTheLoopService } from '../components/human-in-the-loop/human-in-the-loop.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { Logger } from '@nestjs/common';

describe('HumanInTheLoopService', () => {
  let service: HumanInTheLoopService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;

  beforeEach(async () => {
    const mockLlmRouterService = {
      generateContent: jest.fn().mockImplementation((prompt, options) => {
        if (prompt.includes('分析以下人类反馈模式')) {
          return Promise.resolve(JSON.stringify({
            patterns: [
              { type: 'correction', frequency: 'high', context: 'code validation' },
              { type: 'suggestion', frequency: 'medium', context: 'UI improvement' }
            ],
            insights: 'Users tend to provide more detailed feedback for code validation tasks.'
          }));
        } else {
          return Promise.resolve('{}');
        }
      }),
    };

    const mockMemoryService = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.SYSTEM) {
          return Promise.resolve([
            {
              content: {
                type: 'human_review_request',
                id: 'test-review-id',
                status: 'pending',
                data: { key: 'value' },
                context: {},
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z'
              },
              tags: ['human_in_the_loop', 'review_request', 'pending']
            },
            {
              content: {
                type: 'human_review_feedback',
                id: 'completed-review-id',
                status: 'completed',
                data: { key: 'value' },
                feedback: { comment: 'Good job!' },
                context: {},
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-02T00:00:00.000Z',
                completedAt: '2023-01-02T00:00:00.000Z'
              },
              tags: ['human_in_the_loop', 'review_feedback', 'completed']
            }
          ]);
        }
        return Promise.resolve([]);
      }),
      getRelatedMemories: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HumanInTheLoopService,
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() } }
      ],
    }).compile();

    service = module.get<HumanInTheLoopService>(HumanInTheLoopService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
  });

  describe('requestHumanReview', () => {
    it('should create a review request and store it in memory', async () => {
      const data = { code: 'function test() { return true; }' };
      const context = { source: 'unit test' };
      
      const reviewId = await service.requestHumanReview(data, context);
      
      expect(reviewId).toBeDefined();
      expect(reviewId).toContain('review_');
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'human_review_request',
            id: reviewId,
            status: 'pending',
            data,
            context
          }),
          tags: ['human_in_the_loop', 'review_request', 'pending']
        })
      );
    });

    it('should set up a timeout if timeout parameter is provided', async () => {
      jest.useFakeTimers();
      
      const data = { key: 'value' };
      const timeout = 1000;
      
      const reviewId = await service.requestHumanReview(data, {}, timeout);
      
      expect(reviewId).toBeDefined();
      
      jest.advanceTimersByTime(timeout + 100);
      
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            type: 'human_review_timeout',
            id: reviewId,
            status: 'timeout'
          })
        })
      );
      
      jest.useRealTimers();
    });
  });

  describe('submitHumanFeedback', () => {
    it('should submit feedback for a pending review', async () => {
      const reviewId = 'test-review-id';
      const feedback = { comment: 'Looks good!' };
      
      const result = await service.submitHumanFeedback(reviewId, feedback);
      
      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'human_review_feedback',
            id: reviewId,
            status: 'completed',
            feedback
          }),
          tags: ['human_in_the_loop', 'review_feedback', 'completed']
        })
      );
    });

    it('should return false if review is not found', async () => {
      jest.spyOn(service, 'getReviewStatus').mockResolvedValueOnce(null);
      
      const result = await service.submitHumanFeedback('non-existent-id', { comment: 'Test' });
      
      expect(result).toBe(false);
    });

    it('should return false if review is not pending', async () => {
      jest.spyOn(service, 'getReviewStatus').mockResolvedValueOnce({
        id: 'completed-id',
        status: 'completed'
      });
      
      const result = await service.submitHumanFeedback('completed-id', { comment: 'Test' });
      
      expect(result).toBe(false);
    });
  });

  describe('getReviewStatus', () => {
    it('should return the latest status of a review', async () => {
      const reviewId = 'test-review-id';
      
      const result = await service.getReviewStatus(reviewId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(reviewId);
      expect(result.status).toBe('pending');
    });

    it('should return null if review is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      
      const result = await service.getReviewStatus('non-existent-id');
      
      expect(result).toBeNull();
    });
  });

  describe('getPendingReviews', () => {
    it('should return pending reviews', async () => {
      const result = await service.getPendingReviews();
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].status).toBe('pending');
    });

    it('should filter reviews based on provided filters', async () => {
      const filters = { 'data.key': 'value' };
      
      const result = await service.getPendingReviews(filters);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit the number of results', async () => {
      const limit = 1;
      
      const result = await service.getPendingReviews({}, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('cancelReview', () => {
    it('should cancel a pending review', async () => {
      const reviewId = 'test-review-id';
      const reason = 'No longer needed';
      
      const result = await service.cancelReview(reviewId, reason);
      
      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'human_review_cancelled',
            id: reviewId,
            status: 'cancelled',
            reason
          }),
          tags: ['human_in_the_loop', 'review_cancelled']
        })
      );
    });

    it('should return false if review is not found', async () => {
      jest.spyOn(service, 'getReviewStatus').mockResolvedValueOnce(null);
      
      const result = await service.cancelReview('non-existent-id');
      
      expect(result).toBe(false);
    });

    it('should return false if review is not pending', async () => {
      jest.spyOn(service, 'getReviewStatus').mockResolvedValueOnce({
        id: 'completed-id',
        status: 'completed'
      });
      
      const result = await service.cancelReview('completed-id');
      
      expect(result).toBe(false);
    });
  });

  describe('registerReviewCallback', () => {
    it('should register a callback function', async () => {
      const callback = jest.fn();
      
      const callbackId = await service.registerReviewCallback(callback);
      
      expect(callbackId).toBeDefined();
      expect(callbackId).toContain('callback_');
    });
  });

  describe('removeReviewCallback', () => {
    it('should remove a registered callback', async () => {
      const callback = jest.fn();
      const callbackId = await service.registerReviewCallback(callback);
      
      const result = await service.removeReviewCallback(callbackId);
      
      expect(result).toBe(true);
    });

    it('should return false if callback is not found', async () => {
      const result = await service.removeReviewCallback('non-existent-id');
      
      expect(result).toBe(false);
    });
  });

  describe('getFeedbackHistory', () => {
    it('should return completed reviews', async () => {
      const result = await service.getFeedbackHistory();
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].status).toBe('completed');
    });

    it('should filter reviews based on provided filters', async () => {
      const filters = { 'feedback.comment': 'Good job!' };
      
      const result = await service.getFeedbackHistory(filters);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit the number of results', async () => {
      const limit = 1;
      
      const result = await service.getFeedbackHistory({}, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('analyzeFeedbackPatterns', () => {
    it('should analyze feedback patterns and return insights', async () => {
      const result = await service.analyzeFeedbackPatterns();
      
      expect(result).toBeDefined();
      expect(result.patterns).toBeInstanceOf(Array);
      expect(result.insights).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('分析以下人类反馈模式'),
        expect.any(Object)
      );
    });

    it('should return empty patterns if no feedback history is available', async () => {
      jest.spyOn(service, 'getFeedbackHistory').mockResolvedValueOnce([]);
      
      const result = await service.analyzeFeedbackPatterns();
      
      expect(result).toBeDefined();
      expect(result.patterns).toEqual([]);
      expect(result.insights).toBe('No feedback data available for analysis');
    });

    it('should handle errors during analysis', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('Analysis error'));
      
      const result = await service.analyzeFeedbackPatterns();
      
      expect(result).toBeDefined();
      expect(result.patterns).toEqual([]);
      expect(result.insights).toBe('Failed to analyze feedback patterns due to an error');
      expect(result.error).toBe('Analysis error');
    });
  });
});
