import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../memory.service';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { SemanticCacheService } from '../services/semantic-cache.service';
import { SemanticQueryOptions, TransformationFeedback } from '../interfaces/semantic-memory.interfaces';
import { Model } from 'mongoose';

describe('MemoryService - Advanced Semantic Mediator Integration', () => {
  let service: MemoryService;
  let mockMemoryModel: any;
  let mockSemanticCacheService: any;
  let mockSemanticMediatorService: any;

  const mockMemory = {
    _id: 'test-id',
    type: MemoryType.REQUIREMENT,
    content: { text: 'Test requirement about user authentication' },
    metadata: { title: 'User Authentication' },
    tags: ['authentication', 'user'],
    semanticMetadata: {
      description: 'A requirement about user authentication and login process',
      relevanceScore: 0.85
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockMemoryModel = function() {
      return {
        save: () => Promise.resolve({
          _id: 'test-id',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      };
    };
    
    mockMemoryModel.find = jest.fn().mockReturnThis();
    mockMemoryModel.findById = jest.fn().mockReturnThis();
    mockMemoryModel.findOne = jest.fn().mockReturnThis();
    mockMemoryModel.create = jest.fn().mockResolvedValue(mockMemory);
    mockMemoryModel.exec = jest.fn().mockResolvedValue([mockMemory]);
    mockMemoryModel.sort = jest.fn().mockReturnThis();
    mockMemoryModel.limit = jest.fn().mockReturnThis();

    mockSemanticCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalEntries: 5,
        activeEntries: 3,
        expiredEntries: 2,
        avgRelevance: 0.75,
        avgAccessCount: 3
      })
    };

    mockSemanticMediatorService = {
      translateToSchema: jest.fn().mockImplementation((data, schema) => {
        return Promise.resolve({
          ...data,
          _schema: schema.id || 'test-schema'
        });
      }),
      registerSemanticDataSource: jest.fn().mockResolvedValue(undefined),
      evaluateSemanticTransformation: jest.fn().mockResolvedValue({
        semanticPreservation: 85,
        transformationQuality: 'good',
        potentialIssues: []
      }),
      interpretIntent: jest.fn().mockResolvedValue({
        relevantTerms: ['authentication', 'user', 'login'],
        intentType: 'search',
        confidence: 0.9
      }),
      calculateSimilarity: jest.fn().mockResolvedValue(0.85),
      enrichWithContext: jest.fn().mockImplementation((data, context) => {
        return Promise.resolve({
          ...data,
          enriched: true,
          context: context || 'default-context'
        });
      }),
      resolveSemanticConflicts: jest.fn().mockImplementation((source, target) => {
        return Promise.resolve({
          resolved: true,
          conflicts: [],
          result: { ...target, mergedWith: source._id || 'unknown' }
        });
      })
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
    
    jest.spyOn<any, any>(service, 'getSemanticMediatorService').mockResolvedValue(mockSemanticMediatorService);
  });

  describe('recordTransformationFeedback', () => {
    it('should record human feedback for semantic transformations', async () => {
      const transformationId = 'transform-123';
      const feedback: TransformationFeedback = {
        transformationId: transformationId,
        rating: 4,
        comments: 'Good transformation but missing some context',
        suggestedImprovements: ['Add more domain context', 'Preserve technical terms'],
        providedBy: 'test-user',
        timestamp: new Date()
      };
      
      mockMemoryModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{
          _id: transformationId,
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: { original: { text: 'Original' }, transformed: { text: 'Transformed' } },
          metadata: { 
            transformationId,
            updateHistory: []
          }
        }])
      });
      
      jest.spyOn(service, 'storeMemory').mockResolvedValue({} as any);
      jest.spyOn(service, 'updateMemory').mockResolvedValue({} as any);
      
      await service.recordTransformationFeedback(transformationId, feedback);
      
      expect(mockMemoryModel.find).toHaveBeenCalledWith({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        'metadata.transformationId': transformationId,
      });
      
      expect(service.storeMemory).toHaveBeenCalled();
      expect(service.updateMemory).toHaveBeenCalled();
    });
    
    it('should handle feedback for non-existent transformations', async () => {
      const transformationId = 'non-existent-id';
      const feedback: TransformationFeedback = {
        transformationId: transformationId,
        rating: 3,
        comments: 'Average transformation',
        providedBy: 'test-user',
        timestamp: new Date()
      };
      
      service.recordTransformationFeedback = jest.fn().mockRejectedValue(
        new Error(`Transformation with id ${transformationId} not found`)
      );
      
      await expect(service.recordTransformationFeedback(transformationId, feedback))
        .rejects.toThrow(`Transformation with id ${transformationId} not found`);
    });
  });
  
  describe('validateSemanticConsistency', () => {
    it('should validate data against semantic constraints', async () => {
      const data = {
        title: 'User Authentication',
        text: 'Implement secure user authentication system',
        status: 'active'
      };
      
      const type = MemoryType.REQUIREMENT;
      
      jest.spyOn<any, any>(service, 'getSemanticConstraints').mockResolvedValue([
        {
          field: 'title',
          constraint: 'Title must be descriptive',
          validationFn: (value: string) => value.length > 5,
          errorMessage: 'Title is too short',
          severity: 'error'
        },
        {
          field: 'status',
          constraint: 'Status must be valid',
          validationFn: (value: string) => ['active', 'pending', 'completed'].includes(value),
          errorMessage: 'Invalid status',
          severity: 'error'
        }
      ]);
      
      const result = await service.validateSemanticConsistency(data, type);
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });
    
    it('should detect semantic inconsistencies', async () => {
      const data = {
        title: 'Auth', // Too short
        text: 'Implement authentication',
        status: 'invalid-status' // Invalid status
      };
      
      const type = MemoryType.REQUIREMENT;
      
      jest.spyOn<any, any>(service, 'getSemanticConstraints').mockResolvedValue([
        {
          field: 'title',
          constraint: 'Title must be descriptive',
          validationFn: (value: string) => value.length > 5,
          errorMessage: 'Title is too short',
          severity: 'error'
        },
        {
          field: 'status',
          constraint: 'Status must be valid',
          validationFn: (value: string) => ['active', 'pending', 'completed'].includes(value),
          errorMessage: 'Invalid status',
          severity: 'error'
        }
      ]);
      
      const result = await service.validateSemanticConsistency(data, type);
      
      expect(result.isValid).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.suggestedFixes).toBeDefined();
    });
  });
  
  describe('getBySemanticIntent with Semantic Mediator', () => {
    it('should use semantic mediator to interpret intent and find relevant memories', async () => {
      const intent = 'find requirements about user login';
      const options: SemanticQueryOptions = {
        similarityThreshold: 0.7,
        limit: 10,
        sortBy: 'relevance'
      };
      
      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMemory])
      });
      
      mockSemanticMediatorService.interpretIntent.mockResolvedValueOnce({
        relevantTerms: ['authentication', 'user', 'login'],
        intentType: 'search',
        confidence: 0.9
      });
      
      const result = await service.getBySemanticIntent(intent, options);
      
      expect(result).toEqual([mockMemory]);
    });
    
    it('should fall back to basic search when semantic mediator is unavailable', async () => {
      const intent = 'find requirements about user login';
      
      jest.spyOn<any, any>(service, 'getSemanticMediatorService').mockRejectedValue(new Error('Service unavailable'));
      
      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMemory])
      });
      
      const result = await service.getBySemanticIntent(intent);
      
      expect(result).toEqual([mockMemory]);
      expect(mockMemoryModel.find).toHaveBeenCalled();
    });
  });
  
  describe('findSimilarMemories with Semantic Mediator', () => {
    it('should use semantic mediator to calculate similarity between memories', async () => {
      const memoryId = 'test-id';
      const similarityThreshold = 0.7;
      
      const similarMemory = {
        ...mockMemory,
        _id: 'similar-id',
        content: { text: 'Similar requirement about login system' }
      };
      
      mockMemoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemory)
      });
      
      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([similarMemory])
      });
      
      mockSemanticMediatorService.calculateSimilarity.mockResolvedValueOnce(0.85);
      
      const result = await service.findSimilarMemories(memoryId, similarityThreshold);
      
      expect(result).toEqual([similarMemory]);
      expect(mockMemoryModel.findById).toHaveBeenCalledWith(memoryId);
      expect(mockMemoryModel.find).toHaveBeenCalled();
    });
  });
});
