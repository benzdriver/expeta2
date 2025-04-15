import { Test, TestingModule } from '@nestjs/testing';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticDescriptor } from '../interfaces/semantic-descriptor.interface';

describe('TransformationEngineService - Public Methods', () => {
  let service: TransformationEngineService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;

  const _mockLlmRouterService = 
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

  const _mockMemoryService = 
    storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
  };

  beforeEach(async () => {
    const _module: TestingModule = 
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
      const _sourceDescriptor = 
      const _targetDescriptor = 

      const _result = 

      expect(result).toBeDefined();
      expect(result.mappings).toBeDefined();
      expect(result.transformations).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('生成转换路径'),
        expect.any(Object),
      );
    });

    it('should include context in the transformation path generation if provided', async () => {
      const _sourceDescriptor = 
      const _targetDescriptor = 
      const _context = 

      const _result = 
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
      const _sourceDescriptor = 
      const _targetDescriptor = 

      llmRouterService.generateContent = jest
        .fn()
        .mockRejectedValueOnce(new Error('LLM service error'));

      await expect(
        service.generateTransformationPath(sourceDescriptor, targetDescriptor),
      ).rejects.toThrow('Failed to generate transformation path');
    });

    it('should handle invalid JSON response from LLM', async () => {
      const _sourceDescriptor = 
      const _targetDescriptor = 

      llmRouterService.generateContent = jest.fn().mockResolvedValueOnce('invalid json');

      await expect(
        service.generateTransformationPath(sourceDescriptor, targetDescriptor),
      ).rejects.toThrow('Failed to parse transformation path');
    });
  });

  describe('executeTransformation', () => {
    it('should transform data using default strategy', async () => {
      const _data = 
      const _transformationPath = 
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

      const _result = 

      expect(result).toBeDefined();
      expect(result.target.field).toBe('value');
      expect(result.target.text).toBe('TEST');
    });

    it('should transform data using LLM strategy', async () => {
      const _data = 
      const _transformationPath = 
        strategy: 'llm',
        mappings: { 'target.field': 'source.field' },
      };

      const _result = 

      expect(result).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalled();
    });

    it('should transform data using direct mapping strategy', async () => {
      const _data = 
      const _transformationPath = 
        strategy: 'directMapping',
        mappings: { 'target.field': 'source.field' },
      };

      const _result = 

      expect(result).toBeDefined();
      expect(result.target.field).toBe('value');
    });

    it('should fall back to default strategy for non-existent strategy', async () => {
      const _data = 
      const _transformationPath = 
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

      const _result = 

      expect(result).toBeDefined();
      expect(result.target.field).toBe('value');
      expect(result.target.text).toBe('TEST');
    });

    it('should handle error when no strategies are available', async () => {
      const _data = 
      const _transformationPath = 

      const _originalStrategies = 
      service['transformationStrategies'] = new Map();

      await expect(service.executeTransformation(data, transformationPath)).rejects.toThrow(
        'No transformation strategies available',
      );

      service['transformationStrategies'] = originalStrategies;
    });

    it('should handle error when strategy execution fails', async () => {
      const _data = 
      const _transformationPath = 

      const _originalStrategy = 
      service['defaultTransformationStrategy'] = jest
        .fn()
        .mockRejectedValueOnce(new Error('Strategy execution error'));

      await expect(service.executeTransformation(data, transformationPath)).rejects.toThrow(
        'Failed to execute transformation',
      );

      service['defaultTransformationStrategy'] = originalStrategy;
    });
  });

  describe('validateTransformation', () => {
    it('should validate transformation result against target descriptor', async () => {
      const _result = 
      const _targetDescriptor = 

      const _validationResult = 

      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBe(true);
      expect(validationResult.score).toBe(95);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('验证转换结果'),
        expect.any(Object),
      );
    });

    it('should include context in validation if provided', async () => {
      const _result = 
      const _targetDescriptor = 
      const _context = 

      const _validationResult = 
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
      const _result = 
      const _targetDescriptor = 

      llmRouterService.generateContent = jest
        .fn()
        .mockRejectedValueOnce(new Error('LLM service error'));

      await expect(service.validateTransformation(result, targetDescriptor)).rejects.toThrow(
        'Failed to validate transformation',
      );
    });

    it('should handle invalid JSON response from LLM', async () => {
      const _result = 
      const _targetDescriptor = 

      llmRouterService.generateContent = jest.fn().mockResolvedValueOnce('invalid json');

      await expect(service.validateTransformation(result, targetDescriptor)).rejects.toThrow(
        'Failed to parse validation result',
      );
    });
  });

  describe('optimizeTransformationPath', () => {
    it('should optimize transformation path', async () => {
      const _transformationPath = 
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

      const _optimizedPath = 

      expect(optimizedPath).toBeDefined();
      expect(optimizedPath.mappings).toBeDefined();
      expect(optimizedPath.transformations).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('优化转换路径'),
        expect.any(Object),
      );
    });

    it('should include metrics in optimization if provided', async () => {
      const _transformationPath = 
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
      const _metrics = 

      const _optimizedPath = 

      expect(optimizedPath).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('executionTime'),
        expect.any(Object),
      );
    });

    it('should handle error when LLM service fails', async () => {
      const _transformationPath = 
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
      const _transformationPath = 
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
      const _strategies = 

      expect(strategies).toBeDefined();
      expect(strategies).toContain('default');
      expect(strategies).toContain('llm');
      expect(strategies).toContain('directMapping');
    });
  });

  describe('registerTransformationStrategy', () => {
    it('should register a new strategy', () => {
      const _strategyName = 
      const _strategyFn = 

      service.registerTransformationStrategy(strategyName, strategyFn);

      const _strategies = 
      expect(strategies).toContain(strategyName);
    });

    it('should overwrite an existing strategy', () => {
      const _strategyName = 
      const _originalStrategy = 
      const _newStrategyFn = 

      service.registerTransformationStrategy(strategyName, newStrategyFn);

      const _currentStrategy = 
      expect(currentStrategy).not.toBe(originalStrategy);

      service.registerTransformationStrategy(strategyName, originalStrategy);
    });

    it('should throw error for invalid strategy function', () => {
      const _strategyName = 
      const _invalidStrategyFn = 

      expect(() =>
        service.registerTransformationStrategy(strategyName, invalidStrategyFn as unknown),
      ).toThrow('Strategy must be a function');
    });
  });
});
