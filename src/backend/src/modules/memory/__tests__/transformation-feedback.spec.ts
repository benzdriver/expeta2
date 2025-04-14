import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../memory.service';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { SemanticCacheService } from '../services/semantic-cache.service';
import { TransformationFeedback } from '../interfaces/semantic-memory.interfaces';

describe('MemoryService - Transformation Feedback', () => {
  let service: MemoryService;
  let mockMemoryModel: any;

  const mockTransformation = {
    _id: 'transformation-id',
    type: MemoryType.SEMANTIC_TRANSFORMATION,
    content: {
      sourceData: { text: 'Original text' },
      transformedData: { text: 'Transformed text' },
    },
    metadata: {
      transformationId: 'test-transformation-123',
      timestamp: new Date(),
    },
    tags: ['semantic_transformation'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockMemoryModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockResolvedValue({ ...mockTransformation }),
      findByIdAndDelete: jest.fn().mockReturnThis(),
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
          _id: 'new-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      exec: jest.fn().mockResolvedValue([mockTransformation]),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };

    const mockSemanticCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        {
          provide: getModelToken(Memory.name),
          useValue: mockMemoryModel,
        },
        {
          provide: SemanticCacheService,
          useValue: mockSemanticCacheService,
        },
      ],
    }).compile();

    service = module.get<MemoryService>(MemoryService);
  });

  it('should record transformation feedback', async () => {
    jest.spyOn(service, 'storeMemory').mockResolvedValue({
      _id: 'feedback-id',
      type: MemoryType.SEMANTIC_FEEDBACK,
      content: {},
      metadata: {},
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    jest.spyOn(service, 'updateMemory').mockResolvedValue({
      _id: 'transformation-id',
      type: MemoryType.SEMANTIC_TRANSFORMATION,
      content: {},
      metadata: {
        hasFeedback: true,
        lastFeedbackTimestamp: expect.any(Date),
        lastFeedbackRating: 4,
      },
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const feedback: TransformationFeedback = {
      transformationId: 'test-transformation-123',
      rating: 4,
      comments: 'Good transformation but could be improved',
      suggestedImprovements: ['Better handling of edge cases'],
      providedBy: 'test-user',
      timestamp: new Date(),
      category: 'accuracy',
    };

    await service.recordTransformationFeedback('test-transformation-123', feedback);

    expect(mockMemoryModel.find).toHaveBeenCalledWith({
      type: MemoryType.SEMANTIC_TRANSFORMATION,
      'metadata.transformationId': 'test-transformation-123',
    });

    expect(service.storeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MemoryType.SEMANTIC_FEEDBACK,
        content: expect.objectContaining({
          transformationId: 'test-transformation-123',
          feedback,
        }),
      }),
    );

    expect(service.updateMemory).toHaveBeenCalledWith(
      MemoryType.SEMANTIC_TRANSFORMATION,
      'transformation-id',
      expect.objectContaining({
        metadata: expect.objectContaining({
          hasFeedback: true,
          lastFeedbackRating: 4,
        }),
      }),
    );
  });

  it('should get transformations requiring feedback', async () => {
    const mockTransformationsRequiringReview = [
      {
        _id: 'transformation-1',
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        metadata: { requiresHumanReview: true },
      },
      {
        _id: 'transformation-2',
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        metadata: { requiresHumanReview: true },
      },
    ];

    const mockTransformationsWithoutFeedback = [
      {
        _id: 'transformation-3',
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        metadata: { hasFeedback: false },
      },
    ];

    mockMemoryModel.find.mockImplementationOnce(() => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockTransformationsRequiringReview),
    }));

    mockMemoryModel.find.mockImplementationOnce(() => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockTransformationsWithoutFeedback),
    }));

    const result = await service.getFeedbackRequiringTransformations(5);

    expect(result.length).toBe(3);
    expect(result).toEqual([
      ...mockTransformationsRequiringReview,
      ...mockTransformationsWithoutFeedback,
    ]);

    expect(mockMemoryModel.find).toHaveBeenCalledWith({
      type: MemoryType.SEMANTIC_TRANSFORMATION,
      'metadata.requiresHumanReview': true,
    });

    expect(mockMemoryModel.find).toHaveBeenCalledWith({
      type: MemoryType.SEMANTIC_TRANSFORMATION,
      'metadata.hasFeedback': { $ne: true },
    });
  });
});
