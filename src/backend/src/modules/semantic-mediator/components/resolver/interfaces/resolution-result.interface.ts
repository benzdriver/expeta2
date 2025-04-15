/**
 * Interface for resolution results
 * Defines the structure of the result returned by resolution strategies
 */
export interface ResolutionResult {
  /**
   * Whether the resolution was successful
   */
  success: boolean;

  /**
   * The resolved data
   */
  resolvedData: unknown;

  /**
   * The strategy used for resolution
   */
  strategyUsed: string;

  /**
   * Confidence score of the resolution (0-1)
   */
  confidence: number;

  /**
   * List of conflicts that were resolved
   */
  resolvedConflicts?: {
    type: string;
    description: string;
    resolution: string;
  }[];

  /**
   * List of conflicts that could not be resolved
   */
  unresolvedConflicts?: {
    type: string;
    description: string;
    reason: string;
  }[];

  /**
   * Metadata about the resolution process
   */
  metadata?: {
    executionTime?: number;
    transformationPath?: unknown;
    additionalInfo?: unknown;
  };
}
