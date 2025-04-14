import { Injectable, Logger } from '@nestjs/common';
import { SemanticDescriptor } from '../../interfaces/semantic-descriptor.interface';
import { ResolutionStrategy } from './interfaces/resolution-strategy.interface';
import { ResolutionResult } from './interfaces/resolution-result.interface';
import { ExplicitMappingStrategy } from './strategies/explicit-mapping.strategy';
import { PatternMatchingStrategy } from './strategies/pattern-matching.strategy';
import { LlmResolutionStrategy } from './strategies/llm-resolution.strategy';
import { MonitoringSystemService } from '../monitoring-system/monitoring-system.service';
import { IntelligentCacheService } from '../intelligent-cache/intelligent-cache.service';
import { MemoryService } from '../../../memory/memory.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';

/**
 * Resolver service
 * Orchestrates the resolution process using different strategies
 */
@Injectable()
export class ResolverService {
  private readonly logger = new Logger(ResolverService.name);
  private strategies: ResolutionStrategy[] = [];

  constructor(
    private readonly explicitMappingStrategy: ExplicitMappingStrategy,
    private readonly patternMatchingStrategy: PatternMatchingStrategy,
    private readonly llmResolutionStrategy: LlmResolutionStrategy,
    private readonly monitoringSystem: MonitoringSystemService,
    private readonly intelligentCache: IntelligentCacheService,
    private readonly memoryService: MemoryService,
  ) {
    this.registerStrategy(explicitMappingStrategy);
    this.registerStrategy(patternMatchingStrategy);
    this.registerStrategy(llmResolutionStrategy);
  }

  /**
   * Register a resolution strategy
   * @param strategy Resolution strategy to register
   */
  registerStrategy(strategy: ResolutionStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
    this.logger.log(`Registered resolution strategy: ${strategy.name}`);
  }

  /**
   * Resolve semantic conflicts between two modules
   * @param moduleA First module name
   * @param dataA First module data
   * @param moduleB Second module name
   * @param dataB Second module data
   * @param options Resolution options
   * @returns Resolution result
   */
  async resolveConflicts(
    moduleA: string,
    dataA: any,
    moduleB: string,
    dataB: any,
    options?: {
      forceStrategy?: string;
      context?: any;
      cacheResults?: boolean;
    },
  ): Promise<ResolutionResult> {
    const startTime = Date.now();
    const debugSessionId = await this.monitoringSystem.createDebugSession({
      operation: 'resolveConflicts',
      moduleA,
      moduleB,
      timestamp: new Date().toISOString(),
    });

    try {
      this.logger.debug(`Resolving conflicts between ${moduleA} and ${moduleB}`);

      const descriptorA: SemanticDescriptor = {
        entity: moduleA,
        description: `Data from ${moduleA} module`,
        attributes: {
          data: {
            type: typeof dataA,
            description: `Data content from ${moduleA}`,
          },
        },
        metadata: {
          module: moduleA,
        },
      };

      const descriptorB: SemanticDescriptor = {
        entity: moduleB,
        description: `Data from ${moduleB} module`,
        attributes: {
          data: {
            type: typeof dataB,
            description: `Data content from ${moduleB}`,
          },
        },
        metadata: {
          module: moduleB,
        },
      };

      const cacheKey = `resolution_${moduleA}_${moduleB}_${this.generateDataHash(dataA)}_${this.generateDataHash(dataB)}`;
      const cachedResult = await this.intelligentCache.retrieveTransformationPath(
        descriptorA,
        descriptorB,
        0.95, // High similarity threshold
      );

      if (cachedResult && !options?.forceStrategy) {
        this.logger.debug(`Found cached resolution for ${moduleA} and ${moduleB}`);
        
        await this.monitoringSystem.logTransformationEvent({
          type: 'conflict_resolution_cache_hit',
          moduleA,
          moduleB,
          timestamp: new Date().toISOString(),
          debugSessionId,
        });
        
        await this.intelligentCache.updateUsageStatistics(cacheKey);
        
        return cachedResult as ResolutionResult;
      }

      let selectedStrategy: ResolutionStrategy | null = null;
      
      if (options?.forceStrategy) {
        selectedStrategy = this.strategies.find(s => s.name === options.forceStrategy) || null;
        
        if (!selectedStrategy) {
          this.logger.warn(`Forced strategy ${options.forceStrategy} not found, falling back to automatic selection`);
        }
      }
      
      if (!selectedStrategy) {
        for (const strategy of this.strategies) {
          const canResolve = await strategy.canResolve(
            descriptorA,
            descriptorB,
            options?.context,
          );
          
          if (canResolve) {
            selectedStrategy = strategy;
            break;
          }
        }
      }
      
      if (!selectedStrategy) {
        this.logger.warn(`No suitable strategy found, falling back to LLM resolution`);
        selectedStrategy = this.llmResolutionStrategy;
      }
      
      this.logger.debug(`Selected resolution strategy: ${selectedStrategy.name}`);
      
      const result = await selectedStrategy.resolve(
        dataA,
        dataB,
        descriptorA,
        descriptorB,
        options?.context,
      );
      
      await this.monitoringSystem.logTransformationEvent({
        type: 'conflict_resolution',
        moduleA,
        moduleB,
        strategyUsed: selectedStrategy.name,
        confidence: result.confidence,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        debugSessionId,
      });
      
      if (result.success && (options?.cacheResults !== false)) {
        await this.intelligentCache.storeTransformationPath(
          descriptorA,
          descriptorB,
          result,
          {
            strategyUsed: selectedStrategy.name,
            confidence: result.confidence,
            timestamp: new Date().toISOString(),
          },
        );
        
        await this.memoryService.storeMemory({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: {
            moduleA,
            moduleB,
            sourceData: dataA,
            targetData: dataB,
            resolvedData: result.resolvedData,
            strategyUsed: selectedStrategy.name,
            confidence: result.confidence,
          },
          metadata: {
            moduleA,
            moduleB,
            strategyUsed: selectedStrategy.name,
            confidence: result.confidence,
            timestamp: new Date(),
          },
          tags: [
            'conflict_resolution',
            moduleA,
            moduleB,
            `${moduleA}_${moduleB}`,
            selectedStrategy.name,
          ],
        });
      }
      
      await this.monitoringSystem.endDebugSession(debugSessionId);
      
      return result;
    } catch (error) {
      this.logger.error(`Error resolving conflicts: ${error.message}`, error.stack);
      
      await this.monitoringSystem.logError(error, {
        operation: 'resolveConflicts',
        moduleA,
        moduleB,
        debugSessionId,
        timestamp: new Date().toISOString(),
      });
      
      await this.monitoringSystem.endDebugSession(debugSessionId);
      
      return {
        success: false,
        resolvedData: null,
        strategyUsed: 'error',
        confidence: 0,
        unresolvedConflicts: [
          {
            type: 'resolution_error',
            description: `Error resolving conflicts between ${moduleA} and ${moduleB}`,
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
   * Find candidate data sources for a semantic request
   * @param semanticIntent Semantic intent of the request
   * @param context Additional context for the request
   * @returns Array of candidate data sources with relevance scores
   */
  async findCandidateSources(
    semanticIntent: string,
    context?: any,
  ): Promise<Array<{ sourceId: string; relevance: number; metadata: any }>> {
    try {
      this.logger.debug(`Finding candidate sources for semantic intent: ${semanticIntent}`);
      
      const systemMemories = await this.memoryService.getMemoryByType(MemoryType.SYSTEM, 100);
      const registeredSources = systemMemories.filter(memory => 
        memory.tags && memory.tags.includes('data_source')
      );
      
      if (!registeredSources || registeredSources.length === 0) {
        this.logger.debug('No registered data sources found');
        return [];
      }
      
      const candidates = await Promise.all(
        registeredSources.map(async (source) => {
          const sourceContent = source.content;
          const sourceId = sourceContent.id || source._id.toString();
          
          const relevance = await this.calculateRelevanceScore(
            semanticIntent,
            sourceContent.description,
            sourceContent.capabilities || [],
          );
          
          return {
            sourceId,
            relevance,
            metadata: {
              name: sourceContent.name,
              description: sourceContent.description,
              capabilities: sourceContent.capabilities,
            },
          };
        }),
      );
      
      candidates.sort((a, b) => b.relevance - a.relevance);
      
      const relevantCandidates = candidates.filter(c => c.relevance > 0.3);
      
      this.logger.debug(`Found ${relevantCandidates.length} relevant candidate sources`);
      
      return relevantCandidates;
    } catch (error) {
      this.logger.error(`Error finding candidate sources: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Calculate relevance score for a data source
   * @param semanticIntent Semantic intent
   * @param sourceDescription Source description
   * @param capabilities Source capabilities
   * @returns Relevance score (0-1)
   */
  private async calculateRelevanceScore(
    semanticIntent: string,
    sourceDescription: string,
    capabilities: string[],
  ): Promise<number> {
    
    const intent = semanticIntent.toLowerCase();
    const description = sourceDescription.toLowerCase();
    const caps = capabilities.map(c => c.toLowerCase());
    
    let score = 0;
    
    const intentKeywords = intent.split(/\s+/);
    for (const keyword of intentKeywords) {
      if (keyword.length > 3 && description.includes(keyword)) {
        score += 0.2;
      }
    }
    
    for (const capability of caps) {
      if (intent.includes(capability) || capability.includes(intent)) {
        score += 0.3;
      }
    }
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Generate a simple hash for data objects
   * @param data Data to hash
   * @returns Hash string
   */
  private generateDataHash(data: any): string {
    try {
      const str = JSON.stringify(data);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString(16);
    } catch (error) {
      return Date.now().toString(16);
    }
  }
}
