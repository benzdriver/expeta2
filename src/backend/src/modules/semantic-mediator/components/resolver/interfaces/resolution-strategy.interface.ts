import { SemanticDescriptor } from '../../../interfaces/semantic-descriptor.interface';
import { ResolutionResult } from './resolution-result.interface';

/**
 * Interface for resolution strategies
 * Defines the contract for all resolution strategies
 */
export interface ResolutionStrategy {
  /**
   * Name of the strategy
   */
  readonly name: string;

  /**
   * Priority of the strategy (higher values indicate higher priority)
   */
  readonly priority: number;

  /**
   * Check if this strategy can handle the given resolution request
   * @param sourceDescriptor Semantic descriptor of the source data
   * @param targetDescriptor Semantic descriptor of the target data
   * @param context Additional context for the resolution
   * @returns True if this strategy can handle the resolution, false otherwise
   */
  canResolve(
    sourceDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    targetDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    context?: any,
  ): Promise<boolean>;

  /**
   * Resolve the semantic conflict between source and target
   * @param sourceData Source data to resolve
   * @param targetData Target data to resolve against
   * @param sourceDescriptor Semantic descriptor of the source data
   * @param targetDescriptor Semantic descriptor of the target data
   * @param context Additional context for the resolution
   * @returns Resolution result
   */
  resolve(
    sourceData: any,
    targetData: any,
    sourceDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    targetDescriptor: SemanticDescriptor | { type: string; components: SemanticDescriptor[] },
    context?: any,
  ): Promise<ResolutionResult>;
}
