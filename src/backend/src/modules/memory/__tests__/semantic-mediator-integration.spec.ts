import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../memory.service';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { SemanticCacheService } from '../services/semantic-cache.service';

describe('MemoryService - Semantic Mediator Integration', () => {
  let service: MemoryService;
  let mockMemoryModel: any;
  let mockSemanticCacheService: any;
  let mockSemanticMediatorService: any;

  const mockMemory = {
    _id: 'test-id',
    type: MemoryType.REQUIREMENT,
    content: { text: 'Test requirement' },
    metadata: { title: 'Test' },
    tags: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockMemoryModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      create: jest.fn().mockResolvedValue(mockMemory),
      exec: jest.fn().mockResolvedValue([mockMemory]),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      new: jest.fn().mockImplementation(() => ({
        ...mockMemory,
        save: jest.fn().mockResolvedValue(mockMemory)
      })),
    };

    mockSemanticCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    mockSemanticMediatorService = {
      translateToSchema: jest.fn().mockImplementation((data, schema) => {
        return Promise.resolve({
          ...data,
          _schema: schema.id || 'test-schema'
        });
      }),
      registerSemanticDataSource: jest.fn().mockResolvedValue(undefined)
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

  describe('storeWithSemanticTransformation', () => {
    it('should transform data using semantic mediator before storage', async () => {
      const data = { text: 'Original text' };
      const targetSchema = { id: 'target-schema', fields: ['text'] };
      
      const transformedData = { text: 'Original text', _schema: 'target-schema' };
      
      jest.spyOn(service, 'storeMemory').mockResolvedValue({
        _id: 'transformed-id',
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: transformedData,
        metadata: {},
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      
      const result = await service.storeWithSemanticTransformation(data, targetSchema);
      
      expect(result).toBeDefined();
      expect(mockSemanticMediatorService.translateToSchema).toHaveBeenCalledWith(data, targetSchema);
      expect(service.storeMemory).toHaveBeenCalledWith(expect.objectContaining({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: transformedData
      }));
    });
    
    it('should handle transformation errors gracefully', async () => {
      const data = { text: 'Original text' };
      const targetSchema = { id: 'target-schema', fields: ['text'] };
      
      mockSemanticMediatorService.translateToSchema.mockRejectedValue(new Error('Transformation error'));
      
      await expect(service.storeWithSemanticTransformation(data, targetSchema)).rejects.toThrow('Transformation error');
    });
  });
  
  describe('registerAsDataSource', () => {
    it('should register memory type as a data source in semantic registry', async () => {
      const memoryType = MemoryType.REQUIREMENT;
      const semanticDescription = 'Requirements data source for project needs';
      
      await service.registerAsDataSource(memoryType, semanticDescription);
      
      expect(mockSemanticMediatorService.registerSemanticDataSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Memory'),
        memoryType,
        semanticDescription,
        expect.any(Object)
      );
    });
    
    it('should handle registration errors gracefully', async () => {
      const memoryType = MemoryType.REQUIREMENT;
      const semanticDescription = 'Requirements data source for project needs';
      
      mockSemanticMediatorService.registerSemanticDataSource.mockRejectedValue(new Error('Registration error'));
      
      await expect(service.registerAsDataSource(memoryType, semanticDescription)).rejects.toThrow('Registration error');
    });
  });
  
  describe('getSemanticMediatorService', () => {
    it('should return semantic mediator service instance', async () => {
      jest.spyOn<any, any>(service, 'getSemanticMediatorService').mockRestore();
      
      try {
        const result = await service['getSemanticMediatorService']();
        expect(result).toBeDefined();
      } catch (error) {
        const fallback = {
          translateToSchema: expect.any(Function),
          registerSemanticDataSource: expect.any(Function),
          evaluateSemanticTransformation: expect.any(Function)
        };
        
        const result = await service['getSemanticMediatorService']();
        expect(result).toMatchObject(fallback);
      }
    });
  });
});
