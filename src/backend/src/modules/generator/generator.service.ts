import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Code } from './schemas/code.schema';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';
import { GenerateCodeWithSemanticInputDto } from './dto';

@Injectable()
export class GeneratorService {
  constructor(
    @InjectModel(Code.name) private codeModel: Model<Code>,
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  async generateCode(expectationId: string): Promise<Code> {
    const expectationMemory = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemory.find(
      (memory) => memory.content._id.toString() === expectationId,
    );

    if (!expectation) {
      throw new Error('Expectation not found');
    }

    const codeGenerationPrompt = `
      基于以下期望模型，生成相应的代码实现：
      
      期望模型：${JSON.stringify(expectation.content.model, null, 2)}
      
      请生成以下文件的代码：
      1. 主要功能实现文件
      2. 接口定义文件
      3. 测试文件
      
      返回JSON格式，包含files数组，每个文件包含path、content和language字段。
    `;

    const generatedCodeText = await this.llmService.generateContent(codeGenerationPrompt);
    const generatedCode = JSON.parse(generatedCodeText);

    const createdCode = new this.codeModel({
      expectationId,
      files: generatedCode.files,
      metadata: {
        expectationId,
        version: 1,
        status: 'generated',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedCode = await createdCode.save();

    await this.memoryService.storeMemory({
      type: MemoryType.CODE,
      content: savedCode,
      metadata: {
        expectationId,
        status: 'generated',
      },
    });

    return savedCode;
  }

  async getCodeByExpectationId(expectationId: string): Promise<Code[]> {
    return this.codeModel.find({ expectationId }).sort({ 'metadata.version': -1 }).exec();
  }
  
  /**
   * 根据ID获取代码
   */
  async getCodeById(id: string): Promise<Code> {
    const code = await this.codeModel.findById(id).exec();
    
    if (!code) {
      throw new Error(`Code with id ${id} not found`);
    }
    
    return code;
  }

  async getCodeFiles(id: string): Promise<any> {
    const code = await this.codeModel.findById(id).exec();
    
    if (!code) {
      throw new Error('Code not found');
    }
    
    return code.files;
  }

  async approveCode(id: string): Promise<Code> {
    const code = await this.codeModel.findById(id).exec();
    
    if (!code) {
      throw new Error('Code not found');
    }
    
    code.metadata.status = 'approved';
    code.updatedAt = new Date();
    
    const updatedCode = await code.save();
    
    await this.memoryService.updateMemory('code', updatedCode._id.toString(), {
      content: updatedCode,
      metadata: {
        ...updatedCode.metadata,
        status: 'approved',
      },
    });
    
    return updatedCode;
  }

  /**
   * 使用语义分析结果生成代码
   * 这个方法使用语义分析结果来增强代码生成过程
   */
  async generateCodeWithSemanticInput(
    expectationId: string,
    semanticAnalysis: any,
    options?: any
  ): Promise<Code> {
    const logger = new Logger('GeneratorService');
    logger.log(`Generating code with semantic input for expectation: ${expectationId}`);
    
    const expectationMemory = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemory.find(
      (memory) => memory.content._id.toString() === expectationId,
    );

    if (!expectation) {
      logger.error(`Expectation not found: ${expectationId}`);
      throw new Error('Expectation not found');
    }
    
    logger.debug(`Found expectation: ${expectation.content.title || 'Untitled'}`);

    let codeGenerationPrompt;
    try {
      const templateName = options?.templateName || 'GENERATE_CODE_WITH_SEMANTIC_INPUT_PROMPT';
      codeGenerationPrompt = await this.getPromptTemplate(templateName, {
        expectationModel: JSON.stringify(expectation.content.model, null, 2),
        semanticAnalysis: JSON.stringify(semanticAnalysis, null, 2),
        options: JSON.stringify(options || {}, null, 2)
      });
      
      logger.debug(`Using template: ${templateName}`);
    } catch (error) {
      logger.warn(`Template not found, using default prompt: ${error.message}`);
      
      codeGenerationPrompt = `
        基于以下期望模型和语义分析结果，生成相应的代码实现：
        
        期望模型：${JSON.stringify(expectation.content.model, null, 2)}
        
        语义分析结果：${JSON.stringify(semanticAnalysis, null, 2)}
        
        请生成以下文件的代码：
        1. 主要功能实现文件
        2. 接口定义文件
        3. 测试文件
        
        返回JSON格式，包含files数组，每个文件包含path、content和language字段。
      `;
    }

    logger.debug('Sending prompt to LLM service');
    const generatedCodeText = await this.llmService.generateContent(codeGenerationPrompt);
    
    let generatedCode;
    try {
      generatedCode = JSON.parse(generatedCodeText);
      logger.debug(`Successfully parsed generated code with ${generatedCode.files?.length || 0} files`);
    } catch (error) {
      logger.error(`Failed to parse generated code: ${error.message}`);
      throw new Error(`Failed to parse generated code: ${error.message}`);
    }

    const createdCode = new this.codeModel({
      expectationId,
      files: generatedCode.files,
      metadata: {
        expectationId,
        version: 1,
        status: 'generated',
        semanticAnalysisUsed: true,
        semanticAnalysisSummary: semanticAnalysis.summary || 'No summary available',
        generationOptions: options || {},
        generatedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.debug('Saving generated code to database');
    const savedCode = await createdCode.save();

    logger.debug('Storing code in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.CODE,
      content: savedCode,
      metadata: {
        expectationId,
        status: 'generated',
        semanticAnalysisUsed: true,
        generationTimestamp: new Date().toISOString(),
      },
      tags: ['code', 'semantic_enhanced', expectationId, savedCode._id.toString()],
    });

    logger.log(`Successfully generated code with semantic input for expectation: ${expectationId}`);
    return savedCode;
  }
  
  /**
   * 获取提示模板
   * 从模板服务获取提示模板并填充变量
   */
  private async getPromptTemplate(templateName: string, variables: Record<string, string>): Promise<string> {
    const templates = {
      GENERATE_CODE_PROMPT: `
        基于以下期望模型，生成相应的代码实现：
        
        期望模型：
        {expectationModel}
        
        技术要求：
        - 编程语言：{language}
        - 框架：{framework}
        - 代码风格：{codeStyle}
        
        请生成完整的代码实现，包括：
        1. 主要功能模块
        2. 数据模型
        3. 接口定义
        4. 必要的辅助函数
        5. 单元测试（如适用）
        
        代码应该：
        - 符合期望模型中描述的功能和非功能需求
        - 遵循指定的编程语言和框架的最佳实践
        - 具有良好的可读性和可维护性
        - 包含必要的错误处理和边界条件检查
        
        以JSON格式返回结果：
        {
          "files": [
            {
              "path": "文件路径",
              "content": "文件内容",
              "description": "文件用途说明"
            },
            ...
          ],
          "explanation": "代码实现的总体说明",
          "testInstructions": "如何测试代码的说明"
        }
      `,
      GENERATE_CODE_WITH_SEMANTIC_INPUT_PROMPT: `
        请根据以下期望模型和语义分析结果生成代码：
        
        期望模型：
        {expectationModel}
        
        语义分析结果：
        {semanticAnalysis}
        
        生成选项：
        {options}
        
        请生成完整的代码实现，包括必要的类、函数、接口等。
        返回JSON格式，包含以下字段：
        - files: 数组，每个元素包含以下字段：
          - path: 文件路径
          - content: 文件内容
          - language: 编程语言
        - description: 代码的简短描述
        - metadata: 包含生成过程中的元数据
        
        确保代码是可运行的，并符合期望模型中的所有要求。
        利用语义分析结果来增强代码质量，特别关注：
        1. 语义分析中识别的关键概念和关系
        2. 潜在的边缘情况和错误处理
        3. 性能和可扩展性考虑
        4. 与现有系统的集成点
      `
    };
    
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    let filledTemplate = template;
    for (const [key, value] of Object.entries(variables)) {
      filledTemplate = filledTemplate.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    
    return filledTemplate;
  }
  
  /**
   * 优化生成的代码
   * 基于语义反馈优化已生成的代码
   */
  async optimizeCode(
    codeId: string, 
    semanticFeedback: any
  ): Promise<Code> {
    const logger = new Logger('GeneratorService');
    logger.log(`Optimizing code with ID: ${codeId}`);
    
    const originalCode = await this.getCodeById(codeId);
    if (!originalCode) {
      logger.error(`Code not found: ${codeId}`);
      throw new Error(`Code with id ${codeId} not found`);
    }
    
    const expectationMemory = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemory.find(
      (memory) => memory.content._id.toString() === originalCode.expectationId,
    );

    if (!expectation) {
      logger.error(`Expectation not found for code: ${codeId}`);
      throw new Error('Related expectation not found');
    }
    
    logger.debug(`Optimizing code for expectation: ${expectation.content.title || 'Untitled'}`);
    
    const optimizationPrompt = `
      请优化以下代码，提高其质量和性能：
      
      原始代码：
      ${JSON.stringify(originalCode.files, null, 2)}
      
      期望模型：
      ${JSON.stringify(expectation.content.model, null, 2)}
      
      语义反馈：
      ${JSON.stringify(semanticFeedback, null, 2)}
      
      优化要求：
      - 提高代码效率
      - 改进代码结构和可读性
      - 增强错误处理
      - 确保代码符合期望模型
      - 解决语义反馈中提出的问题
      
      以JSON格式返回结果：
      {
        "files": [
          {
            "path": "文件路径",
            "content": "文件内容",
            "language": "编程语言"
          },
          ...
        ],
        "changes": [
          {
            "type": "性能优化/结构改进/错误处理/其他",
            "description": "变更说明",
            "impact": "变更影响"
          },
          ...
        ],
        "explanation": "优化思路和理由"
      }
    `;
    
    logger.debug('Sending optimization prompt to LLM service');
    const optimizedCodeText = await this.llmService.generateContent(optimizationPrompt);
    
    let optimizedCode;
    try {
      optimizedCode = JSON.parse(optimizedCodeText);
      logger.debug(`Successfully parsed optimized code with ${optimizedCode.files?.length || 0} files`);
    } catch (error) {
      logger.error(`Failed to parse optimized code: ${error.message}`);
      throw new Error(`Failed to parse optimized code: ${error.message}`);
    }
    
    const newVersion = (originalCode.metadata.version || 1) + 1;
    
    const createdCode = new this.codeModel({
      expectationId: originalCode.expectationId,
      files: optimizedCode.files,
      metadata: {
        expectationId: originalCode.expectationId,
        version: newVersion,
        status: 'optimized',
        originalCodeId: codeId,
        optimizationChanges: optimizedCode.changes || [],
        optimizationExplanation: optimizedCode.explanation || 'No explanation provided',
        semanticFeedbackUsed: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    logger.debug(`Saving optimized code (version ${newVersion}) to database`);
    const savedCode = await createdCode.save();
    
    logger.debug('Storing optimized code in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.CODE,
      content: savedCode,
      metadata: {
        expectationId: originalCode.expectationId,
        status: 'optimized',
        originalCodeId: codeId,
        version: newVersion,
      },
      tags: ['code', 'optimized', originalCode.expectationId, savedCode._id.toString()],
    });
    
    logger.log(`Successfully optimized code: ${codeId}`);
    return savedCode;
  }
}
