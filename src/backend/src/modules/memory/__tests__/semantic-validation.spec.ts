import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../memory.service';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { SemanticCacheService } from '../services/semantic-cache.service';
import { ValidationResult, SemanticConstraint } from '../interfaces/semantic-memory.interfaces';
import { Model } from 'mongoose';

describe('MemoryService - Semantic Validation', () => {
  let service: MemoryService;
  let mockMemoryModel: any;
  let mockSemanticCacheService: any;

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
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      findByIdAndDelete: jest.fn().mockReturnThis(),
      create: jest.fn().mockResolvedValue(mockMemory),
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
  });

  it('should validate data with no constraints', async () => {
    jest.spyOn<any, any>(service, 'getSemanticConstraints').mockResolvedValue([]);

    const data = { text: 'Test data' };
    const result = await service.validateSemanticConsistency(data, MemoryType.REQUIREMENT);

    expect(result.isValid).toBe(true);
    expect(result.score).toBe(100);
    expect(result.messages.length).toBe(1);
    expect(result.messages[0].type).toBe('info');
  });

  it('should validate data with constraints using validation function', async () => {
    const constraints: SemanticConstraint[] = [
      {
        field: 'text',
        constraint: 'Text should not be empty',
        validationFn: (value) => value && value.length > 0,
        severity: 'error',
      },
    ];

    jest.spyOn<any, any>(service, 'getSemanticConstraints').mockResolvedValue(constraints);

    const validData = { text: 'Valid text' };
    const validResult = await service.validateSemanticConsistency(validData, MemoryType.REQUIREMENT);

    expect(validResult.isValid).toBe(true);
    expect(validResult.score).toBe(100);
    expect(validResult.messages.length).toBe(0);

    const invalidData = { text: '' };
    const invalidResult = await service.validateSemanticConsistency(invalidData, MemoryType.REQUIREMENT);

    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.score).toBe(0);
    expect(invalidResult.messages.length).toBe(1);
    expect(invalidResult.messages[0].type).toBe('error');
  });

  it('should handle validation errors gracefully', async () => {
    const constraints: SemanticConstraint[] = [
      {
        field: 'text',
        constraint: 'Text should be valid',
        validationFn: () => { throw new Error('Validation error'); },
        severity: 'error',
      },
    ];

    jest.spyOn<any, any>(service, 'getSemanticConstraints').mockResolvedValue(constraints);

    const data = { text: 'Test data' };
    const result = await service.validateSemanticConsistency(data, MemoryType.REQUIREMENT);

    expect(result.isValid).toBe(true); // No error messages, so still valid
    expect(result.messages.length).toBe(1);
    expect(result.messages[0].type).toBe('warning');
  });

  it('should generate suggested fixes for invalid data', async () => {
    const constraints: SemanticConstraint[] = [
      {
        field: 'text',
        constraint: 'Text should be descriptive',
        validationFn: (value) => value && value.length > 10,
        severity: 'error',
      },
    ];

    jest.spyOn<any, any>(service, 'getSemanticConstraints').mockResolvedValue(constraints);

    const invalidData = { text: 'Short' };
    const result = await service.validateSemanticConsistency(invalidData, MemoryType.REQUIREMENT);

    expect(result.isValid).toBe(false);
    expect(result.suggestedFixes).toBeDefined();
    expect(result.suggestedFixes.text).toBeDefined();
    expect(result.suggestedFixes.text.original).toBe('Short');
  });
});
