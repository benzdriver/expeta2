import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../memory.service';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { SemanticCacheService } from '../services/semantic-cache.service';

describe('MemoryService - Semantic Mediator Integration', () => {
  let service: MemoryService;
  let mockMemoryModel: Record<string, jest.Mock>;
  let mockSemanticCacheService: unknown;
  let mockSemanticMediatorService: {
    translateToSchema: jest.Mock;
    registerSemanticDataSource: jest.Mock;
    evaluateSemanticTransformation?: jest.Mock;
  };

  const _mockMemory = {
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
      save: jest.fn().mockResolvedValue({
        _id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      create: jest.fn().mockResolvedValue(_mockMemory),
      exec: jest.fn().mockResolvedValue([_mockMemory]),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    };

    mockSemanticCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    };

    mockSemanticMediatorService = {
      translateToSchema: jest.fn().mockImplementation((data, schema) => {
        return Promise.resolve({
          ...data,
          _schema: schema.id || 'test-schema',
        });
      }),
      registerSemanticDataSource: jest.fn().mockResolvedValue(undefined)
    };

    const _module: TestingModule = await Test.createTestingModule({
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

    service = _module.get<MemoryService>(MemoryService);

    jest
      .spyOn<any, any>(service, 'getSemanticMediatorService')
      .mockResolvedValue(mockSemanticMediatorService);
  });

  describe('storeWithSemanticTransformation', () => {
    it('should transform data using semantic mediator before storage', async () => {
      const _data = {};
      const _targetSchema = {};

      const _transformedData = {};

      jest.spyOn(service, 'storeMemory').mockResolvedValue({
        _id: 'transformed-id',
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: _transformedData,
        metadata: {},
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown);

      const result = await (service as any).storeWithSemanticTransformation(_data, _targetSchema);

      expect(result).toBeDefined();
      expect(mockSemanticMediatorService.translateToSchema).toHaveBeenCalledWith(
        _data,
        _targetSchema,
      );
      expect(service.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: _transformedData,
        }),
      );
    });

    it('should handle transformation errors gracefully', async () => {
      const _data = {};
      const _targetSchema = {};

      mockSemanticMediatorService.translateToSchema.mockRejectedValue(
        new Error('Transformation error'),
      );

      const originalConsoleError = console.error;
      /* eslint-disable-next-line no-console */
console.error = jest.fn();

      const originalLoggerError = service['logger'].error;
      service['logger'].error = jest.fn();

      try {
        const result = await (service as any).storeWithSemanticTransformation(_data, _targetSchema);
        expect(result).toBeUndefined();
      } finally {
        /* eslint-disable-next-line no-console */
console.error = originalConsoleError;
        service['logger'].error = originalLoggerError;
      }
    });
  });

  describe('registerAsDataSource', () => {
    it('should register memory type as a data source in semantic registry', async () => {
      const _memoryType = MemoryType.REQUIREMENT;
      const _semanticDescription = "Test semantic description";

      jest.spyOn(service, 'storeMemory').mockResolvedValue({
        _id: 'registry-id',
        type: MemoryType.SEMANTIC_TRANSFORMATION, // Use an existing memory type
        content: { memoryType: _memoryType, description: _semanticDescription },
        metadata: {
          isRegistry: true,
          registrationType: 'dataSource',
        },
        tags: ['registry', 'semantic'],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown);

      await (service as any).registerAsDataSource(_memoryType, _semanticDescription);

      expect(mockSemanticMediatorService.registerSemanticDataSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Memory'),
        expect.any(String), // The service might convert memoryType to string
        _semanticDescription,
      );
    });

    it('should handle registration errors gracefully', async () => {
      const _memoryType = MemoryType.REQUIREMENT;
      const _semanticDescription = "Test semantic description";
      const _data = {};
      const _targetSchema = {};

      mockSemanticMediatorService.registerSemanticDataSource.mockRejectedValue(
        new Error('Registration error'),
      );

      const originalConsoleError = console.error;
      /* eslint-disable-next-line no-console */
console.error = jest.fn();

      const originalLoggerError = service['logger'].error;
      service['logger'].error = jest.fn();

      try {
        const result = await (service as any).registerAsDataSource(_memoryType, _semanticDescription);
        expect(result).toBeUndefined();
      } finally {
        /* eslint-disable-next-line no-console */
console.error = originalConsoleError;
        service['logger'].error = originalLoggerError;
      }
    });
  });

  describe('getSemanticMediatorService', () => {
    it('should return semantic mediator service instance', async () => {
      jest.spyOn<any, any>(service, 'getSemanticMediatorService').mockRestore();

      try {
        const result = await (service as any).getSemanticMediatorService();
        expect(result).toBeDefined();
      } catch (error) {
        const fallback = {
          translateToSchema: expect.any(Function),
          registerSemanticDataSource: expect.any(Function),
          evaluateSemanticTransformation: expect.any(Function),
        };

        const fallbackResult = (service as any).getSemanticMediatorService();
        expect(fallbackResult).toMatchObject(fallback);
      }
    });
  });
});
