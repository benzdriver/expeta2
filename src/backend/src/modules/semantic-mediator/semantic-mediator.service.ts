import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';

@Injectable()
export class SemanticMediatorService {
  private readonly logger = new Logger(SemanticMediatorService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  /**
   * 在不同模块之间转换数据，保持语义一致性
   */
  async translateBetweenModules(sourceModule: string, targetModule: string, data: any): Promise<any> {
    try {
      const sourceData = JSON.stringify(data, null, 2);
      return await this.llmService.translateBetweenModules(sourceModule, targetModule, sourceData);
    } catch (error) {
      this.logger.error(`Error translating between modules: ${error.message}`, error.stack);
      throw new Error(`Failed to translate data from ${sourceModule} to ${targetModule}: ${error.message}`);
    }
  }

  /**
   * 使用上下文信息丰富模块数据
   */
  async enrichWithContext(module: string, data: any, contextQuery: string): Promise<any> {
    try {
      const relatedMemories = await this.memoryService.getRelatedMemories(contextQuery);
      
      if (!relatedMemories || relatedMemories.length === 0) {
        this.logger.debug(`No related memories found for query: ${contextQuery}`);
        return data;
      }
      
      const originalData = JSON.stringify({
        ...data,
        _relatedMemories: relatedMemories.map(m => m.content)
      }, null, 2);
      
      return await this.llmService.enrichWithContext(module, originalData, contextQuery);
    } catch (error) {
      this.logger.error(`Error enriching with context: ${error.message}`, error.stack);
      throw new Error(`Failed to enrich data with context: ${error.message}`);
    }
  }

  /**
   * 解决不同模块之间的语义冲突
   */
  async resolveSemanticConflicts(moduleA: string, dataA: any, moduleB: string, dataB: any): Promise<any> {
    try {
      const dataAString = JSON.stringify(dataA, null, 2);
      const dataBString = JSON.stringify(dataB, null, 2);
      
      return await this.llmService.resolveSemanticConflicts(moduleA, dataAString, moduleB, dataBString);
    } catch (error) {
      this.logger.error(`Error resolving semantic conflicts: ${error.message}`, error.stack);
      throw new Error(`Failed to resolve semantic conflicts between ${moduleA} and ${moduleB}: ${error.message}`);
    }
  }

  /**
   * 从数据中提取语义洞察
   */
  async extractSemanticInsights(data: any, query: string): Promise<any> {
    try {
      const dataString = JSON.stringify(data, null, 2);
      return await this.llmService.extractSemanticInsights(dataString, query);
    } catch (error) {
      this.logger.error(`Error extracting semantic insights: ${error.message}`, error.stack);
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
      const transformationRecord = {
        sourceModule,
        targetModule,
        sourceData,
        transformedData,
        timestamp: new Date(),
        transformationId: `${sourceModule}_to_${targetModule}_${Date.now()}`
      };
      
      if (trackOptions.trackDifferences) {
        this.logger.debug('Analyzing semantic differences between source and transformed data');
        
        const differenceAnalysis = await this.analyzeSemanticDifferences(
          sourceData, 
          transformedData,
          sourceModule,
          targetModule
        );
        
        transformationRecord['differences'] = differenceAnalysis;
      }
      
      if (trackOptions.analyzeTransformation) {
        this.logger.debug('Generating transformation analysis report');
        
        const transformationAnalysis = await this.generateTransformationAnalysis(
          sourceModule,
          targetModule,
          sourceData,
          transformedData
        );
        
        transformationRecord['analysis'] = transformationAnalysis;
      }
      
      if (trackOptions.saveToMemory) {
        this.logger.debug(`Storing semantic transformation from ${sourceModule} to ${targetModule} in memory`);
        
        await this.memoryService.storeMemory({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: transformationRecord,
          metadata: {
            sourceModule,
            targetModule,
            timestamp: new Date(),
            hasAnalysis: trackOptions.analyzeTransformation,
            hasDifferences: trackOptions.trackDifferences,
            transformationId: transformationRecord.transformationId
          },
          tags: [
            'semantic_transformation', 
            sourceModule, 
            targetModule, 
            `${sourceModule}_to_${targetModule}`,
            transformationRecord.transformationId
          ]
        });
      }
      
      this.logger.log(`Successfully tracked semantic transformation from ${sourceModule} to ${targetModule}`);
      return transformationRecord;
    } catch (error) {
      this.logger.error(`Error tracking semantic transformation: ${error.message}`, error.stack);
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
      const evaluationPrompt = `
        评估以下语义转换的质量：
        
        源数据：
        ${JSON.stringify(sourceData, null, 2)}
        
        转换后的数据：
        ${JSON.stringify(transformedData, null, 2)}
        
        期望的结果描述：
        ${expectedOutcome}
        
        请评估转换的质量，包括：
        1. 语义保留度（0-100）
        2. 结构适应性（0-100）
        3. 信息完整性（0-100）
        4. 总体质量（0-100）
        5. 改进建议
        
        以JSON格式返回评估结果。
      `;
      
      const evaluationText = await this.llmService.generateContent(evaluationPrompt, {
        systemPrompt: '你是一个专业的语义转换评估专家，擅长评估数据转换的质量和准确性。',
      });
      
      return JSON.parse(evaluationText);
    } catch (error) {
      this.logger.error(`Error evaluating semantic transformation: ${error.message}`, error.stack);
      throw new Error(`Failed to evaluate semantic transformation: ${error.message}`);
    }
  }
}
