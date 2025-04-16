import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Code } from './schemas/code.schema';
import { LlmRouterService } from '../../services/llm-router.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';
import { GenerateCodeWithSemanticInputDto } from './dto';
import { SemanticMediatorService } from '../semantic-mediator/semantic-mediator.service';

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);

  constructor(
    @InjectModel(Code.name) private codeModel: Model<Code>,
    private readonly llmRouterService: LlmRouterService,
    private readonly memoryService: MemoryService,
    private readonly semanticMediatorService: SemanticMediatorService,
  ) {}

  async generateCode(expectationId: string): Promise<Code> {
    this.logger.log(`Generating code for expectation: ${expectationId}`);
    
    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    );

    if (!expectation) {
      this.logger.error(`Expectation not found: ${expectationId}`);
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

    const generatedCodeText = await this.llmRouterService.sendPrompt(codeGenerationPrompt);
    let generatedCode;
    
    try {
      generatedCode = JSON.parse(generatedCodeText);
      this.logger.debug(`Successfully parsed generated code with ${generatedCode.files?.length || 0} files`);
    } catch (error) {
      this.logger.error(`Failed to parse generated code: ${error.message}`);
      throw new Error(`Failed to parse generated code: ${error.message}`);
    }

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

    this.logger.log(`Successfully generated code for expectation: ${expectationId}`);
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

  async getCodeFiles(id: string): Promise<Record<string, unknown>> {
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
    semanticAnalysis: unknown,
    options?: unknown,
  ): Promise<Code> {
    const logger = new Logger('GeneratorService');
    logger.log(`Generating code with semantic input for expectation: ${expectationId}`);

    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    );

    if (!expectation) {
      logger.error(`Expectation not found: ${expectationId}`);
      throw new Error('Expectation not found');
    }

    logger.debug(`Found expectation: ${expectation.content.title || 'Untitled'}`);

    logger.debug('Enriching semantic analysis with context');
    const enrichedAnalysis = await this.semanticMediatorService.enrichData(
      'generator',
      semanticAnalysis,
      `expectation:${expectationId}`,
    );

    logger.debug('Translating expectation to generator-friendly format');
    const translatedExpectation = await this.semanticMediatorService.translate(
      'expectation',
      'generator',
      expectation.content.model,
    );

    let codeGenerationPrompt;
    try {
      const templateName = 'CODE_GENERATION_WITH_SEMANTICS_PROMPT';
      codeGenerationPrompt = await this.getPromptTemplate(templateName, {
        expectationModel: JSON.stringify(expectation.content.model, null, 2),
        semanticAnalysis: JSON.stringify(semanticAnalysis, null, 2),
        options: JSON.stringify(options || {}, null, 2),
      });
      logger.debug(`Using template: ${templateName}`);
    } catch (error) {
      logger.warn(`Template not found, using default prompt: ${error.message}`);

      codeGenerationPrompt = `
        基于以下期望模型和语义分析结果，生成相应的代码实现：
        
        期望模型：${JSON.stringify(translatedExpectation, null, 2)}
        
        语义分析结果：${JSON.stringify(enrichedAnalysis, null, 2)}
        
        请生成以下文件的代码：
        1. 主要功能实现文件
        2. 接口定义文件
        3. 测试文件
        
        返回JSON格式，包含files数组，每个文件包含path、content和language字段。
      `;
    }

    logger.debug('Sending prompt to LLM service');
    const generatedCodeText = await this.llmRouterService.sendPrompt(codeGenerationPrompt);

    let generatedCode;
    try {
      generatedCode = JSON.parse(generatedCodeText);
      logger.debug(
        `Successfully parsed generated code with ${generatedCode.files?.length || 0} files`,
      );
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
        semanticAnalysisSummary: enrichedAnalysis.summary || 'Enriched semantic analysis',
        generationOptions: options || {},
        generatedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.debug('Saving generated code to database');
    const savedCode = await createdCode.save();

    logger.debug('Tracking semantic transformation');
    await this.semanticMediatorService.trackSemanticTransformation(
      'expectation',
      'code',
      expectation.content.model,
      savedCode,
      {
        trackDifferences: true,
        analyzeTransformation: true,
        saveToMemory: true,
      },
    );

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
   * 从模板文件中获取指定的提示模板并填充变量
   */
  private async getPromptTemplate(
    templateName: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const logger = new Logger('GeneratorService:getPromptTemplate');

    try {
      // 模拟从内存或文件中获取模板
      const templates = {
        CODE_GENERATION_WITH_SEMANTICS_PROMPT: `
          基于以下期望模型和语义分析结果，生成相应的代码实现：
          
          期望模型：{{expectationModel}}
          
          语义分析结果：{{semanticAnalysis}}
          
          配置选项：{{options}}
          
          请生成以下文件的代码：
          1. 主要功能实现文件
          2. 接口定义文件
          3. 测试文件
          
          返回JSON格式，包含files数组，每个文件包含path、content和language字段。
        `,
        PROJECT_STRUCTURE_GENERATION_PROMPT: `
          基于以下期望模型和技术栈要求，生成项目结构：
          
          期望模型：{{expectationModel}}
          
          技术栈：{{techStack}}
          
          配置选项：{{options}}
          
          请生成合适的项目结构，包括目录和文件布局。
          
          返回JSON格式，包含files数组（主要包含空文件和基础结构），和explanation字段说明项目结构设计原理。
        `,
        TEST_SUITE_GENERATION_PROMPT: `
          基于以下代码文件，生成测试套件：
          
          代码文件：{{codeFiles}}
          
          测试要求：{{testRequirements}}
          
          请为每个关键功能生成测试用例，确保测试覆盖率高。
          
          返回JSON格式，包含files数组（测试文件），coverage对象（测试覆盖情况）和strategy字符串（测试策略说明）。
        `,
      };

      if (!templates[templateName]) {
        logger.warn(`Template not found: ${templateName}`);
        throw new Error(`Template not found: ${templateName}`);
      }

      let template = templates[templateName];

      Object.keys(variables).forEach((key) => {
        const placeholder = `{{${key}}}`;
        template = template.replace(new RegExp(placeholder, 'g'), variables[key]);
      });

      return template;
    } catch (error) {
      logger.error(`Failed to get prompt template: ${error.message}`);
      throw error;
    }
  }
} 