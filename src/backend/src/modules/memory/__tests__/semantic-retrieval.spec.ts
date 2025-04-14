import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../memory.service';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { SemanticCacheService } from '../services/semantic-cache.service';
import { SemanticQueryOptions } from '../interfaces/semantic-memory.interfaces';

describe('MemoryService - Semantic Retrieval', () => {
  let service: MemoryService;
  let mockMemoryModel: any;
  let mockSemanticCacheService: any;

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
    mockMemoryModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockMemory]),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    mockSemanticCacheService = {
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
    
    jest.spyOn<any, any>(service, 'getSemanticMediatorService').mockResolvedValue({
      interpretIntent: jest.fn().mockResolvedValue({
        relevantTerms: ['authentication', 'user', 'login'],
        intentType: 'search'
      }),
      calculateSimilarity: jest.fn().mockResolvedValue(0.85)
    });
  });

  describe('getBySemanticIntent', () => {
    it('should retrieve memories based on semantic intent', async () => {
      const intent = 'find requirements about user authentication';
      const options: SemanticQueryOptions = {
        similarityThreshold: 0.7,
        limit: 10,
        sortBy: 'relevance'
      };
      
      const mockResults = [mockMemory, { ...mockMemory, _id: 'test-id-2' }];
      
      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults)
      });
      
      const result = await service.getBySemanticIntent(intent, options);
      
      expect(result).toEqual(mockResults);
      expect(mockMemoryModel.find).toHaveBeenCalled();
    });
    
    it('should use cache when available', async () => {
      const intent = 'find requirements about user authentication';
      const cachedResults = [mockMemory];
      
      mockSemanticCacheService.get.mockReturnValue(cachedResults);
      
      const result = await service.getBySemanticIntent(intent, { useCache: true });
      
      expect(result).toEqual(cachedResults);
      expect(mockSemanticCacheService.get).toHaveBeenCalled();
      expect(mockMemoryModel.find).not.toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      const intent = 'find requirements about user authentication';
      
      jest.spyOn<any, any>(service, 'getSemanticMediatorService').mockRejectedValue(new Error('Service unavailable'));
      
      const result = await service.getBySemanticIntent(intent);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('findSimilarMemories', () => {
    it('should find similar memories based on memory ID', async () => {
      const memoryId = 'test-id';
      const similarityThreshold = 0.7;
      
      const mockResults = [{ ...mockMemory, _id: 'similar-id-1' }, { ...mockMemory, _id: 'similar-id-2' }];
      
      mockMemoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemory)
      });
      
      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults)
      });
      
      const result = await service.findSimilarMemories(memoryId, similarityThreshold);
      
      expect(result).toEqual(mockResults);
      expect(mockMemoryModel.findById).toHaveBeenCalledWith(memoryId);
      expect(mockMemoryModel.find).toHaveBeenCalled();
    });
    
    it('should return empty array if source memory not found', async () => {
      const memoryId = 'non-existent-id';
      
      mockMemoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });
      
      const result = await service.findSimilarMemories(memoryId);
      
      expect(result).toEqual([]);
      expect(mockMemoryModel.findById).toHaveBeenCalledWith(memoryId);
      expect(mockMemoryModel.find).not.toHaveBeenCalled();
    });
  });
});
