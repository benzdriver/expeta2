import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../memory.service';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { SemanticCacheService } from '../services/semantic-cache.service';

describe('MemoryService - Semantic Mediator Integration', () => {
  let service: MemoryService;
  let mockMemoryModel: unknown;
  let mockSemanticCacheService: unknown;
  let mockSemanticMediatorService: unknown;

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
    mockMemoryModel = jest.fn().mockImplementation((data) => {
      return {
        ...data,
        save: jest.fn().mockResolvedValue({
          ...data,
          _id: 'test-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };
    });

    mockMemoryModel.find = jest.fn().mockReturnThis();
    mockMemoryModel.findById = jest.fn().mockReturnThis();
    mockMemoryModel.findOne = jest.fn().mockReturnThis();
    mockMemoryModel.create = jest.fn().mockResolvedValue(_mockMemory);
    mockMemoryModel.exec = jest.fn().mockResolvedValue([_mockMemory]);
    mockMemoryModel.sort = jest.fn().mockReturnThis();
    mockMemoryModel.limit = jest.fn().mockReturnThis();

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
          _schema: schema.id || 'test-schema',
        });
      }),
      registerSemanticDataSource: jest.fn().mockResolvedValue(undefined),
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

      const _result = 

      expect(_result).toBeDefined();
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

      const _originalConsoleError = 
      /* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
console.error = jest.fn();

      const _originalLoggerError = 
      service['logger'].error = jest.fn();

      try {
        const _result = 
        expect(_result).toBeUndefined();
      } finally {
        /* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
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
        content: { memoryType, description: semanticDescription },
        metadata: {
          isRegistry: true,
          registrationType: 'dataSource',
        },
        tags: ['registry', 'semantic'],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown);

      await service.registerAsDataSource(memoryType, semanticDescription);

      expect(mockSemanticMediatorService.registerSemanticDataSource).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Memory'),
        expect.any(String), // The service might convert memoryType to string
        semanticDescription,
      );
    });

    it('should handle registration errors gracefully', async () => {
      const _memoryType = MemoryType.REQUIREMENT;
      const _semanticDescription = "Test semantic description";

      mockSemanticMediatorService.registerSemanticDataSource.mockRejectedValue(
        new Error('Registration error'),
      );

      const _originalConsoleError = 
      /* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
console.error = jest.fn();

      const _originalLoggerError = 
      service['logger'].error = jest.fn();

      try {
        const _result = 
        expect(_result).toBeUndefined();
      } finally {
        /* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
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
        const _result = 
        expect(_result).toBeDefined();
      } catch (error) {
        const _fallback = {
          translateToSchema: expect.any(Function),
          registerSemanticDataSource: expect.any(Function),
          evaluateSemanticTransformation: expect.any(Function),
        };

        const _result = 
        expect(_result).toMatchObject(fallback);
      }
    });
  });
});
