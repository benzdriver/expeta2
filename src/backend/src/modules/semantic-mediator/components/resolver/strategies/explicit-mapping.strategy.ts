import { Injectable, Logger } from '@nestjs/common';
import { SemanticDescriptor } from '../../../interfaces/semantic-descriptor.interface';
import { ResolutionStrategy } from '../interfaces/resolution-strategy.interface';
import { ResolutionResult } from '../interfaces/resolution-result.interface';

/**
 * Explicit mapping resolution strategy
 * Uses predefined mappings between known module types
 * Fastest and most reliable strategy, but limited to known mappings
 */
@Injectable()
export class ExplicitMappingStrategy implements ResolutionStrategy {
  private readonly logger = new Logger(ExplicitMappingStrategy.name);
  readonly name = 'explicit_mapping';
  readonly priority = 3; // Highest priority

  private mappings: Map<string, Map<string, (source: unknown, target: unknown) => any>> = new Map();

  /**
   * Register a mapping between two module types
   * @param sourceType Source module type
   * @param targetType Target module type
   * @param mappingFn Mapping function
   */
  registerMapping(
    sourceType: string,
    targetType: string,
    mappingFn: (source: unknown, target: unknown) => any,
  ): void {
    if (!this.mappings.has(sourceType)) {
      this.mappings.set(sourceType, new Map());
    }
    const sourceMap = this.mappings.get(sourceType);
    if (sourceMap) {
      sourceMap.set(targetType, mappingFn);
    }
    this.logger.log(`Registered explicit mapping from ${sourceType} to ${targetType}`);
  }

  /**
   * Check if this strategy can handle the given resolution request
   * @param sourceDescriptor Semantic descriptor of the source data
   * @param targetDescriptor Semantic descriptor of the target data
   * @param context Additional context for the resolution
   * @returns True if this strategy can handle the resolution, false otherwise
   */
  async canResolve(
    sourceDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    targetDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    context?: unknown,
  ): Promise<boolean> {
    const sourceType = this.getEntityType(sourceDescriptor);
    const targetType = this.getEntityType(targetDescriptor);

    const sourceMap = this.mappings.get(sourceType);
    return this.mappings.has(sourceType) && sourceMap !== undefined && sourceMap.has(targetType);
  }

  /**
   * Resolve the semantic conflict between source and target
   * @param sourceData Source data to resolve
   * @param targetData Target data to resolve against
   * @param sourceDescriptor Semantic descriptor of the source data
   * @param targetDescriptor Semantic descriptor of the target data
   * @param context Additional context for the resolution
   * @returns Resolution result
   */
  async resolve(
    sourceData: unknown,
    targetData: unknown,
    sourceDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    targetDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    context?: unknown,
  ): Promise<ResolutionResult> {
    const startTime = Date.now();
    const sourceType = this.getEntityType(sourceDescriptor);
    const targetType = this.getEntityType(targetDescriptor);

    try {
      if (!this.mappings.has(sourceType) || !this.mappings.get(sourceType)?.has(targetType)) {
        return {
          success: false,
          resolvedData: null,
          strategyUsed: this.name,
          confidence: 0,
          unresolvedConflicts: [
            {
              type: 'missing_mapping',
              description: `No explicit mapping found from ${sourceType} to ${targetType}`,
              reason: 'No registered mapping',
            },
          ],
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }

      const mappingFn = this.mappings.get(sourceType)?.get(targetType);

      if (!mappingFn) {
        throw new Error(`Mapping function not found for ${sourceType} to ${targetType}`);
      }

      const resolvedData = mappingFn(sourceData, targetData);

      return {
        success: true,
        resolvedData,
        strategyUsed: this.name,
        confidence: 1.0, // Highest confidence since it's an explicit mapping
        resolvedConflicts: [
          {
            type: 'explicit_mapping',
            description: `Applied explicit mapping from ${sourceType} to ${targetType}`,
            resolution: 'Used predefined mapping function',
          },
        ],
        metadata: {
          executionTime: Date.now() - startTime,
          transformationPath: {
            type: 'direct',
            sourceType,
            targetType,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error in explicit mapping resolution: ${error.message}`, error.stack);
      return {
        success: false,
        resolvedData: null,
        strategyUsed: this.name,
        confidence: 0,
        unresolvedConflicts: [
          {
            type: 'mapping_error',
            description: `Error applying explicit mapping from ${sourceType} to ${targetType}`,
            reason: error.message,
          },
        ],
        metadata: {
          executionTime: Date.now() - startTime,
          additionalInfo: {
            error: error.message,
            stack: error.stack,
          },
        },
      };
    }
  }

  /**
   * Get the entity type from a semantic descriptor
   * @param descriptor Semantic descriptor
   * @returns Entity type
   */
  private getEntityType(
    descriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
  ): string {
    if ('type' in descriptor) {
      return descriptor.type;
    }
    return descriptor.entity;
  }
}
