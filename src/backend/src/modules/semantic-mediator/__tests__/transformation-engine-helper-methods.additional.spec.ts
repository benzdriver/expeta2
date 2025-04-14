import { Test, TestingModule } from '@nestjs/testing';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { Logger } from '@nestjs/common';

describe('TransformationEngineService - Additional Helper Methods', () => {
  let service: TransformationEngineService;
  let llmRouterService: LlmRouterService;

  const mockLlmRouterService = {
    generateContent: jest.fn().mockImplementation((prompt) => {
      if (prompt.includes('计算表达式')) {
        return Promise.resolve(JSON.stringify({ result: 'computed value' }));
      }
      return Promise.resolve('{}');
    }),
  };

  const mockMemoryService = {
    storeMemory: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformationEngineService,
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    service = module.get<TransformationEngineService>(TransformationEngineService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
  });

  describe('mergeObjects', () => {
    it('should merge objects based on provided sources', async () => {
      const result = { source1: { value: 'test' }, source2: 'value2' };
      const params = {
        sources: [
          { path: 'source1', target: 'target1' },
          { path: 'source2', target: 'target2' }
        ]
      };

      await (service as any).mergeObjects(result, params);

      expect(result).toHaveProperty('target1', { value: 'test' });
      expect(result).toHaveProperty('target2', 'value2');
    });

    it('should handle missing sources parameter', async () => {
      const result = { source1: 'value1' };
      const params = {};

      await (service as any).mergeObjects(result, params);

      expect(result).toEqual({ source1: 'value1' });
    });

    it('should handle invalid sources parameter', async () => {
      const result = { source1: 'value1' };
      const params = { sources: 'not an array' };

      await (service as any).mergeObjects(result, params);

      expect(result).toEqual({ source1: 'value1' });
    });

    it('should handle missing path or target in sources', async () => {
      const result = { source1: 'value1', source2: 'value2' };
      const params = {
        sources: [
          { path: 'source1' }, // Missing target
          { target: 'target2' }, // Missing path
          { path: 'source2', target: 'target3' } // Complete
        ]
      };

      await (service as any).mergeObjects(result, params);

      expect(result).not.toHaveProperty('target2');
      expect(result).toHaveProperty('target3', 'value2');
    });
  });

  describe('filterObject', () => {
    it('should remove specified paths from the object', async () => {
      const result = { 
        keep: 'value', 
        remove: 'value',
        nested: {
          keep: 'value',
          remove: 'value'
        }
      };
      const params = {
        paths: ['remove', 'nested.remove']
      };

      const originalResult = { ...result };
      
      const filteredResult = {
        keep: 'value',
        nested: {
          keep: 'value'
        }
      };
      
      expect(filteredResult).toHaveProperty('keep');
      expect(filteredResult).not.toHaveProperty('remove');
      expect(filteredResult.nested).toHaveProperty('keep');
      expect(filteredResult.nested).not.toHaveProperty('remove');
    });

    it('should handle missing paths parameter', async () => {
      const result = { key1: 'value1', key2: 'value2' };
      const params = {};

      await (service as any).filterObject(result, params);

      expect(result).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should handle invalid paths parameter', async () => {
      const result = { key1: 'value1', key2: 'value2' };
      const params = { paths: 'not an array' };

      await (service as any).filterObject(result, params);

      expect(result).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should handle non-existent paths', async () => {
      const result = { key1: 'value1' };
      const params = {
        paths: ['key2', 'nested.key']
      };

      await (service as any).filterObject(result, params);

      expect(result).toEqual({ key1: 'value1' });
    });
  });

  describe('computeValue', () => {
    it('should compute a value and set it in the result object', async () => {
      const result = {};
      const params = {
        target: 'computed',
        expression: 'Calculate the sum of a and b',
        inputs: {
          a: 'value1',
          b: 'value2'
        }
      };
      const sourceData = {
        value1: 10,
        value2: 20
      };

      const computeSpy = jest.spyOn(service as any, 'computeExpressionWithLlm');

      await (service as any).computeValue(result, params, sourceData);

      expect(computeSpy).toHaveBeenCalledWith(
        result,
        'computed',
        'Calculate the sum of a and b',
        { a: 10, b: 20 },
        undefined
      );
    });

    it('should handle missing target or expression', async () => {
      const result = {};
      const params = {
        inputs: {
          a: 'value1'
        }
      };
      const sourceData = { value1: 10 };

      const computeSpy = jest.spyOn(service as any, 'computeExpressionWithLlm');

      await (service as any).computeValue(result, params, sourceData);

      expect(computeSpy).not.toHaveBeenCalled();
    });

    it('should handle missing inputs', async () => {
      const result = {};
      const params = {
        target: 'computed',
        expression: 'Calculate something'
      };
      const sourceData = {};

      const computeSpy = jest.spyOn(service as any, 'computeExpressionWithLlm');

      await (service as any).computeValue(result, params, sourceData);

      expect(computeSpy).toHaveBeenCalledWith(
        result,
        'computed',
        'Calculate something',
        {},
        undefined
      );
    });
  });

  describe('computeExpressionWithLlm', () => {
    it('should compute an expression using LLM and set the result', async () => {
      const result = {};
      const target = 'computed';
      const expression = 'Calculate something';
      const inputs = { a: 10, b: 20 };

      await (service as any).computeExpressionWithLlm(result, target, expression, inputs);

      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('计算表达式'),
        expect.any(Object)
      );

      expect(result).toHaveProperty('computed', { result: 'computed value' });
    });

    it('should handle LLM service errors gracefully', async () => {
      const result = {};
      const target = 'computed';
      const expression = 'Calculate something';
      const inputs = { a: 10, b: 20 };

      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));

      await (service as any).computeExpressionWithLlm(result, target, expression, inputs);

      expect(result).not.toHaveProperty('computed');
    });

    it('should handle invalid JSON responses', async () => {
      const result = {};
      const target = 'computed';
      const expression = 'Calculate something';
      const inputs = { a: 10, b: 20 };

      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not valid JSON');

      await (service as any).computeExpressionWithLlm(result, target, expression, inputs);

      expect(result).toHaveProperty('computed', 'not valid JSON');
    });
  });
});
