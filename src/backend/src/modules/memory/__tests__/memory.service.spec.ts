import { Test, TestingModule } from '@nestjs/testing';
import { MemoryService } from '../memory.service';
import { getModelToken } from '@nestjs/mongoose';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { Logger } from '@nestjs/common';
import { SemanticCacheService } from '../services/semantic-cache.service';

describe('MemoryService', () => {
  let service: MemoryService;
  let mockMemoryModel: Record<string, jest.Mock>;

  const _mockMemory = {
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
    mockMemoryModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      deleteOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => {
        return {
          ...data,
          save: jest.fn().mockResolvedValue({
            ...data,
            _id: 'test-id',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        };
      }),
      exec: jest.fn(),
    };

    const _mockSemanticCacheService = {
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

    const _module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        {
          provide: getModelToken(Memory.name),
          useValue: mockMemoryModel,
        },
        {
          provide: SemanticCacheService,
          useValue: _mockSemanticCacheService,
        },
      ],
    }).compile();

    service = _module.get<MemoryService>(MemoryService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeRequirement', () => {
    it('should store a requirement successfully', async () => {
      const _requirement = {
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
          content: _requirement,
          metadata: {
            title: _requirement.title,
            status: _requirement.status,
            domain: 'general',
            createdBy: 'system',
            sessionId: null,
            timestamp: expect.any(String),
          },
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      }));

      const _result = await service.storeRequirement(_requirement);
      expect(_result).toBeDefined();
      expect(_result.type).toBe(MemoryType.REQUIREMENT);
      expect(_result.content).toEqual(_requirement);
    });

    it('should handle errors when storing a requirement', async () => {
      const _requirement = {
        _id: 'req-123',
        title: 'Test Requirement',
        text: 'This is a test requirement',
        status: 'active',
      };

      mockMemoryModel.mockImplementationOnce((data) => ({
        ...data,
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      await expect(service.storeRequirement(_requirement)).rejects.toThrow('Database error');
    });
  });

  describe('updateRequirement', () => {
    it('should update an existing requirement', async () => {
      const _requirement = {
        _id: 'req-123',
        title: 'Updated Requirement',
        text: 'This is an updated requirement',
        status: 'in-progress',
      };

      mockMemoryModel.findOne = jest.fn().mockResolvedValue({
        ..._mockMemory,
        metadata: {
          title: 'Test Requirement',
          status: 'active',
          updateCount: 1,
        },
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type: MemoryType.REQUIREMENT,
          content: _requirement,
          metadata: {
            title: _requirement.title,
            status: _requirement.status,
            updateCount: 2,
            lastUpdatedBy: 'system',
            updateTimestamp: expect.any(String),
          },
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });

      const _result = await service.updateRequirement(_requirement._id);
      expect(_result).toBeDefined();
      expect(_result.content).toEqual(_requirement);
      expect(_result.metadata.updateCount).toBe(2);
    });

    it('should create a new requirement if not found', async () => {
      const _requirement = {
        _id: 'req-123',
        title: 'New Requirement',
        text: 'This is a new requirement',
        status: 'active',
      };

      mockMemoryModel.findOne = jest.fn().mockResolvedValue(null);

      jest.spyOn(service, 'storeRequirement').mockResolvedValue({
        _id: 'test-id',
        type: MemoryType.REQUIREMENT,
        content: _requirement,
        metadata: {
          title: _requirement.title,
          status: _requirement.status,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Memory);

      const _result = await service.updateRequirement(_requirement._id);
      expect(_result).toBeDefined();
      expect(service.storeRequirement).toHaveBeenCalledWith(_requirement);
    });
  });

  describe('deleteRequirement', () => {
    it('should delete a requirement successfully', async () => {
      const _requirementId = 'req-123';

      mockMemoryModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await service.deleteRequirement(_requirementId);
      expect(mockMemoryModel.deleteOne).toHaveBeenCalledWith({
        type: MemoryType.REQUIREMENT,
        'content._id': _requirementId,
      });
    });

    it('should handle errors when deleting a requirement', async () => {
      const _requirementId = 'req-123';

      mockMemoryModel.deleteOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(service.deleteRequirement(_requirementId)).rejects.toThrow('Database error');
    });
  });

  describe('getRelatedMemories', () => {
    it('should return related memories based on query', async () => {
      const _query = 'test query';
      const _mockResults = [{ ..._mockMemory, content: { text: 'test query result' } }];

      mockMemoryModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(_mockResults),
          }),
        }),
      });

      const _result = await service.getRelatedMemories(_query);
      expect(_result).toEqual(_mockResults);

      const _expectedQuery = {
        $or: [
          { 'metadata.title': { $regex: _query, $options: 'i' } },
          { 'content.text': { $regex: _query, $options: 'i' } },
          { 'content.description': { $regex: _query, $options: 'i' } },
          { 'semanticMetadata.description': { $regex: _query, $options: 'i' } },
        ],
      };

      expect(mockMemoryModel.find).toHaveBeenCalledWith(expect.objectContaining(_expectedQuery));
    });
  });

  describe('getMemoryByType', () => {
    it('should return memories of specified type', async () => {
      const _type = MemoryType.EXPECTATION;
      const _mockResults = [
        { ..._mockMemory, type: MemoryType.EXPECTATION },
        { ..._mockMemory, _id: 'test-id-2', type: MemoryType.EXPECTATION },
      ];

      mockMemoryModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(_mockResults),
          }),
        }),
      });

      const _result = await service.getMemoryByType(_type);
      expect(_result).toEqual(_mockResults);
      expect(mockMemoryModel.find).toHaveBeenCalledWith({ type: _type });
    });
  });

  describe('storeExpectation', () => {
    it('should store an expectation successfully', async () => {
      const _expectation = {
        requirementId: 'req-123',
        title: 'Test Expectation',
        version: 1,
        semanticTracking: { key: 'value' },
      };

      mockMemoryModel.mockImplementationOnce((data) => ({
        ...data,
        type: MemoryType.EXPECTATION,
        content: _expectation,
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type: MemoryType.EXPECTATION,
          content: _expectation,
          metadata: {
            requirementId: _expectation.requirementId,
            title: _expectation.title,
            version: _expectation.version,
            semanticTracking: _expectation.semanticTracking,
            createdBy: 'system',
            timestamp: expect.any(String),
          },
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      }));

      const _result = await service.storeExpectation(_expectation);
      expect(_result).toBeDefined();
      expect(_result.type).toBe(MemoryType.EXPECTATION);
      expect(_result.content).toEqual(_expectation);
    });
  });

  describe('storeMemory', () => {
    it('should store a generic memory entry', async () => {
      const _data = {
        type: MemoryType.CODE,
        content: {
          code: '/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\nconsole.log("test")',
        },
        metadata: { language: 'javascript' },
        tags: ['code', 'test'],
      };

      mockMemoryModel.mockImplementationOnce((modelData) => ({
        ...modelData,
        type: _data.type,
        content: _data.content,
        metadata: {
          ..._data.metadata,
          storedAt: expect.any(String),
          contentType: 'object',
        },
        tags: _data.tags,
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type: _data.type,
          content: _data.content,
          metadata: {
            ..._data.metadata,
            storedAt: expect.any(String),
            contentType: 'object',
          },
          tags: _data.tags,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      }));

      const _result = await service.storeMemory(_data);
      expect(_result).toBeDefined();
      expect(_result.type).toBe(_data.type);
      expect(_result.content).toEqual(_data.content);
      expect(_result.tags).toEqual(_data.tags);
    });
  });

  describe('updateMemory', () => {
    it('should update an existing memory entry', async () => {
      const _type = MemoryType.CODE;
      const _contentId = 'code-123';
      const _data = {
        content: {
          code: '/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\nconsole.log("updated")',
        },
        metadata: { language: 'javascript', version: 2 },
        tags: ['code', 'updated'],
      };

      mockMemoryModel.findOne = jest.fn().mockResolvedValue({
        ..._mockMemory,
        type: _type,
        content: {
          _id: _contentId,
          code: '/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\nconsole.log("test")',
        },
        metadata: {
          language: 'javascript',
          version: 1,
          updateHistory: [],
        },
        tags: ['code', 'test'],
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          type: _type,
          content: _data.content,
          metadata: {
            ..._data.metadata,
            lastUpdatedAt: expect.any(String),
            updateHistory: [
              {
                timestamp: expect.any(String),
                updatedFields: ['code'],
              },
            ],
          },
          tags: _data.tags,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });

      const _result = await service.updateMemory(_type, _contentId, _data);
      expect(_result).toBeDefined();
      expect(_result.content).toEqual(_data.content);
      expect(_result.tags).toEqual(_data.tags);
      expect(_result.metadata.updateHistory).toHaveLength(1);
    });

    it('should create a new memory entry if not found', async () => {
      const _type = MemoryType.CODE;
      const _contentId = 'code-123';
      const _data = {
        content: {
          code: '/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\nconsole.log("new")',
        },
        metadata: { language: 'javascript' },
        tags: ['code', 'new'],
      };

      mockMemoryModel.findOne = jest.fn().mockResolvedValue(null);

      jest.spyOn(service, 'storeMemory').mockResolvedValue({
        _id: 'test-id',
        type: _type,
        content: _data.content,
        metadata: _data.metadata,
        tags: _data.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown);

      const _result = await service.updateMemory(_type, _contentId, _data);
      expect(_result).toBeDefined();
      expect(service.storeMemory).toHaveBeenCalledWith({
        type: _type,
        content: _data.content,
        metadata: _data.metadata,
        tags: _data.tags,
      });
    });
  });
});
