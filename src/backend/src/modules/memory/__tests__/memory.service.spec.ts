import { Test, TestingModule } from '@nestjs/testing';
import { MemoryService } from '../memory.service';
import { getModelToken } from '@nestjs/mongoose';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { Logger } from '@nestjs/common';
import { SemanticCacheService } from '../services/semantic-cache.service';

describe('MemoryService', () => {
  let service: MemoryService;
  let mockMemoryModel: any;

  const mockMemory = {
    _id: 'test-id',
    type: MemoryType.REQUIREMENT,
    content: {
      _id: 'req-123',
      title: 'Test Requirement',
      text: 'This is a test requirement',
      status: 'active',
    },
    metadata: {
      title: 'Test Requirement',
      status: 'active',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue({
      _id: 'test-id',
      type: MemoryType.REQUIREMENT,
      content: {
        _id: 'req-123',
        title: 'Test Requirement',
        text: 'This is a test requirement',
        status: 'active',
      },
      metadata: {
        title: 'Test Requirement',
        status: 'active',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
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

    mockMemoryModel.find = jest.fn();
    mockMemoryModel.findOne = jest.fn();
    mockMemoryModel.findById = jest.fn();
    mockMemoryModel.deleteOne = jest.fn();
    mockMemoryModel.create = jest.fn().mockImplementation((data) =>
      Promise.resolve({
        ...data,
        _id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    mockMemoryModel.exec = jest.fn();

    const mockSemanticCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalEntries: 0,
        activeEntries: 0,
        expiredEntries: 0,
        avgRelevance: 0,
        avgAccessCount: 0,
      }),
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
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeRequirement', () => {
    it('should store a requirement successfully', async () => {
      const requirement = {
        _id: 'req-123',
        title: 'Test Requirement',
        text: 'This is a test requirement',
        status: 'active',
      };

      mockMemoryModel.mockImplementationOnce((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type: MemoryType.REQUIREMENT,
          content: requirement,
          metadata: {
            title: requirement.title,
            status: requirement.status,
            domain: 'general',
            createdBy: 'system',
            sessionId: null,
            timestamp: expect.any(String),
          },
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      }));

      const result = await service.storeRequirement(requirement);
      expect(result).toBeDefined();
      expect(result.type).toBe(MemoryType.REQUIREMENT);
      expect(result.content).toEqual(requirement);
    });

    it('should handle errors when storing a requirement', async () => {
      const requirement = {
        _id: 'req-123',
        title: 'Test Requirement',
        text: 'This is a test requirement',
        status: 'active',
      };

      mockMemoryModel.mockImplementationOnce((data) => ({
        ...data,
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      await expect(service.storeRequirement(requirement)).rejects.toThrow('Database error');
    });
  });

  describe('updateRequirement', () => {
    it('should update an existing requirement', async () => {
      const requirement = {
        _id: 'req-123',
        title: 'Updated Requirement',
        text: 'This is an updated requirement',
        status: 'in-progress',
      };

      mockMemoryModel.findOne = jest.fn().mockResolvedValue({
        ...mockMemory,
        metadata: {
          title: 'Test Requirement',
          status: 'active',
          updateCount: 1,
        },
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type: MemoryType.REQUIREMENT,
          content: requirement,
          metadata: {
            title: requirement.title,
            status: requirement.status,
            updateCount: 2,
            lastUpdatedBy: 'system',
            updateTimestamp: expect.any(String),
          },
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });

      const result = await service.updateRequirement(requirement);
      expect(result).toBeDefined();
      expect(result.content).toEqual(requirement);
      expect(result.metadata.updateCount).toBe(2);
    });

    it('should create a new requirement if not found', async () => {
      const requirement = {
        _id: 'req-123',
        title: 'New Requirement',
        text: 'This is a new requirement',
        status: 'active',
      };

      mockMemoryModel.findOne = jest.fn().mockResolvedValue(null);

      jest.spyOn(service, 'storeRequirement').mockResolvedValue({
        _id: 'test-id',
        type: MemoryType.REQUIREMENT,
        content: requirement,
        metadata: {
          title: requirement.title,
          status: requirement.status,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.updateRequirement(requirement);
      expect(result).toBeDefined();
      expect(service.storeRequirement).toHaveBeenCalledWith(requirement);
    });
  });

  describe('deleteRequirement', () => {
    it('should delete a requirement successfully', async () => {
      const requirementId = 'req-123';

      mockMemoryModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await service.deleteRequirement(requirementId);
      expect(mockMemoryModel.deleteOne).toHaveBeenCalledWith({
        type: MemoryType.REQUIREMENT,
        'content._id': requirementId,
      });
    });

    it('should handle errors when deleting a requirement', async () => {
      const requirementId = 'req-123';

      mockMemoryModel.deleteOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(service.deleteRequirement(requirementId)).rejects.toThrow('Database error');
    });
  });

  describe('getRelatedMemories', () => {
    it('should return related memories based on query', async () => {
      const query = 'test';
      const mockResults = [mockMemory, { ...mockMemory, _id: 'test-id-2' }];

      mockMemoryModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockResults),
          }),
        }),
      });

      const result = await service.getRelatedMemories(query);
      expect(result).toEqual(mockResults);

      const expectedQuery = {
        $or: [
          { 'metadata.title': { $regex: query, $options: 'i' } },
          { 'content.text': { $regex: query, $options: 'i' } },
          { 'content.description': { $regex: query, $options: 'i' } },
          { 'semanticMetadata.description': { $regex: query, $options: 'i' } },
        ],
      };

      expect(mockMemoryModel.find).toHaveBeenCalledWith(expect.objectContaining(expectedQuery));
    });
  });

  describe('getMemoryByType', () => {
    it('should return memories of specified type', async () => {
      const type = MemoryType.EXPECTATION;
      const mockResults = [
        { ...mockMemory, type: MemoryType.EXPECTATION },
        { ...mockMemory, _id: 'test-id-2', type: MemoryType.EXPECTATION },
      ];

      mockMemoryModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockResults),
          }),
        }),
      });

      const result = await service.getMemoryByType(type);
      expect(result).toEqual(mockResults);
      expect(mockMemoryModel.find).toHaveBeenCalledWith({ type });
    });
  });

  describe('storeExpectation', () => {
    it('should store an expectation successfully', async () => {
      const expectation = {
        requirementId: 'req-123',
        title: 'Test Expectation',
        version: 1,
        semanticTracking: { key: 'value' },
      };

      mockMemoryModel.mockImplementationOnce((data) => ({
        ...data,
        type: MemoryType.EXPECTATION,
        content: expectation,
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type: MemoryType.EXPECTATION,
          content: expectation,
          metadata: {
            requirementId: expectation.requirementId,
            title: expectation.title,
            version: expectation.version,
            semanticTracking: expectation.semanticTracking,
            createdBy: 'system',
            timestamp: expect.any(String),
          },
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      }));

      const result = await service.storeExpectation(expectation);
      expect(result).toBeDefined();
      expect(result.type).toBe(MemoryType.EXPECTATION);
      expect(result.content).toEqual(expectation);
    });
  });

  describe('storeMemory', () => {
    it('should store a generic memory entry', async () => {
      const data = {
        type: MemoryType.CODE,
        content: { code: 'console.log("test")' },
        metadata: { language: 'javascript' },
        tags: ['code', 'test'],
      };

      mockMemoryModel.mockImplementationOnce((modelData) => ({
        ...modelData,
        type: data.type,
        content: data.content,
        metadata: {
          ...data.metadata,
          storedAt: expect.any(String),
          contentType: 'object',
        },
        tags: data.tags,
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type: data.type,
          content: data.content,
          metadata: {
            ...data.metadata,
            storedAt: expect.any(String),
            contentType: 'object',
          },
          tags: data.tags,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      }));

      const result = await service.storeMemory(data);
      expect(result).toBeDefined();
      expect(result.type).toBe(data.type);
      expect(result.content).toEqual(data.content);
      expect(result.tags).toEqual(data.tags);
    });
  });

  describe('updateMemory', () => {
    it('should update an existing memory entry', async () => {
      const type = MemoryType.CODE;
      const contentId = 'code-123';
      const data = {
        content: { code: 'console.log("updated")' },
        metadata: { language: 'javascript', version: 2 },
        tags: ['code', 'updated'],
      };

      mockMemoryModel.findOne = jest.fn().mockResolvedValue({
        ...mockMemory,
        type,
        content: { _id: contentId, code: 'console.log("test")' },
        metadata: {
          language: 'javascript',
          version: 1,
          updateHistory: [],
        },
        tags: ['code', 'test'],
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type,
          content: data.content,
          metadata: {
            ...data.metadata,
            lastUpdatedAt: expect.any(String),
            updateHistory: [
              {
                timestamp: expect.any(String),
                updatedFields: ['code'],
              },
            ],
          },
          tags: data.tags,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });

      const result = await service.updateMemory(type, contentId, data);
      expect(result).toBeDefined();
      expect(result.content).toEqual(data.content);
      expect(result.tags).toEqual(data.tags);
      expect(result.metadata.updateHistory).toHaveLength(1);
    });

    it('should create a new memory entry if not found', async () => {
      const type = MemoryType.CODE;
      const contentId = 'code-123';
      const data = {
        content: { code: 'console.log("new")' },
        metadata: { language: 'javascript' },
        tags: ['code', 'new'],
      };

      mockMemoryModel.findOne = jest.fn().mockResolvedValue(null);

      jest.spyOn(service, 'storeMemory').mockResolvedValue({
        _id: 'test-id',
        type,
        content: data.content,
        metadata: data.metadata,
        tags: data.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.updateMemory(type, contentId, data);
      expect(result).toBeDefined();
      expect(service.storeMemory).toHaveBeenCalledWith({
        type,
        content: data.content,
        metadata: data.metadata,
        tags: data.tags,
      });
    });
  });
});
