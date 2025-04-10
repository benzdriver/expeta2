import { Injectable } from '@nestjs/common';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';

@Injectable()
export class SemanticMediatorService {
  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  async translateBetweenModules(sourceModule: string, targetModule: string, data: any): Promise<any> {
    const translationPrompt = `
      你是Expeta 2.0系统的语义中介器，负责在不同模块之间进行语义转换。
      
      源模块: ${sourceModule}
      目标模块: ${targetModule}
      
      源数据:
      ${JSON.stringify(data, null, 2)}
      
      请将源模块的数据转换为目标模块可以理解和处理的格式。
      保持语义一致性，但调整结构以符合目标模块的需求。
      
      返回JSON格式的转换结果。
    `;
    
    const translatedDataText = await this.llmService.generateContent(translationPrompt);
    return JSON.parse(translatedDataText);
  }

  async enrichWithContext(module: string, data: any, contextQuery: string): Promise<any> {
    const relatedMemories = await this.memoryService.getRelatedMemories(contextQuery);
    
    const enrichmentPrompt = `
      你是Expeta 2.0系统的语义中介器，负责丰富模块数据的语义上下文。
      
      模块: ${module}
      
      原始数据:
      ${JSON.stringify(data, null, 2)}
      
      相关记忆:
      ${JSON.stringify(relatedMemories.map(m => m.content), null, 2)}
      
      请基于相关记忆，丰富原始数据的语义上下文，使其更加完整和有意义。
      保持原始数据的核心结构，但添加或修改内容以反映相关记忆中的信息。
      
      返回JSON格式的丰富结果。
    `;
    
    const enrichedDataText = await this.llmService.generateContent(enrichmentPrompt);
    return JSON.parse(enrichedDataText);
  }

  async resolveSemanticConflicts(moduleA: string, dataA: any, moduleB: string, dataB: any): Promise<any> {
    const conflictResolutionPrompt = `
      你是Expeta 2.0系统的语义中介器，负责解决不同模块之间的语义冲突。
      
      模块A: ${moduleA}
      数据A:
      ${JSON.stringify(dataA, null, 2)}
      
      模块B: ${moduleB}
      数据B:
      ${JSON.stringify(dataB, null, 2)}
      
      请分析两个模块的数据，识别并解决任何语义冲突。
      提供一个统一的视图，保持两个模块的核心意图，但消除矛盾和不一致。
      
      返回JSON格式的解决方案，包含reconciled字段（统一后的数据）和changes字段（所做的更改说明）。
    `;
    
    const resolutionText = await this.llmService.generateContent(conflictResolutionPrompt);
    return JSON.parse(resolutionText);
  }

  async extractSemanticInsights(data: any, query: string): Promise<any> {
    const insightExtractionPrompt = `
      你是Expeta 2.0系统的语义中介器，负责从数据中提取语义洞察。
      
      数据:
      ${JSON.stringify(data, null, 2)}
      
      查询: ${query}
      
      请基于提供的查询，从数据中提取有价值的语义洞察。
      分析数据的模式、关系和隐含含义，提供深入的理解。
      
      返回JSON格式的洞察结果，包含insights数组（每个洞察包含title和description）和summary字段（总体摘要）。
    `;
    
    const insightsText = await this.llmService.generateContent(insightExtractionPrompt);
    return JSON.parse(insightsText);
  }
}
