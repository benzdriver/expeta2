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
   */
  async trackSemanticTransformation(sourceModule: string, targetModule: string, 
                                   sourceData: any, transformedData: any): Promise<void> {
    try {
      await this.memoryService.storeMemory({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: {
          sourceModule,
          targetModule,
          sourceData,
          transformedData,
          timestamp: new Date()
        },
        metadata: {
          sourceModule,
          targetModule,
          timestamp: new Date()
        },
        tags: ['semantic_transformation', sourceModule, targetModule]
      });
      
      this.logger.debug(`Tracked semantic transformation from ${sourceModule} to ${targetModule}`);
    } catch (error) {
      this.logger.error(`Error tracking semantic transformation: ${error.message}`, error.stack);
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
