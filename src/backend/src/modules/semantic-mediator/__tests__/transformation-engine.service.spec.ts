import { Test, TestingModule } from '@nestjs/testing';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { SemanticDescriptor } from '../interfaces/semantic-descriptor.interface';

describe('TransformationEngineService', () => {
  let service: TransformationEngineService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;

  beforeEach(async () => {
    const mockLlmRouterService = {
      generateContent: jest.fn().mockImplementation((prompt, options) => {
        if (prompt.includes('生成转换路径')) {
          return Promise.resolve(JSON.stringify({
            mappings: [
              { source: 'name', target: 'fullName' },
              { source: 'age', target: 'userAge', transform: { type: 'convert', params: { targetType: 'string' } } }
            ],
            transformations: [],
            recommendedStrategy: 'default'
          }));
        } else if (prompt.includes('执行转换')) {
          return Promise.resolve(JSON.stringify({
            success: true,
            data: { transformed: true, targetField: 'value', data: '{"key":"value"}' }
          }));
        } else if (prompt.includes('验证转换')) {
          return Promise.resolve(JSON.stringify({ valid: true, issues: [] }));
        } else if (prompt.includes('优化转换路径')) {
          return Promise.resolve(JSON.stringify({
            mappings: [
              { source: 'name', target: 'fullName' },
              { source: 'age', target: 'userAge', transform: { type: 'convert', params: { targetType: 'string' } } }
            ],
            transformations: [],
            recommendedStrategy: 'default'
          }));
        } else {
          return Promise.resolve('{}');
        }
      }),
    };

    const mockMemoryService = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      getRelatedMemories: jest.fn().mockResolvedValue([
        { content: { path: { steps: [{ type: 'transform', operation: 'rename' }] } } }
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformationEngineService,
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: mockMemoryService },
      ],
    }).compile();

    service = module.get<TransformationEngineService>(TransformationEngineService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
  });

  describe('generateTransformationPath', () => {
    it('should generate a transformation path between source and target descriptors', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'user',
        description: 'User entity with basic information',
        attributes: {
          name: { type: 'string', description: 'User name' },
          age: { type: 'number', description: 'User age' }
        }
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {
          fullName: { type: 'string', description: 'User full name' },
          userAge: { type: 'string', description: 'User age as string' }
        }
      };
      
      const context = { additionalInfo: 'context' };

      const result = await service.generateTransformationPath(
        sourceDescriptor,
        targetDescriptor,
        context
      );

      expect(result).toBeDefined();
      expect(result.mappings).toHaveLength(2);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('生成从源数据结构到目标数据结构的转换路径'),
        expect.any(Object)
      );
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: expect.objectContaining({
            sourceDescriptor,
            targetDescriptor,
            transformationPath: expect.any(Object),
          }),
        })
      );
    });

    it('should handle null or undefined source data', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'user',
        description: 'User entity with basic information',
        attributes: {}
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {}
      };
      
      const result = await service.generateTransformationPath(sourceDescriptor, targetDescriptor, null);
      
      expect(result).toBeDefined();
      expect(result.mappings).toBeInstanceOf(Array);
      expect(llmRouterService.generateContent).toHaveBeenCalled();
    });

    it('should handle empty object source data', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'user',
        description: 'User entity with basic information',
        attributes: {}
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {}
      };
      
      const result = await service.generateTransformationPath(sourceDescriptor, targetDescriptor, {});
      
      expect(result).toBeDefined();
      expect(result.mappings).toBeInstanceOf(Array);
      expect(llmRouterService.generateContent).toHaveBeenCalled();
    });

    it('should handle LLM service errors gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'user',
        description: 'User entity with basic information',
        attributes: {}
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {}
      };
      
      await expect(service.generateTransformationPath(sourceDescriptor, targetDescriptor, { key: 'value' }))
        .rejects.toThrow('Failed to generate transformation path');
    });

    it('should handle invalid LLM responses gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'user',
        description: 'User entity with basic information',
        attributes: {}
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {}
      };
      
      await expect(service.generateTransformationPath(sourceDescriptor, targetDescriptor, { key: 'value' }))
        .rejects.toThrow('Failed to generate transformation path');
    });
  });

  describe('executeTransformation', () => {
    it('should execute a transformation path on the provided data', async () => {
      const data = { sourceField: 'value', otherField: 123 };
      const path = {
        mappings: [
          { source: 'sourceField', target: 'targetField' }
        ],
        transformations: [],
        recommendedStrategy: 'default'
      };
      const context = { additionalInfo: 'context' };

      const result = await service.executeTransformation(data, path, context);

      expect(result).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('执行转换'),
        expect.any(Object)
      );
    });

    it('should handle null or undefined data', async () => {
      const path = {
        mappings: [{ source: 'sourceField', target: 'targetField' }],
        transformations: [],
        recommendedStrategy: 'default'
      };
      
      
      const result = await service.executeTransformation(null, path);
      
      expect(result).toBeDefined();
    });

    it('should handle empty transformation path', async () => {
      const data = { key: 'value' };
      const path = { mappings: [], transformations: [] };
      
      const emptyPath = { mappings: [], transformations: [] };
      const result = await service.executeTransformation(data, emptyPath);
      
      expect(result).toBeDefined();
    });

    it('should handle LLM service errors gracefully', async () => {
      const data = { key: 'value' };
      const path = { 
        mappings: [{ source: 'sourceField', target: 'targetField' }],
        transformations: [],
        recommendedStrategy: 'llm'
      };
      
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      await expect(service.executeTransformation(data, path))
        .rejects.toThrow('Failed to execute transformation');
    });

    it('should handle invalid LLM responses gracefully', async () => {
      const data = { key: 'value' };
      const path = { 
        mappings: [{ source: 'sourceField', target: 'targetField' }],
        transformations: [],
        recommendedStrategy: 'llm'
      };
      
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      await expect(service.executeTransformation(data, path))
        .rejects.toThrow('Failed to execute transformation');
    });
  });

  describe('validateTransformation', () => {
    it('should validate a transformation result', async () => {
      const result = {
        fullName: 'John Doe',
        userAge: '30'
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {
          fullName: { type: 'string', description: 'User full name' },
          userAge: { type: 'string', description: 'User age as string' }
        }
      };
      
      const context = { additionalInfo: 'context' };
      
      const validationResult = await service.validateTransformation(
        result,
        targetDescriptor,
        context
      );

      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBe(true);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('验证转换结果是否符合目标结构描述'),
        expect.any(Object)
      );
    });

    it('should handle null or undefined data', async () => {
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {}
      };
      
      const result = await service.validateTransformation(null, targetDescriptor);
      
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalled();
    });

    it('should handle LLM service errors gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      const result = { fullName: 'John Doe' };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {}
      };
      
      await expect(service.validateTransformation(result, targetDescriptor))
        .rejects.toThrow('Failed to validate transformation');
    });

    it('should handle invalid LLM responses gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      const result = { fullName: 'John Doe' };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'profile',
        description: 'Profile entity with formatted user information',
        attributes: {}
      };
      
      await expect(service.validateTransformation(result, targetDescriptor))
        .rejects.toThrow('Failed to validate transformation');
    });
  });

  describe('optimizeTransformationPath', () => {
    it('should optimize a transformation path', async () => {
      const path = {
        mappings: [
          { source: 'name', target: 'fullName' },
          { source: 'age', target: 'userAge', transform: { type: 'convert', params: { targetType: 'string' } } }
        ],
        transformations: []
      };
      const context = { additionalInfo: 'context' };

      const mockOptimizedPath = {
        mappings: [
          { source: 'name', target: 'fullName' },
          { source: 'age', target: 'userAge', transform: { type: 'convert', params: { targetType: 'string' } } }
        ],
        transformations: [],
        recommendedStrategy: 'default'
      };
      
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce(JSON.stringify(mockOptimizedPath));

      const result = await service.optimizeTransformationPath(path, context);

      expect(result).toBeDefined();
      expect(result).toEqual(mockOptimizedPath);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('优化以下转换路径'),
        expect.any(Object)
      );
    });

    it('should handle empty transformation path', async () => {
      const path = { mappings: [], transformations: [] };
      
      const mockOptimizedPath = {
        mappings: [],
        transformations: [],
        recommendedStrategy: 'default'
      };
      
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce(JSON.stringify(mockOptimizedPath));
      
      const result = await service.optimizeTransformationPath(path);
      
      expect(result).toBeDefined();
      expect(result).toEqual(mockOptimizedPath);
    });

    it('should handle LLM service errors gracefully', async () => {
      const path = { mappings: [{ source: 'name', target: 'fullName' }], transformations: [] };
      
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      await expect(service.optimizeTransformationPath(path))
        .rejects.toThrow('Failed to optimize transformation path');
    });

    it('should handle invalid LLM responses gracefully', async () => {
      const path = { mappings: [{ source: 'name', target: 'fullName' }], transformations: [] };
      
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      await expect(service.optimizeTransformationPath(path))
        .rejects.toThrow('Failed to optimize transformation path');
    });
  });

  describe('getAvailableTransformationStrategies', () => {
    it('should return available transformation strategies', async () => {
      const strategies = await service.getAvailableTransformationStrategies();
      
      expect(strategies).toBeDefined();
      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
    });
  });

  describe('registerTransformationStrategy', () => {
    it('should register a new transformation strategy', async () => {
      const strategyName = 'testStrategy';
      const strategyFn = jest.fn().mockResolvedValue({});
      
      const result = await service.registerTransformationStrategy(strategyName, strategyFn);
      
      expect(result).toBe(true);
      
      const strategies = await service.getAvailableTransformationStrategies();
      expect(strategies).toContain(strategyName);
    });

    it('should not register a strategy with an existing name', async () => {
      const strategyName = 'existingStrategy';
      const strategyFn1 = jest.fn().mockResolvedValue({});
      const strategyFn2 = jest.fn().mockResolvedValue({});
      
      await service.registerTransformationStrategy(strategyName, strategyFn1);
      const result = await service.registerTransformationStrategy(strategyName, strategyFn2);
      
      expect(result).toBe(true);
      
      const strategies = await service.getAvailableTransformationStrategies();
      expect(strategies).toContain(strategyName);
    });
  });
});
