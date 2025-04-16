import { Test, TestingModule } from '@nestjs/testing';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticDescriptor } from '../interfaces/semantic-descriptor.interface';

describe('TransformationEngineService - Public Methods', () => {
  let service: TransformationEngineService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;

  const mockLlmRouterService = {
    generateContent: jest.fn().mockImplementation((prompt) => {
      if (prompt.includes('生成转换路径')) {
        return JSON.stringify({
          path: {
            mappings: { 'target.field': 'source.field' },
            transformations: [
              {
                type: 'format',
                source: 'source.text',
                target: 'target.text',
                params: { format: 'uppercase' },
              },
            ],
          },
        });
      } else if (prompt.includes('验证转换结果')) {
        return JSON.stringify({ valid: true, score: 95, feedback: 'Good transformation' });
      } else if (prompt.includes('优化转换路径')) {
        return JSON.stringify({
          optimizedPath: {
            mappings: { 'target.field': 'source.field' },
            transformations: [
              {
                type: 'format',
                source: 'source.text',
                target: 'target.text',
                params: { format: 'uppercase' },
              },
            ],
          },
        });
      } else {
        return JSON.stringify({ result: 'transformed data' });
      }
    }),
  };

  const mockMemoryService = {
    storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
  };

  beforeEach(async () => {
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
        entity: 'User',
        description: 'User information'
      };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'Profile',
        description: 'User profile'
      };

      const result = await service.generateTransformationPath(sourceDescriptor, targetDescriptor);

      expect(result).toBeDefined();
      expect(result.mappings).toBeDefined();
      expect(result.transformations).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('生成转换路径'),
        expect.any(Object),
      );
    });

    it('should include context in the transformation path generation if provided', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'User',
        description: 'User information'
      };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'Profile',
        description: 'User profile'
      };
      const context = { additionalInfo: 'context data' };

      const result = await service.generateTransformationPath(
        sourceDescriptor,
        targetDescriptor,
        context,
      );

      expect(result).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('生成转换路径'),
        expect.any(Object),
      );
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('context data'),
        expect.any(Object),
      );
    });

    it('should handle error when LLM service fails', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'User',
        description: 'User information'
      };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'Profile',
        description: 'User profile'
      };

      llmRouterService.generateContent = jest
        .fn()
        .mockRejectedValueOnce(new Error('LLM service error'));

      await expect(
        service.generateTransformationPath(sourceDescriptor, targetDescriptor),
      ).rejects.toThrow('Failed to generate transformation path');
    });

    it('should handle invalid JSON response from LLM', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'User',
        description: 'User information'
      };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'Profile',
        description: 'User profile'
      };

      llmRouterService.generateContent = jest.fn().mockResolvedValueOnce('invalid json');

      await expect(
        service.generateTransformationPath(sourceDescriptor, targetDescriptor),
      ).rejects.toThrow('Failed to parse transformation path');
    });
  });

  describe('executeTransformation', () => {
    it('should transform data using default strategy', async () => {
      const data = { source: { field: 'value', text: 'test' } };
      const transformationPath = {
        mappings: { 'target.field': 'source.field' },
        transformations: [
          {
            type: 'format',
            source: 'source.text',
            target: 'target.text',
            params: { format: 'uppercase' },
          },
        ],
      };

      const result = await service.executeTransformation(data, transformationPath);

      expect(result).toBeDefined();
      expect(result.target.field).toBe('value');
      expect(result.target.text).toBe('TEST');
    });

    it('should transform data using LLM strategy', async () => {
      const data = { source: { field: 'value' } };
      const transformationPath = {
        strategy: 'llm',
        mappings: { 'target.field': 'source.field' },
      };

      const result = await service.executeTransformation(data, transformationPath);

      expect(result).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalled();
    });

    it('should transform data using direct mapping strategy', async () => {
      const data = { source: { field: 'value' } };
      const transformationPath = {
        strategy: 'directMapping',
        mappings: { 'target.field': 'source.field' },
      };

      const result = await service.executeTransformation(data, transformationPath);

      expect(result).toBeDefined();
      expect(result.target.field).toBe('value');
    });

    it('should fall back to default strategy for non-existent strategy', async () => {
      const data = { source: { field: 'value', text: 'test' } };
      const transformationPath = {
        strategy: 'nonExistentStrategy',
        mappings: { 'target.field': 'source.field' },
        transformations: [
          {
            type: 'format',
            source: 'source.text',
            target: 'target.text',
            params: { format: 'uppercase' },
          },
        ],
      };

      const result = await service.executeTransformation(data, transformationPath);

      expect(result).toBeDefined();
      expect(result.target.field).toBe('value');
      expect(result.target.text).toBe('TEST');
    });

    it('should handle error when no strategies are available', async () => {
      const data = { source: { field: 'value' } };
      const transformationPath = { mappings: {} };

      // 保存原始策略并临时设置空Map
      const originalStrategies = service['transformationStrategies'];
      const tempStrategiesMap = new Map();
      Object.defineProperty(service, 'transformationStrategies', {
        get: () => tempStrategiesMap,
        configurable: true
      });

      await expect(service.executeTransformation(data, transformationPath)).rejects.toThrow(
        'No transformation strategies available',
      );

      // 恢复原始策略
      Object.defineProperty(service, 'transformationStrategies', {
        get: () => originalStrategies,
        configurable: true
      });
    });

    it('should handle error when strategy execution fails', async () => {
      const data = { source: { field: 'value' } };
      const transformationPath = { mappings: {} };

      // 保存原始策略并临时设置模拟函数
      const originalStrategy = service['defaultTransformationStrategy'];
      const mockStrategyFn = jest.fn().mockRejectedValueOnce(new Error('Strategy execution error'));
      
      // 临时替换默认策略
      Object.defineProperty(service, 'defaultTransformationStrategy', {
        value: mockStrategyFn,
        configurable: true
      });

      await expect(service.executeTransformation(data, transformationPath)).rejects.toThrow(
        'Failed to execute transformation',
      );

      // 恢复原始策略
      Object.defineProperty(service, 'defaultTransformationStrategy', {
        value: originalStrategy,
        configurable: true
      });
    });
  });

  describe('validateTransformation', () => {
    it('should validate transformation result against target descriptor', async () => {
      const result = { transformed: 'data' };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'Profile',
        description: 'User profile'
      };

      // 覆盖生成内容返回值以匹配实际接口期望
      llmRouterService.generateContent = jest.fn().mockResolvedValueOnce(
        JSON.stringify({ valid: true, score: 95, feedback: 'Good transformation' })
      );

      const validationResult = await service.validateTransformation(result, targetDescriptor);

      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBe(true);
      // 使用类型断言访问非标准属性
      expect((validationResult as any).score).toBe(95);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('验证转换结果'),
        expect.any(Object),
      );
    });

    it('should include context in validation if provided', async () => {
      const result = { transformed: 'data' };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'Profile',
        description: 'User profile'
      };
      const context = { additionalInfo: 'context data' };

      const validationResult = await service.validateTransformation(
        result,
        targetDescriptor,
        context,
      );

      expect(validationResult).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('context data'),
        expect.any(Object),
      );
    });

    it('should handle error when LLM service fails', async () => {
      const result = { transformed: 'data' };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'Profile',
        description: 'User profile'
      };

      llmRouterService.generateContent = jest
        .fn()
        .mockRejectedValueOnce(new Error('LLM service error'));

      await expect(service.validateTransformation(result, targetDescriptor)).rejects.toThrow(
        'Failed to validate transformation',
      );
    });

    it('should handle invalid JSON response from LLM', async () => {
      const result = { transformed: 'data' };
      const targetDescriptor: SemanticDescriptor = {
        entity: 'Profile',
        description: 'User profile'
      };

      llmRouterService.generateContent = jest.fn().mockResolvedValueOnce('invalid json');

      await expect(service.validateTransformation(result, targetDescriptor)).rejects.toThrow(
        'Failed to parse validation result',
      );
    });
  });

  describe('optimizeTransformationPath', () => {
    it('should optimize transformation path', async () => {
      const transformationPath = {
        mappings: { 'target.field': 'source.field' },
        transformations: [
          {
            type: 'format',
            source: 'source.text',
            target: 'target.text',
            params: { format: 'uppercase' },
          },
          {
            type: 'format',
            source: 'source.text2',
            target: 'target.text2',
            params: { format: 'uppercase' },
          },
        ],
      };

      const optimizedPath = await service.optimizeTransformationPath(transformationPath);

      expect(optimizedPath).toBeDefined();
      expect(optimizedPath.mappings).toBeDefined();
      expect(optimizedPath.transformations).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('优化转换路径'),
        expect.any(Object),
      );
    });

    it('should include metrics in optimization if provided', async () => {
      const transformationPath = {
        mappings: { 'target.field': 'source.field' },
        transformations: [
          {
            type: 'format',
            source: 'source.text',
            target: 'target.text',
            params: { format: 'uppercase' },
          },
        ],
      };
      const metrics = { executionTime: 100, memoryUsage: 1024 };

      const optimizedPath = await service.optimizeTransformationPath(transformationPath, metrics);

      expect(optimizedPath).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('executionTime'),
        expect.any(Object),
      );
    });

    it('should handle error when LLM service fails', async () => {
      const transformationPath = {
        mappings: { 'target.field': 'source.field' },
      };

      llmRouterService.generateContent = jest
        .fn()
        .mockRejectedValueOnce(new Error('LLM service error'));

      await expect(service.optimizeTransformationPath(transformationPath)).rejects.toThrow(
        'Failed to optimize transformation path',
      );
    });

    it('should handle invalid JSON response from LLM', async () => {
      const transformationPath = {
        mappings: { 'target.field': 'source.field' },
      };

      llmRouterService.generateContent = jest.fn().mockResolvedValueOnce('invalid json');

      await expect(service.optimizeTransformationPath(transformationPath)).rejects.toThrow(
        'Failed to parse optimized path',
      );
    });
  });

  describe('getAvailableTransformationStrategies', () => {
    it('should return list of registered strategies', () => {
      const strategies = service.getAvailableTransformationStrategies();

      expect(strategies).toBeDefined();
      expect(strategies).toContain('default');
      expect(strategies).toContain('llm');
      expect(strategies).toContain('directMapping');
    });
  });

  describe('registerTransformationStrategy', () => {
    it('should register a new strategy', () => {
      const strategyName = 'customStrategy';
      const strategyFn = jest.fn();

      service.registerTransformationStrategy(strategyName, strategyFn);

      const strategies = service.getAvailableTransformationStrategies();
      expect(strategies).toContain(strategyName);
    });

    it('should overwrite an existing strategy', () => {
      const strategyName = 'default';
      const originalStrategy = service['transformationStrategies'].get('default');
      const newStrategyFn = jest.fn();

      service.registerTransformationStrategy(strategyName, newStrategyFn);

      const currentStrategy = service['transformationStrategies'].get('default');
      expect(currentStrategy).not.toBe(originalStrategy);

      service.registerTransformationStrategy(strategyName, originalStrategy);
    });

    it('should throw error for invalid strategy function', () => {
      const strategyName = 'invalidStrategy';
      const invalidStrategyFn = 'not a function';

      expect(() =>
        service.registerTransformationStrategy(strategyName, invalidStrategyFn as unknown as any),
      ).toThrow('Strategy must be a function');
    });
  });
});
