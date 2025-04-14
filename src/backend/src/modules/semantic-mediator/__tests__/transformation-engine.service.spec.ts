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
            steps: [
              { type: 'transform', operation: 'rename', from: 'sourceField', to: 'targetField' },
              { type: 'transform', operation: 'format', field: 'data', format: 'json' }
            ]
          }));
        } else if (prompt.includes('执行转换')) {
          return Promise.resolve(JSON.stringify({
            success: true,
            data: { transformed: true, targetField: 'value', data: '{"key":"value"}' }
          }));
        } else if (prompt.includes('验证转换')) {
          return Promise.resolve(JSON.stringify({ valid: true }));
        } else if (prompt.includes('优化转换路径')) {
          return Promise.resolve(JSON.stringify({
            steps: [
              { type: 'transform', operation: 'rename_and_format', from: 'sourceField', to: 'targetField', format: 'json' }
            ]
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
        steps: [
          { type: 'transform', operation: 'rename', from: 'sourceField', to: 'targetField' },
          { type: 'transform', operation: 'format', field: 'data', format: 'json' }
        ]
      };
      const context = { additionalInfo: 'context' };

      const result = await service.executeTransformation(data, path, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('transformed', true);
      expect(result.data).toHaveProperty('targetField', 'value');
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('执行转换'),
        expect.any(Object)
      );
    });

    it('should handle null or undefined data', async () => {
      const path = {
        steps: [{ type: 'transform', operation: 'rename' }]
      };
      
      const result = await service.executeTransformation(null, path);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalled();
    });

    it('should handle empty transformation path', async () => {
      const data = { key: 'value' };
      const path = { steps: [] };
      
      const result = await service.executeTransformation(data, path);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should handle LLM service errors gracefully', async () => {
      const data = { key: 'value' };
      const path = { steps: [{ type: 'transform', operation: 'rename' }] };
      
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      await expect(service.executeTransformation(data, path))
        .rejects.toThrow('Failed to execute transformation');
    });

    it('should handle invalid LLM responses gracefully', async () => {
      const data = { key: 'value' };
      const path = { steps: [{ type: 'transform', operation: 'rename' }] };
      
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      await expect(service.executeTransformation(data, path))
        .rejects.toThrow('Failed to parse transformation result');
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
        steps: [
          { type: 'transform', operation: 'rename', from: 'sourceField', to: 'targetField' },
          { type: 'transform', operation: 'format', field: 'data', format: 'json' }
        ]
      };
      const context = { additionalInfo: 'context' };

      const result = await service.optimizeTransformationPath(path, context);

      expect(result).toBeDefined();
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].operation).toBe('rename_and_format');
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('优化转换路径'),
        expect.any(Object)
      );
    });

    it('should handle empty transformation path', async () => {
      const path = { steps: [] };
      
      const result = await service.optimizeTransformationPath(path);
      
      expect(result).toBeDefined();
      expect(result.steps).toEqual([]);
    });

    it('should handle LLM service errors gracefully', async () => {
      const path = { steps: [{ type: 'transform', operation: 'rename' }] };
      
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      await expect(service.optimizeTransformationPath(path))
        .rejects.toThrow('Failed to optimize transformation path');
    });

    it('should handle invalid LLM responses gracefully', async () => {
      const path = { steps: [{ type: 'transform', operation: 'rename' }] };
      
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      await expect(service.optimizeTransformationPath(path))
        .rejects.toThrow('Failed to parse optimized path');
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
      const strategyFn = jest.fn();
      
      const result = await service.registerTransformationStrategy(strategyName, strategyFn);
      
      expect(result).toBe(true);
      
      const strategies = await service.getAvailableTransformationStrategies();
      expect(strategies).toContain(strategyName);
    });

    it('should not register a strategy with an existing name', async () => {
      const strategyName = 'existingStrategy';
      const strategyFn1 = jest.fn();
      const strategyFn2 = jest.fn();
      
      await service.registerTransformationStrategy(strategyName, strategyFn1);
      const result = await service.registerTransformationStrategy(strategyName, strategyFn2);
      
      expect(result).toBe(false);
    });
  });
});
