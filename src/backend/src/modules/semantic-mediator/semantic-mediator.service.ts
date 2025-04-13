import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';

import { SemanticDescriptor } from './interfaces/semantic-descriptor.interface';

import { SemanticRegistryService } from './components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from './components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from './components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from './components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from './components/human-in-the-loop/human-in-the-loop.service';

@Injectable()
export class SemanticMediatorService {
  private readonly logger = new Logger(SemanticMediatorService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
    private readonly semanticRegistry: SemanticRegistryService,
    private readonly transformationEngine: TransformationEngineService,
    private readonly intelligentCache: IntelligentCacheService,
    private readonly monitoringSystem: MonitoringSystemService,
    private readonly humanInTheLoop: HumanInTheLoopService,
  ) {}

  /**
   * 在不同模块之间转换数据，保持语义一致性
   */
  async translateBetweenModules(sourceModule: string, targetModule: string, data: any): Promise<any> {
    try {
      this.logger.debug(`Translating data from ${sourceModule} to ${targetModule}`);
      
      const sourceDescriptor: SemanticDescriptor = {
        entity: sourceModule,
        description: `Data from ${sourceModule} module`,
        attributes: {
          data: {
            type: typeof data,
            description: `Data content from ${sourceModule}`
          }
        },
        metadata: {
          module: sourceModule,
          dataType: typeof data
        }
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: targetModule,
        description: `Data for ${targetModule} module`,
        attributes: {
          data: {
            type: 'object',
            description: `Data content for ${targetModule}`
          }
        },
        metadata: {
          module: targetModule
        }
      };
      
      const cachedPath = await this.intelligentCache.retrieveTransformationPath(
        sourceDescriptor,
        targetDescriptor,
        0.8 // 高相似度阈值
      );
      
      if (cachedPath) {
        this.logger.debug(`Found cached transformation path from ${sourceModule} to ${targetModule}`);
        
        const result = await this.transformationEngine.executeTransformation(
          data,
          cachedPath,
          { sourceModule, targetModule }
        );
        
        await this.intelligentCache.updateUsageStatistics(cachedPath.id);
        
        await this.monitoringSystem.logTransformationEvent({
          type: 'module_translation',
          sourceModule,
          targetModule,
          usedCache: true,
          timestamp: new Date().toISOString()
        });
        
        return result;
      }
      
      this.logger.debug(`Generating new transformation path from ${sourceModule} to ${targetModule}`);
      
      const transformationPath = await this.transformationEngine.generateTransformationPath(
        sourceDescriptor,
        targetDescriptor,
        { sourceModule, targetModule }
      );
      
      const result = await this.transformationEngine.executeTransformation(
        data,
        transformationPath,
        { sourceModule, targetModule }
      );
      
      const validationResult = await this.transformationEngine.validateTransformation(
        result,
        targetDescriptor,
        { sourceModule, targetModule }
      );
      
      if (validationResult.valid) {
        await this.intelligentCache.storeTransformationPath(
          sourceDescriptor,
          targetDescriptor,
          transformationPath,
          { 
            sourceModule, 
            targetModule,
            timestamp: new Date().toISOString()
          }
        );
      }
      
      await this.monitoringSystem.logTransformationEvent({
        type: 'module_translation',
        sourceModule,
        targetModule,
        usedCache: false,
        validationResult,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Error translating between modules: ${error.message}`, error.stack);
      
      await this.monitoringSystem.logError(error, {
        operation: 'translateBetweenModules',
        sourceModule,
        targetModule,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to translate data from ${sourceModule} to ${targetModule}: ${error.message}`);
    }
  }

  /**
   * 使用上下文信息丰富模块数据
   */
  async enrichWithContext(module: string, data: any, contextQuery: string): Promise<any> {
    try {
      this.logger.debug(`Enriching data from module ${module} with context: ${contextQuery}`);
      
      const sourceDescriptor: SemanticDescriptor = {
        entity: module,
        description: `Data from ${module} module`,
        attributes: {
          data: {
            type: typeof data,
            description: `Data content from ${module}`
          }
        },
        metadata: {
          module,
          contextQuery
        }
      };
      
      const relatedMemories = await this.memoryService.getRelatedMemories(contextQuery);
      
      if (!relatedMemories || relatedMemories.length === 0) {
        this.logger.debug(`No related memories found for query: ${contextQuery}`);
        return data;
      }
      
      const originalData = {
        ...data,
        _relatedMemories: relatedMemories.map(m => m.content)
      };
      
      await this.monitoringSystem.logTransformationEvent({
        type: 'context_enrichment',
        module,
        contextQuery,
        memoryCount: relatedMemories.length,
        timestamp: new Date().toISOString()
      });
      
      const enrichmentContext = {
        module,
        contextQuery,
        relatedMemories: relatedMemories.map(m => m.content)
      };
      
      const transformationPath = {
        source: sourceDescriptor,
        target: sourceDescriptor, // 丰富操作不改变实体类型
        steps: [
          {
            type: 'context_enrichment',
            contextQuery,
            memoryCount: relatedMemories.length
          }
        ],
        recommendedStrategy: 'llm_enrichment'
      };
      
      const result = await this.transformationEngine.executeTransformation(
        originalData,
        transformationPath,
        enrichmentContext
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Error enriching with context: ${error.message}`, error.stack);
      
      await this.monitoringSystem.logError(error, {
        operation: 'enrichWithContext',
        module,
        contextQuery,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to enrich data with context: ${error.message}`);
    }
  }

  /**
   * 解决不同模块之间的语义冲突
   */
  async resolveSemanticConflicts(moduleA: string, dataA: any, moduleB: string, dataB: any): Promise<any> {
    try {
      this.logger.debug(`Resolving semantic conflicts between ${moduleA} and ${moduleB}`);
      
      const descriptorA: SemanticDescriptor = {
        entity: moduleA,
        description: `Data from ${moduleA} module`,
        attributes: {
          data: {
            type: typeof dataA,
            description: `Data content from ${moduleA}`
          }
        },
        metadata: {
          module: moduleA
        }
      };
      
      const descriptorB: SemanticDescriptor = {
        entity: moduleB,
        description: `Data from ${moduleB} module`,
        attributes: {
          data: {
            type: typeof dataB,
            description: `Data content from ${moduleB}`
          }
        },
        metadata: {
          module: moduleB
        }
      };
      
      const transformationPath = {
        source: {
          type: 'composite',
          components: [descriptorA, descriptorB]
        },
        target: {
          type: 'resolved',
          components: [descriptorA, descriptorB]
        },
        steps: [
          {
            type: 'conflict_resolution',
            modules: [moduleA, moduleB]
          }
        ],
        recommendedStrategy: 'semantic_conflict_resolution'
      };
      
      const result = await this.transformationEngine.executeTransformation(
        { moduleA: dataA, moduleB: dataB },
        transformationPath,
        { moduleA, moduleB }
      );
      
      await this.monitoringSystem.logTransformationEvent({
        type: 'conflict_resolution',
        moduleA,
        moduleB,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Error resolving semantic conflicts: ${error.message}`, error.stack);
      
      await this.monitoringSystem.logError(error, {
        operation: 'resolveSemanticConflicts',
        moduleA,
        moduleB,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to resolve semantic conflicts between ${moduleA} and ${moduleB}: ${error.message}`);
    }
  }

  /**
   * 从数据中提取语义洞察
   */
  async extractSemanticInsights(data: any, query: string): Promise<any> {
    try {
      this.logger.debug(`Extracting semantic insights with query: ${query}`);
      
      const dataDescriptor: SemanticDescriptor = {
        entity: 'data_insights',
        description: `Data for semantic insights extraction`,
        attributes: {
          data: {
            type: typeof data,
            description: `Source data for insights extraction`
          },
          query: {
            type: 'string',
            description: `Query for insights extraction`
          }
        },
        metadata: {
          query,
          dataType: typeof data
        }
      };
      
      const transformationPath = {
        source: dataDescriptor,
        target: {
          entity: 'insights',
          description: 'Extracted semantic insights',
          attributes: {
            insights: {
              type: 'object',
              description: 'Structured semantic insights'
            }
          }
        },
        steps: [
          {
            type: 'semantic_insights_extraction',
            query
          }
        ],
        recommendedStrategy: 'llm_insights'
      };
      
      const result = await this.transformationEngine.executeTransformation(
        data,
        transformationPath,
        { query }
      );
      
      await this.monitoringSystem.logTransformationEvent({
        type: 'semantic_insights_extraction',
        query,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Error extracting semantic insights: ${error.message}`, error.stack);
      
      await this.monitoringSystem.logError(error, {
        operation: 'extractSemanticInsights',
        query,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to extract semantic insights: ${error.message}`);
    }
  }


  /**
   * 跟踪和记录模块间的语义转换
   * 增强版本：添加了详细的转换分析和差异检测
   */
  async trackSemanticTransformation(
    sourceModule: string, 
    targetModule: string, 
    sourceData: any, 
    transformedData: any,
    options?: {
      trackDifferences?: boolean;
      analyzeTransformation?: boolean;
      saveToMemory?: boolean;
    }
  ): Promise<any> {
    const trackOptions = {
      trackDifferences: true,
      analyzeTransformation: true,
      saveToMemory: true,
      ...options
    };
    
    try {
      const transformationId = `${sourceModule}_to_${targetModule}_${Date.now()}`;
      
      const sourceDescriptor: SemanticDescriptor = {
        entity: sourceModule,
        description: `Data from ${sourceModule} module`,
        attributes: {
          data: {
            type: typeof sourceData,
            description: `Source data from ${sourceModule}`
          }
        },
        metadata: {
          module: sourceModule,
          timestamp: new Date().toISOString()
        }
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: targetModule,
        description: `Data for ${targetModule} module`,
        attributes: {
          data: {
            type: typeof transformedData,
            description: `Transformed data for ${targetModule}`
          }
        },
        metadata: {
          module: targetModule,
          timestamp: new Date().toISOString()
        }
      };
      
      const transformationRecord = {
        sourceModule,
        targetModule,
        sourceData,
        transformedData,
        timestamp: new Date(),
        transformationId
      };
      
      await this.monitoringSystem.logTransformationEvent({
        type: 'semantic_transformation_tracking',
        sourceModule,
        targetModule,
        transformationId,
        timestamp: new Date().toISOString()
      });
      
      if (trackOptions.trackDifferences) {
        this.logger.debug('Analyzing semantic differences between source and transformed data');
        
        const diffTransformPath = {
          source: sourceDescriptor,
          target: targetDescriptor,
          steps: [
            {
              type: 'semantic_difference_analysis',
              sourceModule,
              targetModule
            }
          ],
          recommendedStrategy: 'semantic_diff'
        };
        
        const differenceAnalysis = await this.transformationEngine.executeTransformation(
          { source: sourceData, target: transformedData },
          diffTransformPath,
          { sourceModule, targetModule }
        );
        
        transformationRecord['differences'] = differenceAnalysis;
      }
      
      if (trackOptions.analyzeTransformation) {
        this.logger.debug('Generating transformation analysis report');
        
        const analysisTransformPath = {
          source: sourceDescriptor,
          target: targetDescriptor,
          steps: [
            {
              type: 'transformation_analysis',
              sourceModule,
              targetModule
            }
          ],
          recommendedStrategy: 'transformation_analysis'
        };
        
        const transformationAnalysis = await this.transformationEngine.executeTransformation(
          { source: sourceData, target: transformedData },
          analysisTransformPath,
          { sourceModule, targetModule }
        );
        
        transformationRecord['analysis'] = transformationAnalysis;
      }
      
      if (trackOptions.saveToMemory) {
        this.logger.debug(`Storing semantic transformation from ${sourceModule} to ${targetModule}`);
        
        await this.intelligentCache.storeTransformationPath(
          sourceDescriptor,
          targetDescriptor,
          {
            sourceModule,
            targetModule,
            transformationId
          },
          {
            timestamp: new Date().toISOString(),
            hasAnalysis: trackOptions.analyzeTransformation,
            hasDifferences: trackOptions.trackDifferences
          }
        );
        
        await this.memoryService.storeMemory({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: transformationRecord,
          metadata: {
            sourceModule,
            targetModule,
            timestamp: new Date(),
            hasAnalysis: trackOptions.analyzeTransformation,
            hasDifferences: trackOptions.trackDifferences,
            transformationId
          },
          tags: [
            'semantic_transformation', 
            sourceModule, 
            targetModule, 
            `${sourceModule}_to_${targetModule}`,
            transformationId
          ]
        });
      }
      
      this.logger.log(`Successfully tracked semantic transformation from ${sourceModule} to ${targetModule}`);
      return transformationRecord;
    } catch (error) {
      this.logger.error(`Error tracking semantic transformation: ${error.message}`, error.stack);
      
      await this.monitoringSystem.logError(error, {
        operation: 'trackSemanticTransformation',
        sourceModule,
        targetModule,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to track semantic transformation: ${error.message}`);
    }
  }
  
  /**
   * 分析源数据和转换后数据之间的语义差异
   * 私有方法，用于支持trackSemanticTransformation
   */
  private async analyzeSemanticDifferences(
    sourceData: any, 
    transformedData: any,
    sourceModule: string,
    targetModule: string
  ): Promise<any> {
    try {
      const differencePrompt = `
        分析以下两组数据之间的语义差异：
        
        源模块 (${sourceModule}) 数据：
        ${JSON.stringify(sourceData, null, 2)}
        
        目标模块 (${targetModule}) 数据：
        ${JSON.stringify(transformedData, null, 2)}
        
        请详细分析：
        1. 语义保留情况：哪些关键语义被保留，哪些被改变或丢失
        2. 结构变化：数据结构如何变化，以及这些变化的目的
        3. 信息增减：哪些信息被添加或删除，为什么
        4. 潜在问题：转换过程中可能存在的问题或风险
        
        以JSON格式返回分析结果，包含以下字段：
        - semanticPreservation: 对象，包含保留的关键语义和变化/丢失的语义
        - structuralChanges: 数组，每个元素描述一个结构变化及其目的
        - informationChanges: 对象，包含添加的信息和删除的信息及原因
        - potentialIssues: 数组，每个元素描述一个潜在问题或风险
        - overallAssessment: 字符串，总体评估
      `;
      
      const analysisText = await this.llmService.generateContent(differencePrompt, {
        systemPrompt: '你是一个专业的语义分析专家，擅长分析数据转换过程中的语义变化。',
      });
      
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error analyzing semantic differences: ${error.message}`, error.stack);
      return {
        error: `Failed to analyze semantic differences: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * 生成转换分析报告
   * 私有方法，用于支持trackSemanticTransformation
   */
  private async generateTransformationAnalysis(
    sourceModule: string,
    targetModule: string,
    sourceData: any,
    transformedData: any
  ): Promise<any> {
    try {
      const analysisPrompt = `
        生成以下语义转换的分析报告：
        
        源模块：${sourceModule}
        目标模块：${targetModule}
        
        源数据：
        ${JSON.stringify(sourceData, null, 2)}
        
        转换后的数据：
        ${JSON.stringify(transformedData, null, 2)}
        
        请分析：
        1. 转换的主要目的和意图
        2. 转换过程中应用的主要语义转换规则
        3. 转换的完整性和准确性
        4. 转换后数据对目标模块的适用性
        5. 转换过程中的创新点或特殊处理
        
        以JSON格式返回分析报告，包含以下字段：
        - purpose: 字符串，转换的主要目的
        - transformationRules: 数组，应用的主要转换规则
        - completeness: 数字(0-100)，转换的完整性评分
        - accuracy: 数字(0-100)，转换的准确性评分
        - applicability: 数字(0-100)，转换后数据对目标模块的适用性评分
        - innovations: 数组，转换过程中的创新点
        - recommendations: 数组，改进建议
      `;
      
      const analysisText = await this.llmService.generateContent(analysisPrompt, {
        systemPrompt: '你是一个专业的语义转换分析专家，擅长评估模块间数据转换的质量和特点。',
      });
      
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error generating transformation analysis: ${error.message}`, error.stack);
      return {
        error: `Failed to generate transformation analysis: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * 评估语义转换的质量
   */
  async evaluateSemanticTransformation(sourceData: any, transformedData: any, 
                                      expectedOutcome: string): Promise<any> {
    try {
      this.logger.debug(`Evaluating semantic transformation with expected outcome: ${expectedOutcome}`);
      
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'source_data',
        description: `Source data for transformation evaluation`,
        attributes: {
          data: {
            type: typeof sourceData,
            description: `Original data before transformation`
          }
        },
        metadata: {
          dataType: typeof sourceData,
          timestamp: new Date().toISOString()
        }
      };
      
      const targetDescriptor: SemanticDescriptor = {
        entity: 'transformed_data',
        description: `Transformed data for evaluation`,
        attributes: {
          data: {
            type: typeof transformedData,
            description: `Data after transformation`
          }
        },
        metadata: {
          dataType: typeof transformedData,
          timestamp: new Date().toISOString()
        }
      };
      
      const evaluationTransformPath = {
        source: sourceDescriptor,
        target: targetDescriptor,
        steps: [
          {
            type: 'transformation_evaluation',
            expectedOutcome
          }
        ],
        recommendedStrategy: 'quality_evaluation'
      };
      
      const evaluationResult = await this.transformationEngine.executeTransformation(
        { source: sourceData, target: transformedData },
        evaluationTransformPath,
        { expectedOutcome }
      );
      
      await this.monitoringSystem.logTransformationEvent({
        type: 'semantic_transformation_evaluation',
        timestamp: new Date().toISOString(),
        expectedOutcome: expectedOutcome.substring(0, 100), // 截断过长的描述
        evaluationSummary: {
          semanticPreservation: evaluationResult.semanticPreservation,
          structuralAdaptability: evaluationResult.structuralAdaptability,
          informationCompleteness: evaluationResult.informationCompleteness,
          overallQuality: evaluationResult.overallQuality
        }
      });
      
      return evaluationResult;
    } catch (error) {
      this.logger.error(`Error evaluating semantic transformation: ${error.message}`, error.stack);
      
      await this.monitoringSystem.logError(error, {
        operation: 'evaluateSemanticTransformation',
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to evaluate semantic transformation: ${error.message}`);
    }
  }
  
  /**
   * 生成自适应验证上下文
   * 基于语义分析为验证过程提供上下文信息
   */
  async generateValidationContext(
    expectationId: string,
    codeId: string,
    previousValidations: string[] = [],
    options: {
      focusAreas?: string[];
      strategy?: 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom';
      customWeights?: Record<string, number>;
    } = {}
  ): Promise<any> {
    this.logger.log(`Generating validation context for expectation: ${expectationId}, code: ${codeId}`);
    
    try {
      const debugSessionId = await this.monitoringSystem.createDebugSession({
        operation: 'generateValidationContext',
        expectationId,
        codeId,
        timestamp: new Date().toISOString()
      });
      
      const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
      const expectation = expectationMemories.find(
        (memory) => memory.content._id.toString() === expectationId,
      )?.content;
      
      const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
      const code = codeMemories.find(
        (memory) => memory.content._id.toString() === codeId,
      )?.content;
      
      if (!expectation || !code) {
        this.logger.error(`Expectation or Code not found for generating validation context`);
        await this.monitoringSystem.logError(new Error('Expectation or Code not found'), {
          operation: 'generateValidationContext',
          expectationId,
          codeId,
          debugSessionId
        });
        throw new Error('Expectation or Code not found');
      }
      
      await this.monitoringSystem.logDebugData(debugSessionId, {
        stage: 'data_retrieval',
        expectation: {
          id: expectationId,
          found: !!expectation
        },
        code: {
          id: codeId,
          found: !!code
        }
      });
      
      const expectationDescriptor: SemanticDescriptor = {
        entity: 'expectation',
        description: `Expectation for validation context generation`,
        attributes: {
          content: {
            type: 'object',
            description: `Expectation content`
          }
        },
        metadata: {
          id: expectationId,
          timestamp: new Date().toISOString()
        }
      };
      
      const codeDescriptor: SemanticDescriptor = {
        entity: 'code',
        description: `Code for validation context generation`,
        attributes: {
          content: {
            type: 'object',
            description: `Code content`
          }
        },
        metadata: {
          id: codeId,
          timestamp: new Date().toISOString()
        }
      };
      
      let previousValidationsData = [];
      if (previousValidations && previousValidations.length > 0) {
        const validationMemories = await this.memoryService.getMemoryByType(MemoryType.VALIDATION);
        previousValidationsData = validationMemories
          .filter(memory => previousValidations.includes(memory.content._id.toString()))
          .map(memory => memory.content);
      }
      
      await this.monitoringSystem.logDebugData(debugSessionId, {
        stage: 'previous_validations',
        count: previousValidationsData.length,
        ids: previousValidations
      });
      
      const cacheKey = `validation_context_${expectationId}_${codeId}`;
      const cachedContext = await this.intelligentCache.retrieveTransformationPath(
        expectationDescriptor,
        codeDescriptor,
        0.95 // 高相似度阈值
      );
      
      if (cachedContext) {
        this.logger.debug(`Retrieved validation context from cache for expectation: ${expectationId}, code: ${codeId}`);
        
        await this.monitoringSystem.logTransformationEvent({
          type: 'validation_context_cache_hit',
          expectationId,
          codeId,
          timestamp: new Date().toISOString(),
          debugSessionId
        });
        
        await this.intelligentCache.updateUsageStatistics(cacheKey, {
          timestamp: new Date().toISOString(),
          operation: 'generateValidationContext'
        });
        
        return cachedContext;
      }
      
      const transformationPath = {
        source: expectationDescriptor,
        target: codeDescriptor,
        steps: [
          {
            type: 'code_features_extraction',
            codeId
          },
          {
            type: 'semantic_relationship_analysis',
            expectationId,
            codeId
          },
          {
            type: 'validation_context_generation',
            strategy: options.strategy || 'balanced',
            previousValidations: previousValidations.length
          }
        ],
        recommendedStrategy: 'validation_context'
      };
      
      const contextData = await this.transformationEngine.executeTransformation(
        { expectation, code, previousValidationsData },
        transformationPath,
        { 
          strategy: options.strategy || 'balanced',
          customWeights: options.customWeights,
          focusAreas: options.focusAreas
        }
      );
      
      const strategy = options.strategy || 'balanced';
      let weights = this.getStrategyWeights(strategy);
      
      if (options.customWeights) {
        weights = { ...weights, ...options.customWeights };
      }
      
      if (previousValidationsData.length > 0) {
        weights = this.adjustWeightsBasedOnPreviousValidations(weights, previousValidationsData);
      }
      
      let focusAreas = options.focusAreas || [];
      
      if (focusAreas.length === 0 && previousValidationsData.length > 0) {
        focusAreas = this.suggestFocusAreasFromPreviousValidations(previousValidationsData);
      }
      
      const validationContext = {
        strategy,
        weights,
        focusAreas,
        previousValidations,
        semanticContext: {
          codeFeatures: contextData.codeFeatures || await this.extractCodeFeatures(code),
          semanticRelationship: contextData.semanticRelationship || await this.analyzeSemanticRelationship(expectation, code),
          expectationSummary: this.summarizeExpectation(expectation),
          validationHistory: this.summarizeValidationHistory(previousValidationsData)
        }
      };
      
      await this.intelligentCache.storeTransformationPath(
        expectationDescriptor,
        codeDescriptor,
        validationContext,
        {
          timestamp: new Date().toISOString(),
          strategy,
          focusAreasCount: focusAreas.length,
          previousValidationsCount: previousValidations.length
        }
      );
      
      await this.monitoringSystem.logTransformationEvent({
        type: 'validation_context_generation',
        expectationId,
        codeId,
        strategy,
        focusAreas,
        timestamp: new Date().toISOString(),
        debugSessionId
      });
      
      await this.monitoringSystem.endDebugSession(debugSessionId);
      
      this.logger.debug(`Generated validation context with strategy: ${strategy}, focusAreas: ${focusAreas.join(', ')}`);
      return validationContext;
    } catch (error) {
      this.logger.error(`Error generating validation context: ${error.message}`, error.stack);
      
      await this.monitoringSystem.logError(error, {
        operation: 'generateValidationContext',
        expectationId,
        codeId,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to generate validation context: ${error.message}`);
    }
  }
  
  /**
   * 提取代码特征
   * 私有方法，用于支持generateValidationContext
   */
  private async extractCodeFeatures(code: any): Promise<any> {
    try {
      const codeContent = code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n');
      
      const featuresPrompt = `
        分析以下代码，提取其主要特征：
        
        ${codeContent}
        
        请提取以下特征：
        1. 代码复杂度
        2. 主要功能模块
        3. 使用的设计模式
        4. 潜在的性能瓶颈
        5. 安全性考虑
        6. 可维护性特征
        
        以JSON格式返回分析结果。
      `;
      
      const featuresText = await this.llmService.generateContent(featuresPrompt, {
        systemPrompt: '你是一个专业的代码分析专家，擅长分析代码的结构和特征。',
      });
      
      return JSON.parse(featuresText);
    } catch (error) {
      this.logger.error(`Error extracting code features: ${error.message}`, error.stack);
      return {
        error: `Failed to extract code features: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * 分析期望和代码之间的语义关系
   * 私有方法，用于支持generateValidationContext
   */
  private async analyzeSemanticRelationship(expectation: any, code: any): Promise<any> {
    try {
      const codeContent = code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n');
      
      const relationshipPrompt = `
        分析以下期望模型和代码之间的语义关系：
        
        期望模型：
        ${JSON.stringify(expectation.model, null, 2)}
        
        代码：
        ${codeContent}
        
        请分析：
        1. 代码与期望的匹配度
        2. 代码实现了哪些期望的功能
        3. 代码未实现的期望功能
        4. 代码超出期望的功能
        5. 代码与期望在语义上的差异
        
        以JSON格式返回分析结果。
      `;
      
      const relationshipText = await this.llmService.generateContent(relationshipPrompt, {
        systemPrompt: '你是一个专业的语义分析专家，擅长分析代码与需求之间的关系。',
      });
      
      return JSON.parse(relationshipText);
    } catch (error) {
      this.logger.error(`Error analyzing semantic relationship: ${error.message}`, error.stack);
      return {
        error: `Failed to analyze semantic relationship: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * 根据验证策略获取权重
   * 私有方法，用于支持generateValidationContext
   */
  private getStrategyWeights(strategy: string): Record<string, number> {
    switch (strategy) {
      case 'strict':
        return {
          functionality: 1.5,
          performance: 1.0,
          security: 1.2,
          maintainability: 1.0,
          testability: 1.0
        };
      case 'lenient':
        return {
          functionality: 1.2,
          performance: 0.8,
          security: 0.8,
          maintainability: 0.8,
          testability: 0.7
        };
      case 'performance':
        return {
          functionality: 1.0,
          performance: 2.0,
          security: 0.8,
          maintainability: 0.7,
          testability: 0.6
        };
      case 'security':
        return {
          functionality: 1.0,
          performance: 0.8,
          security: 2.0,
          maintainability: 0.8,
          testability: 0.7
        };
      case 'balanced':
      default:
        return {
          functionality: 1.0,
          performance: 1.0,
          security: 1.0,
          maintainability: 1.0,
          testability: 1.0
        };
    }
  }
  
  /**
   * 基于先前验证结果调整权重
   * 私有方法，用于支持generateValidationContext
   */
  private adjustWeightsBasedOnPreviousValidations(
    weights: Record<string, number>,
    previousValidations: any[]
  ): Record<string, number> {
    const adjustedWeights = { ...weights };
    
    if (!previousValidations || previousValidations.length === 0) {
      return adjustedWeights;
    }
    
    const latestValidation = previousValidations[previousValidations.length - 1];
    
    if (latestValidation.details && latestValidation.details.length > 0) {
      const failureCount = {
        functionality: 0,
        performance: 0,
        security: 0,
        maintainability: 0,
        testability: 0
      };
      
      for (const detail of latestValidation.details) {
        const message = detail.message.toLowerCase();
        
        if (detail.status === 'failed' || detail.status === 'partial') {
          if (message.includes('功能') || message.includes('function')) {
            failureCount.functionality++;
          }
          if (message.includes('性能') || message.includes('performance')) {
            failureCount.performance++;
          }
          if (message.includes('安全') || message.includes('security')) {
            failureCount.security++;
          }
          if (message.includes('可维护') || message.includes('maintainability')) {
            failureCount.maintainability++;
          }
          if (message.includes('可测试') || message.includes('testability')) {
            failureCount.testability++;
          }
        }
      }
      
      for (const [aspect, count] of Object.entries(failureCount)) {
        if (count > 0 && adjustedWeights[aspect]) {
          adjustedWeights[aspect] = Math.min(adjustedWeights[aspect] * (1 + 0.2 * count), 2.0);
        }
      }
    }
    
    return adjustedWeights;
  }
  
  /**
   * 从先前验证结果中推荐重点关注领域
   * 私有方法，用于支持generateValidationContext
   */
  private suggestFocusAreasFromPreviousValidations(previousValidations: any[]): string[] {
    const focusAreas = [];
    
    if (!previousValidations || previousValidations.length === 0) {
      return focusAreas;
    }
    
    const latestValidation = previousValidations[previousValidations.length - 1];
    
    if (latestValidation.details && latestValidation.details.length > 0) {
      for (const detail of latestValidation.details) {
        if (detail.status === 'failed' || detail.status === 'partial') {
          const message = detail.message.toLowerCase();
          
          if (message.includes('功能') || message.includes('function')) {
            focusAreas.push('functionality');
          }
          if (message.includes('性能') || message.includes('performance')) {
            focusAreas.push('performance');
          }
          if (message.includes('安全') || message.includes('security')) {
            focusAreas.push('security');
          }
          if (message.includes('可维护') || message.includes('maintainability')) {
            focusAreas.push('maintainability');
          }
          if (message.includes('可测试') || message.includes('testability')) {
            focusAreas.push('testability');
          }
          
          if (detail.semanticInsights) {
            const insights = detail.semanticInsights.toLowerCase();
            const specificAreas = this.extractSpecificFocusAreas(insights);
            focusAreas.push(...specificAreas);
          }
        }
      }
    }
    
    return [...new Set(focusAreas)];
  }
  
  /**
   * 从语义洞察中提取具体的关注领域
   * 私有方法，用于支持suggestFocusAreasFromPreviousValidations
   */
  private extractSpecificFocusAreas(insights: string): string[] {
    const specificAreas = [];
    
    const keywordMap = {
      '错误处理': 'error_handling',
      'error handling': 'error_handling',
      '异常处理': 'exception_handling',
      'exception handling': 'exception_handling',
      '输入验证': 'input_validation',
      'input validation': 'input_validation',
      '并发': 'concurrency',
      'concurrency': 'concurrency',
      '内存泄漏': 'memory_leaks',
      'memory leak': 'memory_leaks',
      '代码重复': 'code_duplication',
      'code duplication': 'code_duplication',
      '命名': 'naming',
      'naming': 'naming',
      '注释': 'comments',
      'comments': 'comments',
      '文档': 'documentation',
      'documentation': 'documentation',
      '测试覆盖': 'test_coverage',
      'test coverage': 'test_coverage',
      '边界条件': 'boundary_conditions',
      'boundary conditions': 'boundary_conditions',
      '算法效率': 'algorithm_efficiency',
      'algorithm efficiency': 'algorithm_efficiency',
      '数据结构': 'data_structures',
      'data structures': 'data_structures',
      '设计模式': 'design_patterns',
      'design patterns': 'design_patterns',
      '接口设计': 'interface_design',
      'interface design': 'interface_design',
      '模块化': 'modularity',
      'modularity': 'modularity',
      '可扩展性': 'scalability',
      'scalability': 'scalability',
      '安全漏洞': 'security_vulnerabilities',
      'security vulnerabilities': 'security_vulnerabilities',
      '认证': 'authentication',
      'authentication': 'authentication',
      '授权': 'authorization',
      'authorization': 'authorization',
      '加密': 'encryption',
      'encryption': 'encryption',
      '日志': 'logging',
      'logging': 'logging',
      '监控': 'monitoring',
      'monitoring': 'monitoring',
      '性能优化': 'performance_optimization',
      'performance optimization': 'performance_optimization',
      '响应时间': 'response_time',
      'response time': 'response_time',
      '资源利用': 'resource_utilization',
      'resource utilization': 'resource_utilization',
      '用户体验': 'user_experience',
      'user experience': 'user_experience',
      '可访问性': 'accessibility',
      'accessibility': 'accessibility',
      '国际化': 'internationalization',
      'internationalization': 'internationalization',
      '本地化': 'localization',
      'localization': 'localization'
    };
    
    for (const [keyword, area] of Object.entries(keywordMap)) {
      if (insights.includes(keyword)) {
        specificAreas.push(area);
      }
    }
    
    return specificAreas;
  }
  
  /**
   * 总结期望
   * 私有方法，用于支持generateValidationContext
   */
  private summarizeExpectation(expectation: any): any {
    return {
      id: expectation._id.toString(),
      title: expectation.title || '未命名期望',
      description: expectation.description || '无描述',
      type: expectation.type || 'unknown',
      priority: expectation.priority || 'medium',
      createdAt: expectation.createdAt,
      modelSummary: this.summarizeExpectationModel(expectation.model)
    };
  }
  
  /**
   * 总结期望模型
   * 私有方法，用于支持summarizeExpectation
   */
  private summarizeExpectationModel(model: any): any {
    if (!model) {
      return { summary: '无模型数据' };
    }
    
    return {
      mainFeatures: model.features || model.mainFeatures || [],
      constraints: model.constraints || [],
      dependencies: model.dependencies || [],
      technicalRequirements: model.technicalRequirements || model.technical || []
    };
  }
  
  /**
   * 总结验证历史
   * 私有方法，用于支持generateValidationContext
   */
  private summarizeValidationHistory(validations: any[]): any {
    if (!validations || validations.length === 0) {
      return { summary: '无验证历史' };
    }
    
    const scores = validations.map(v => v.score);
    const trend = this.calculateTrend(scores);
    
    const commonIssues = this.extractCommonIssues(validations);
    
    const improvementAreas = this.extractImprovementAreas(validations);
    
    return {
      validationCount: validations.length,
      latestScore: scores[scores.length - 1],
      scoreTrend: trend,
      commonIssues,
      improvementAreas,
      validationDates: validations.map(v => v.createdAt)
    };
  }
  
  /**
   * 计算趋势
   * 私有方法，用于支持summarizeValidationHistory
   */
  private calculateTrend(scores: number[]): string {
    if (scores.length < 2) {
      return 'stable';
    }
    
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const diff = lastScore - firstScore;
    
    if (diff > 5) {
      return 'improving';
    } else if (diff < -5) {
      return 'declining';
    } else {
      return 'stable';
    }
  }
  
  /**
   * 提取常见问题
   * 私有方法，用于支持summarizeValidationHistory
   */
  private extractCommonIssues(validations: any[]): string[] {
    const issueCount = {};
    
    for (const validation of validations) {
      if (validation.details && validation.details.length > 0) {
        for (const detail of validation.details) {
          if (detail.status === 'failed' || detail.status === 'partial') {
            const message = detail.message;
            
            if (issueCount[message]) {
              issueCount[message]++;
            } else {
              issueCount[message] = 1;
            }
          }
        }
      }
    }
    
    const sortedIssues = Object.entries(issueCount)
      .sort((a: [string, any], b: [string, any]) => b[1] - a[1])
      .map(([issue]) => issue);
    
    return sortedIssues.slice(0, 5);
  }
  
  /**
   * 提取改进领域
   * 私有方法，用于支持summarizeValidationHistory
   */
  private extractImprovementAreas(validations: any[]): string[] {
    const recentValidations = validations.slice(-3);
    const areas = new Set<string>();
    
    for (const validation of recentValidations) {
      if (validation.details && validation.details.length > 0) {
        for (const detail of validation.details) {
          if (detail.status === 'failed' || detail.status === 'partial') {
            if (detail.improvement) {
              areas.add(detail.improvement);
            }
          }
        }
      }
    }
    
    return Array.from(areas);
  }
}
