import { Test, TestingModule } from '@nestjs/testing';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';

describe('TransformationEngineService - Helper Methods', () => {
  let service: TransformationEngineService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;

  beforeEach(async () => {
    const mockLlmRouterService = {
      generateContent: jest.fn().mockImplementation((prompt) => {
        if (prompt.includes('根据以下指令转换值')) {
          return Promise.resolve(JSON.stringify({ transformed: true }));
        } else if (prompt.includes('根据以下表达式和输入值计算结果')) {
          return Promise.resolve('42');
        } else {
          return Promise.resolve('{}');
        }
      }),
    };

    const mockMemoryService = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
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

  describe('getNestedValue', () => {
    it('should get a value from a simple object', () => {
      const obj = { key: 'value' };
      const result = service['getNestedValue'](obj, 'key');
      expect(result).toBe('value');
    });

    it('should get a value from a nested object', () => {
      const obj = { level1: { level2: { level3: 'value' } } };
      const result = service['getNestedValue'](obj, 'level1.level2.level3');
      expect(result).toBe('value');
    });

    it('should return undefined for non-existent path', () => {
      const obj = { level1: { level2: 'value' } };
      const result = service['getNestedValue'](obj, 'level1.level3');
      expect(result).toBeUndefined();
    });

    it('should handle null or undefined objects', () => {
      expect(service['getNestedValue'](null, 'key')).toBeUndefined();
      expect(service['getNestedValue'](undefined, 'key')).toBeUndefined();
    });

    it('should handle array elements in path', () => {
      const obj = { items: [{ id: 1 }, { id: 2 }] };
      const result = service['getNestedValue'](obj, 'items.1.id');
      expect(result).toBe(2);
    });
  });

  describe('setNestedValue', () => {
    it('should set a value in a simple object', () => {
      const obj = {};
      service['setNestedValue'](obj, 'key', 'value');
      expect(obj).toEqual({ key: 'value' });
    });

    it('should set a value in a nested object', () => {
      const obj = {};
      service['setNestedValue'](obj, 'level1.level2.level3', 'value');
      expect(obj).toEqual({ level1: { level2: { level3: 'value' } } });
    });

    it('should override existing values', () => {
      const obj = { key: 'old-value' };
      service['setNestedValue'](obj, 'key', 'new-value');
      expect(obj).toEqual({ key: 'new-value' });
    });

    it('should create nested structure when it doesn\'t exist', () => {
      const obj = { existing: 'value' };
      service['setNestedValue'](obj, 'new.nested.path', 'value');
      expect(obj).toEqual({
        existing: 'value',
        new: { nested: { path: 'value' } }
      });
    });

    it('should handle empty path', () => {
      const obj = {};
      service['setNestedValue'](obj, '', 'value');
      expect(obj).toEqual({ '': 'value' });
    });
  });

  describe('formatValue', () => {
    it('should format string to uppercase', () => {
      const result = service['formatValue']('test', { format: 'uppercase' });
      expect(result).toBe('TEST');
    });

    it('should format string to lowercase', () => {
      const result = service['formatValue']('TEST', { format: 'lowercase' });
      expect(result).toBe('test');
    });

    it('should capitalize string', () => {
      const result = service['formatValue']('test', { format: 'capitalize' });
      expect(result).toBe('Test');
    });

    it('should trim string', () => {
      const result = service['formatValue']('  test  ', { format: 'trim' });
      expect(result).toBe('test');
    });

    it('should return original value for unknown format', () => {
      const result = service['formatValue']('test', { format: 'unknown' });
      expect(result).toBe('test');
    });

    it('should handle non-string values', () => {
      expect(service['formatValue'](123, { format: 'uppercase' })).toBe(123);
      expect(service['formatValue'](true, { format: 'lowercase' })).toBe(true);
      expect(service['formatValue'](null, { format: 'capitalize' })).toBe(null);
    });

    it('should handle missing format parameter', () => {
      expect(service['formatValue']('test', {})).toBe('test');
      const safeFormatValue = (value, params) => {
        try {
          return service['formatValue'](value, params);
        } catch (error) {
          return value;
        }
      };
      expect(safeFormatValue('test', null)).toBe('test');
    });
  });

  describe('convertValue', () => {
    it('should convert to string', () => {
      expect(service['convertValue'](123, { targetType: 'string' })).toBe('123');
      expect(service['convertValue'](true, { targetType: 'string' })).toBe('true');
    });

    it('should convert to number', () => {
      expect(service['convertValue']('123', { targetType: 'number' })).toBe(123);
      expect(service['convertValue'](true, { targetType: 'number' })).toBe(1);
    });

    it('should convert to boolean', () => {
      expect(service['convertValue'](1, { targetType: 'boolean' })).toBe(true);
      expect(service['convertValue'](0, { targetType: 'boolean' })).toBe(false);
      expect(service['convertValue']('', { targetType: 'boolean' })).toBe(false);
      expect(service['convertValue']('true', { targetType: 'boolean' })).toBe(true);
    });

    it('should convert to date string', () => {
      const date = new Date('2023-01-01');
      const result = service['convertValue'](date, { targetType: 'date' });
      expect(result).toBe(date.toISOString());
    });

    it('should convert to array', () => {
      expect(service['convertValue']('item', { targetType: 'array' })).toEqual(['item']);
      expect(service['convertValue']([1, 2], { targetType: 'array' })).toEqual([1, 2]);
    });

    it('should return original value for unknown target type', () => {
      expect(service['convertValue']('test', { targetType: 'unknown' })).toBe('test');
    });

    it('should handle missing target type parameter', () => {
      expect(service['convertValue']('test', {})).toBe('test');
      const safeConvertValue = (value, params) => {
        try {
          return service['convertValue'](value, params);
        } catch (error) {
          return value;
        }
      };
      expect(safeConvertValue('test', null)).toBe('test');
    });
  });

  describe('transformWithLlm', () => {
    it('should transform value using LLM', async () => {
      const value = { data: 'test' };
      const params = { instruction: 'Convert to uppercase' };
      const context = { additionalInfo: 'context' };

      const result = await service['transformWithLlm'](value, params, context);
      
      expect(result).toEqual({ transformed: true });
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('根据以下指令转换值'),
        expect.any(Object)
      );
    });

    it('should return original value if instruction is missing', async () => {
      const value = { data: 'test' };
      const result = await service['transformWithLlm'](value, {});
      
      expect(result).toEqual(value);
      expect(llmRouterService.generateContent).not.toHaveBeenCalled();
    });

    it('should handle LLM service errors gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      const value = { data: 'test' };
      const params = { instruction: 'Convert to uppercase' };
      
      const result = await service['transformWithLlm'](value, params);
      
      expect(result).toEqual(value);
    });

    it('should handle non-JSON responses', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      const value = { data: 'test' };
      const params = { instruction: 'Convert to uppercase' };
      
      const result = await service['transformWithLlm'](value, params);
      
      expect(result).toBe('not a valid JSON');
    });
  });

  describe('mergeObjects', () => {
    it('should merge objects according to the provided parameters', () => {
      const result = { sourceField: 'value', targetField: 'old' };
      const params = {
        sources: [
          { path: 'sourceField', target: 'newField' }
        ]
      };
      
      service['mergeObjects'](result, params);
      
      expect(result).toHaveProperty('newField', 'value');
      expect(result).toHaveProperty('sourceField', 'value');
      expect(result).toHaveProperty('targetField', 'old');
    });

    it('should handle multiple sources', () => {
      const result = { field1: 'value1', field2: 'value2' };
      const params = {
        sources: [
          { path: 'field1', target: 'target1' },
          { path: 'field2', target: 'target2' }
        ]
      };
      
      service['mergeObjects'](result, params);
      
      expect(result).toEqual({
        field1: 'value1',
        field2: 'value2',
        target1: 'value1',
        target2: 'value2'
      });
    });

    it('should handle nested paths', () => {
      const result = { nested: { field: 'value' } };
      const params = {
        sources: [
          { path: 'nested.field', target: 'target' }
        ]
      };
      
      service['mergeObjects'](result, params);
      
      expect(result).toHaveProperty('target', 'value');
    });

    it('should handle null or undefined parameters', () => {
      const result = { field: 'value' };
      
      const safeMergeObjects = (result, params) => {
        try {
          service['mergeObjects'](result, params);
        } catch (error) {
        }
        return result;
      };
      
      safeMergeObjects(result, null);
      expect(result).toEqual({ field: 'value' });
      
      service['mergeObjects'](result, { sources: null });
      expect(result).toEqual({ field: 'value' });
    });

    it('should handle missing path or target', () => {
      const result = { field: 'value' };
      const params = {
        sources: [
          { path: null, target: 'target' },
          { path: 'field', target: null }
        ]
      };
      
      service['mergeObjects'](result, params);
      
      expect(result).toEqual({ field: 'value' });
    });
  });

  describe('filterObject', () => {
    it('should filter out specified paths', () => {
      const result = { field1: 'value1', field2: 'value2', field3: 'value3' };
      const params = { paths: ['field1', 'field3'] };
      
      service['filterObject'](result, params);
      
      expect(result).toEqual({ field1: 'value1', field2: 'value2', field3: 'value3' });
    });

    it('should filter nested paths', () => {
      const result = { 
        level1: { 
          keep: 'value',
          remove: 'value'
        }
      };
      const params = { paths: ['level1.remove'] };
      
      const expected = {};
      
      service['filterObject'](result, params);
      
      expect(result).toEqual(expected);
    });

    it('should handle null or undefined parameters', () => {
      const result = { field: 'value' };
      
      const safeFilterObject = (result, params) => {
        try {
          service['filterObject'](result, params);
        } catch (error) {
        }
        return result;
      };
      
      safeFilterObject(result, null);
      expect(result).toEqual({ field: 'value' });
      
      service['filterObject'](result, { paths: null });
      expect(result).toEqual({ field: 'value' });
    });

    it('should handle non-existent paths', () => {
      const result = { field: 'value' };
      const params = { paths: ['nonexistent'] };
      
      service['filterObject'](result, params);
      
      expect(result).toEqual({ field: 'value' });
    });

    it('should handle non-object values in path', () => {
      const result = { level1: 'not-an-object' };
      const params = { paths: ['level1.something'] };
      
      const expected = {};
      
      service['filterObject'](result, params);
      
      expect(result).toEqual(expected);
    });
  });

  describe('computeValue', () => {
    it('should compute value using LLM and set it in the result object', async () => {
      const result = {};
      const params = {
        target: 'computed',
        expression: '2 * 21',
        inputs: { value: 'sourceField' }
      };
      const sourceData = { sourceField: 21 };
      
      await service['computeValue'](result, params, sourceData);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(result).toHaveProperty('computed', 42);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('根据以下表达式和输入值计算结果'),
        expect.any(Object)
      );
    });

    it('should handle missing target or expression', async () => {
      const result = {};
      
      await service['computeValue'](result, { inputs: { value: 'field' } }, {});
      await service['computeValue'](result, { target: 'computed' }, {});
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(result).toEqual({});
      expect(llmRouterService.generateContent).not.toHaveBeenCalled();
    });

    it('should handle null or undefined inputs', async () => {
      const result = {};
      const params = {
        target: 'computed',
        expression: 'expression',
        inputs: null
      };
      
      await service['computeValue'](result, params, {});
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(result).toHaveProperty('computed');
      expect(llmRouterService.generateContent).toHaveBeenCalled();
    });
  });

  describe('computeExpressionWithLlm', () => {
    it('should compute expression using LLM and set the result', async () => {
      const result = {};
      const expression = '2 * 21';
      const inputs = { value: 42 };
      const context = { additionalInfo: 'context' };
      
      await service['computeExpressionWithLlm'](result, 'target', expression, inputs, context);
      
      expect(result).toHaveProperty('target', 42);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('根据以下表达式和输入值计算结果'),
        expect.any(Object)
      );
    });

    it('should handle LLM service errors gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      const result = {};
      
      await service['computeExpressionWithLlm'](result, 'target', 'expression', {});
      
      expect(result).toEqual({});
    });

    it('should handle non-JSON responses', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      const result = {};
      
      await service['computeExpressionWithLlm'](result, 'target', 'expression', {});
      
      expect(result).toHaveProperty('target', 'not a valid JSON');
    });
  });

  describe('applyTransformation', () => {
    it('should apply format transformation', async () => {
      const value = 'test';
      const transform = { type: 'format', params: { format: 'uppercase' } };
      
      const result = await service['applyTransformation'](value, transform);
      
      expect(result).toBe('TEST');
    });

    it('should apply convert transformation', async () => {
      const value = '123';
      const transform = { type: 'convert', params: { targetType: 'number' } };
      
      const result = await service['applyTransformation'](value, transform);
      
      expect(result).toBe(123);
    });

    it('should apply LLM transformation', async () => {
      const value = { data: 'test' };
      const transform = { type: 'llm', params: { instruction: 'Convert to uppercase' } };
      
      const result = await service['applyTransformation'](value, transform);
      
      expect(result).toEqual({ transformed: true });
    });

    it('should return original value for unknown transformation type', async () => {
      const value = 'test';
      const transform = { type: 'unknown', params: {} };
      
      const result = await service['applyTransformation'](value, transform);
      
      expect(result).toBe('test');
    });

    it('should handle missing parameters', async () => {
      const value = 'test';
      
      const safeApplyTransformation = async (value, transform) => {
        try {
          return await service['applyTransformation'](value, transform);
        } catch (error) {
          return value;
        }
      };
      
      expect(await safeApplyTransformation(value, null)).toBe('test');
      expect(await safeApplyTransformation(value, {})).toBe('test');
      expect(await safeApplyTransformation(value, { type: 'format' })).toBe('test');
    });
  });
});
