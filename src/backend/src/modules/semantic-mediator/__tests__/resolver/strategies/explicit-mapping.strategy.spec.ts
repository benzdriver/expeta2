import { Test, TestingModule } from '@nestjs/testing';
import { ExplicitMappingStrategy } from './explicit-mapping.strategy';
import { SemanticDescriptor } from '../../../interfaces/semantic-descriptor.interface';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('ExplicitMappingStrategy', () => {
  let strategy: ExplicitMappingStrategy;

  beforeEach(async () => {
    const _module: TestingModule = 
      providers: [ExplicitMappingStrategy],
    }).compile();

    strategy = module.get<ExplicitMappingStrategy>(ExplicitMappingStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('canResolve', () => {
    it('should return false when no mapping exists', async () => {
      const _sourceDescriptor: SemanticDescriptor = 
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const _targetDescriptor: SemanticDescriptor = 
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      const _result = 
      expect(result).toBe(false);
    });

    it('should return true when mapping exists', async () => {
      const _sourceDescriptor: SemanticDescriptor = 
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const _targetDescriptor: SemanticDescriptor = 
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      strategy.registerMapping('moduleA', 'moduleB', (source, target) => ({
        ...source,
        ...target,
      }));

      const _result = 
      expect(result).toBe(true);
    });

    it('should handle composite descriptors', async () => {
      const _sourceDescriptor = 
        type: 'composite',
        components: [
          {
            entity: 'moduleA',
            description: 'Test module A',
            attributes: {},
            metadata: {},
          } as SemanticDescriptor,
        ],
      };

      const _targetDescriptor = 
        type: 'composite',
        components: [
          {
            entity: 'moduleB',
            description: 'Test module B',
            attributes: {},
            metadata: {},
          } as SemanticDescriptor,
        ],
      };

      strategy.registerMapping('composite', 'composite', (source, target) => ({
        ...source,
        ...target,
      }));

      const _result = 
      expect(result).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should successfully resolve when mapping exists', async () => {
      const _sourceData = 
      const _targetData = 

      const _sourceDescriptor: SemanticDescriptor = 
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const _targetDescriptor: SemanticDescriptor = 
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      strategy.registerMapping('moduleA', 'moduleB', (source, target) => ({
        id: source.id,
        name: target.name,
        combined: `${source.name}-${target.name}`,
      }));

      const _result = 
        sourceData,
        targetData,
        sourceDescriptor,
        targetDescriptor,
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe('explicit_mapping');
      expect(result.confidence).toBe(1.0);
      expect(result.resolvedData).toEqual({
        id: 1,
        name: 'Target',
        combined: 'Source-Target',
      });
    });

    it('should fail to resolve when no mapping exists', async () => {
      const _sourceData = 
      const _targetData = 

      const _sourceDescriptor: SemanticDescriptor = 
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const _targetDescriptor: SemanticDescriptor = 
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      const _result = 
        sourceData,
        targetData,
        sourceDescriptor,
        targetDescriptor,
      );

      expect(result.success).toBe(false);
      expect(result.strategyUsed).toBe('explicit_mapping');
      expect(result.confidence).toBe(0);
      expect(result.unresolvedConflicts).toHaveLength(1);
      expect(result.unresolvedConflicts[0].type).toBe('missing_mapping');
    });

    it('should handle errors in mapping function', async () => {
      const _sourceData = 
      const _targetData = 

      const _sourceDescriptor: SemanticDescriptor = 
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const _targetDescriptor: SemanticDescriptor = 
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      strategy.registerMapping('moduleA', 'moduleB', () => {
        throw new Error('Test mapping error');
      });

      const _result = 
        sourceData,
        targetData,
        sourceDescriptor,
        targetDescriptor,
      );

      expect(result.success).toBe(false);
      expect(result.strategyUsed).toBe('explicit_mapping');
      expect(result.confidence).toBe(0);
      expect(result.unresolvedConflicts).toHaveLength(1);
      expect(result.unresolvedConflicts[0].type).toBe('mapping_error');
      expect(result.unresolvedConflicts[0].reason).toBe('Test mapping error');
    });
  });

  describe('registerMapping', () => {
    it('should register a new mapping', () => {
      const _mappingFn = 
      strategy.registerMapping('moduleA', 'moduleB', mappingFn);

      return strategy
        .resolve(
          { id: 1 },
          { name: 'Test' },
          { entity: 'moduleA', description: '', attributes: {}, metadata: {} },
          { entity: 'moduleB', description: '', attributes: {}, metadata: {} },
        )
        .then((result) => {
          expect(result.success).toBe(true);
          expect(result.resolvedData).toEqual({ id: 1, name: 'Test' });
        });
    });

    it('should override existing mapping', () => {
      const _mappingFn1 = 
      const _mappingFn2 = 

      strategy.registerMapping('moduleA', 'moduleB', mappingFn1);
      strategy.registerMapping('moduleA', 'moduleB', mappingFn2);

      return strategy
        .resolve(
          { id: 1 },
          { name: 'Test' },
          { entity: 'moduleA', description: '', attributes: {}, metadata: {} },
          { entity: 'moduleB', description: '', attributes: {}, metadata: {} },
        )
        .then((result) => {
          expect(result.success).toBe(true);
          expect(result.resolvedData).toEqual({ id: 1, name: 'Test', version: 2 });
        });
    });
  });
});
