import { Injectable, Logger } from '@nestjs/common';
import { SemanticDescriptor } from '../../../interfaces/semantic-descriptor.interface';
import { ResolutionStrategy } from '../interfaces/resolution-strategy.interface';
import { ResolutionResult } from '../interfaces/resolution-result.interface';
import { IntelligentCacheService } from '../../intelligent-cache/intelligent-cache.service';

/**
 * Pattern matching resolution strategy
 * Uses semantic patterns to identify similar transformations
 * Intermediate in terms of speed and reliability
 */
@Injectable()
export class PatternMatchingStrategy implements ResolutionStrategy {
  private readonly logger = new Logger(PatternMatchingStrategy.name);
  readonly name = 'pattern_matching';
  readonly priority = 2; // Medium priority

  constructor(private readonly intelligentCache: IntelligentCacheService) {}

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
    context?: any,
  ): Promise<boolean> {
    try {
      const similarPatterns = await this.findSimilarPatterns(sourceDescriptor, targetDescriptor);
      return similarPatterns.length > 0;
    } catch (error) {
      this.logger.error(`Error checking if pattern matching can resolve: ${error.message}`, error.stack);
      return false;
    }
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
    sourceData: any,
    targetData: any,
    sourceDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    targetDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    context?: any,
  ): Promise<ResolutionResult> {
    const startTime = Date.now();
    
    try {
      const similarPatterns = await this.findSimilarPatterns(sourceDescriptor, targetDescriptor);
      
      if (similarPatterns.length === 0) {
        return {
          success: false,
          resolvedData: null,
          strategyUsed: this.name,
          confidence: 0,
          unresolvedConflicts: [
            {
              type: 'no_similar_patterns',
              description: 'No similar patterns found in the cache',
              reason: 'Insufficient pattern data',
            },
          ],
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }
      
      similarPatterns.sort((a, b) => b.similarity - a.similarity);
      
      const bestPattern = similarPatterns[0];
      
      const resolvedData = await this.applyPatternTransformation(
        sourceData,
        targetData,
        bestPattern.transformationPath,
      );
      
      return {
        success: true,
        resolvedData,
        strategyUsed: this.name,
        confidence: bestPattern.similarity, // Confidence based on similarity score
        resolvedConflicts: [
          {
            type: 'pattern_matching',
            description: `Applied pattern transformation with similarity ${bestPattern.similarity.toFixed(2)}`,
            resolution: 'Used similar transformation pattern from cache',
          },
        ],
        metadata: {
          executionTime: Date.now() - startTime,
          transformationPath: bestPattern.transformationPath,
          additionalInfo: {
            patternSimilarity: bestPattern.similarity,
            patternId: bestPattern.id,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error in pattern matching resolution: ${error.message}`, error.stack);
      return {
        success: false,
        resolvedData: null,
        strategyUsed: this.name,
        confidence: 0,
        unresolvedConflicts: [
          {
            type: 'pattern_matching_error',
            description: `Error applying pattern matching resolution`,
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
   * Find similar patterns in the cache
   * @param sourceDescriptor Source descriptor
   * @param targetDescriptor Target descriptor
   * @returns Array of similar patterns with similarity scores
   */
  private async findSimilarPatterns(
    sourceDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    targetDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
  ): Promise<Array<{ id: string; similarity: number; transformationPath: any }>> {
    const transformationPath = await this.intelligentCache.retrieveTransformationPath(
      sourceDescriptor,
      targetDescriptor,
      0.7, // Minimum similarity threshold
    );
    
    if (!transformationPath) {
      return [];
    }
    
    return [{
      id: 'pattern-' + Date.now(),
      similarity: 0.8, // Estimated similarity
      transformationPath,
    }];
  }

  /**
   * Apply a pattern transformation to the source data
   * @param sourceData Source data
   * @param targetData Target data
   * @param transformationPath Transformation path to apply
   * @returns Transformed data
   */
  private async applyPatternTransformation(
    sourceData: any,
    targetData: any,
    transformationPath: any,
  ): Promise<any> {
    
    const steps = transformationPath.steps || [];
    
    let result = { ...sourceData };
    
    for (const step of steps) {
      if (step.type === 'field_mapping') {
        result = this.applyFieldMapping(result, step.mapping);
      } else if (step.type === 'structure_transformation') {
        result = this.applyStructureTransformation(result, step.transformation);
      } else if (step.type === 'conflict_resolution') {
        result = this.applyConflictResolution(result, targetData, step.resolution);
      } else {
        throw new Error(`Unknown transformation step type: ${step.type}`);
      }
    }
    
    return result;
  }

  /**
   * Apply field mapping transformation
   * @param data Data to transform
   * @param mapping Field mapping
   * @returns Transformed data
   */
  private applyFieldMapping(data: any, mapping: Record<string, string>): any {
    const result = {};
    
    for (const [targetField, sourceField] of Object.entries(mapping)) {
      result[targetField] = data[sourceField];
    }
    
    return result;
  }

  /**
   * Apply structure transformation
   * @param data Data to transform
   * @param transformation Structure transformation
   * @returns Transformed data
   */
  private applyStructureTransformation(data: any, transformation: any): any {
    return transformation(data);
  }

  /**
   * Apply conflict resolution
   * @param sourceData Source data
   * @param targetData Target data
   * @param resolution Resolution strategy
   * @returns Resolved data
   */
  private applyConflictResolution(sourceData: any, targetData: any, resolution: any): any {
    return { ...sourceData, ...targetData, ...resolution };
  }
}
