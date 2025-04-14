import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Code } from './schemas/code.schema';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';
import { GenerateCodeWithSemanticInputDto } from './dto';
import { SemanticMediatorService } from '../semantic-mediator/semantic-mediator.service';

@Injectable()
export class GeneratorService {
  constructor(
    @InjectModel(Code.name) private codeModel: Model<Code>,
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
    private readonly semanticMediatorService: SemanticMediatorService,
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
    options?: any,
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

    logger.debug('Enriching semantic analysis with context');
    const enrichedAnalysis = await this.semanticMediatorService.enrichWithContext(
      'generator',
      semanticAnalysis,
      `expectation:${expectationId}`,
    );

    logger.debug('Translating expectation to generator-friendly format');
    const translatedExpectation = await this.semanticMediatorService.translateBetweenModules(
      'expectation',
      'generator',
      expectation.content.model,
    );

    let codeGenerationPrompt;
    try {
      const templateName = options?.templateName || 'GENERATE_CODE_WITH_SEMANTIC_INPUT_PROMPT';
      const templateVariables = {
        expectationModel: JSON.stringify(translatedExpectation, null, 2),
        semanticAnalysis: JSON.stringify(enrichedAnalysis, null, 2),
        options: JSON.stringify(options || {}, null, 2),
      };

      codeGenerationPrompt = await this.getPromptTemplate(templateName, templateVariables);
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
    const generatedCodeText = await this.llmService.generateContent(codeGenerationPrompt);

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
   * 生成项目结构
   * 基于期望模型和技术栈生成项目结构
   */
  async generateProjectStructure(
    expectationId: string,
    techStack: any,
    options?: any,
  ): Promise<Code> {
    const logger = new Logger('GeneratorService');
    logger.log(`Generating project structure for expectation: ${expectationId}`);

    const expectationMemory = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemory.find(
      (memory) => memory.content._id.toString() === expectationId,
    );

    if (!expectation) {
      logger.error(`Expectation not found: ${expectationId}`);
      throw new Error('Expectation not found');
    }

    try {
      const templateVariables = {
        expectationModel: JSON.stringify(expectation.content.model, null, 2),
        techStack: JSON.stringify(techStack, null, 2),
        options: JSON.stringify(options || {}, null, 2),
      };

      const prompt = await this.getPromptTemplate(
        'PROJECT_STRUCTURE_GENERATION_PROMPT',
        templateVariables,
      );
      logger.debug('Sending project structure generation prompt to LLM service');

      const generatedStructureText = await this.llmService.generateContent(prompt);

      let generatedStructure;
      try {
        generatedStructure = JSON.parse(generatedStructureText);
        logger.debug(
          `Successfully parsed project structure with ${generatedStructure.files?.length || 0} files`,
        );
      } catch (error) {
        logger.error(`Failed to parse project structure: ${error.message}`);
        throw new Error(`Failed to parse project structure: ${error.message}`);
      }

      const createdCode = new this.codeModel({
        expectationId,
        files: generatedStructure.files,
        metadata: {
          expectationId,
          version: 1,
          status: 'structure_generated',
          techStack,
          options: options || {},
          structureExplanation: generatedStructure.explanation || 'No explanation provided',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.debug('Saving generated project structure to database');
      const savedCode = await createdCode.save();

      logger.debug('Storing project structure in memory service');
      await this.memoryService.storeMemory({
        type: MemoryType.CODE,
        content: savedCode,
        metadata: {
          expectationId,
          status: 'structure_generated',
          techStack: JSON.stringify(techStack),
        },
        tags: ['code', 'project_structure', expectationId, savedCode._id.toString()],
      });

      logger.log(`Successfully generated project structure for expectation: ${expectationId}`);
      return savedCode;
    } catch (error) {
      logger.error(`Error generating project structure: ${error.message}`);
      throw error;
    }
  }

  /**
   * 基于架构生成代码
   * 使用架构指南和技术要求生成代码
   */
  async generateCodeWithArchitecture(
    expectationId: string,
    architectureGuide: any,
    technicalRequirements: any,
  ): Promise<Code> {
    const logger = new Logger('GeneratorService');
    logger.log(`Generating code with architecture for expectation: ${expectationId}`);

    const expectationMemory = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemory.find(
      (memory) => memory.content._id.toString() === expectationId,
    );

    if (!expectation) {
      logger.error(`Expectation not found: ${expectationId}`);
      throw new Error('Expectation not found');
    }

    try {
      const templateVariables = {
        expectationModel: JSON.stringify(expectation.content.model, null, 2),
        architectureGuide: JSON.stringify(architectureGuide, null, 2),
        technicalRequirements: JSON.stringify(technicalRequirements, null, 2),
      };

      const prompt = await this.getPromptTemplate(
        'ARCHITECTURE_BASED_CODE_GENERATION_PROMPT',
        templateVariables,
      );
      logger.debug('Sending architecture-based code generation prompt to LLM service');

      const generatedCodeText = await this.llmService.generateContent(prompt);

      let generatedCode;
      try {
        generatedCode = JSON.parse(generatedCodeText);
        logger.debug(
          `Successfully parsed architecture-based code with ${generatedCode.files?.length || 0} files`,
        );
      } catch (error) {
        logger.error(`Failed to parse architecture-based code: ${error.message}`);
        throw new Error(`Failed to parse architecture-based code: ${error.message}`);
      }

      const createdCode = new this.codeModel({
        expectationId,
        files: generatedCode.files,
        metadata: {
          expectationId,
          version: 1,
          status: 'architecture_generated',
          architecturePattern: architectureGuide.pattern,
          technicalRequirements,
          architectureExplanation: generatedCode.explanation || 'No explanation provided',
          componentRelationships: generatedCode.componentRelationships || [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.debug('Saving architecture-based code to database');
      const savedCode = await createdCode.save();

      logger.debug('Storing architecture-based code in memory service');
      await this.memoryService.storeMemory({
        type: MemoryType.CODE,
        content: savedCode,
        metadata: {
          expectationId,
          status: 'architecture_generated',
          architecturePattern: architectureGuide.pattern,
        },
        tags: ['code', 'architecture_based', expectationId, savedCode._id.toString()],
      });

      logger.log(
        `Successfully generated architecture-based code for expectation: ${expectationId}`,
      );
      return savedCode;
    } catch (error) {
      logger.error(`Error generating architecture-based code: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成测试套件
   * 为已生成的代码创建测试套件
   */
  async generateTestSuite(codeId: string, testRequirements: any): Promise<Code> {
    const logger = new Logger('GeneratorService');
    logger.log(`Generating test suite for code: ${codeId}`);

    const originalCode = await this.getCodeById(codeId);
    if (!originalCode) {
      logger.error(`Code not found: ${codeId}`);
      throw new Error(`Code with id ${codeId} not found`);
    }

    try {
      const templateVariables = {
        codeFiles: JSON.stringify(originalCode.files, null, 2),
        testRequirements: JSON.stringify(testRequirements, null, 2),
        expectationId: originalCode.expectationId,
      };

      const prompt = await this.getPromptTemplate(
        'TEST_SUITE_GENERATION_PROMPT',
        templateVariables,
      );
      logger.debug('Sending test suite generation prompt to LLM service');

      const generatedTestsText = await this.llmService.generateContent(prompt);

      let generatedTests;
      try {
        generatedTests = JSON.parse(generatedTestsText);
        logger.debug(
          `Successfully parsed test suite with ${generatedTests.files?.length || 0} files`,
        );
      } catch (error) {
        logger.error(`Failed to parse test suite: ${error.message}`);
        throw new Error(`Failed to parse test suite: ${error.message}`);
      }

      const allFiles = [...originalCode.files, ...(generatedTests.files || [])];

      const createdCode = new this.codeModel({
        expectationId: originalCode.expectationId,
        files: allFiles,
        metadata: {
          expectationId: originalCode.expectationId,
          version: (originalCode.metadata.version || 1) + 1,
          status: 'tests_added',
          originalCodeId: codeId,
          testRequirements,
          testCoverage: generatedTests.coverage || {},
          testStrategy: generatedTests.strategy || 'No strategy provided',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.debug('Saving code with test suite to database');
      const savedCode = await createdCode.save();

      logger.debug('Storing code with test suite in memory service');
      await this.memoryService.storeMemory({
        type: MemoryType.CODE,
        content: savedCode,
        metadata: {
          expectationId: originalCode.expectationId,
          status: 'tests_added',
          originalCodeId: codeId,
        },
        tags: ['code', 'tests', originalCode.expectationId, savedCode._id.toString()],
      });

      logger.log(`Successfully generated test suite for code: ${codeId}`);
      return savedCode;
    } catch (error) {
      logger.error(`Error generating test suite: ${error.message}`);
      throw error;
    }
  }

  /**
   * 重构代码
   * 基于重构目标优化代码结构和质量
   */
  async refactorCode(codeId: string, refactoringGoals: any): Promise<Code> {
    const logger = new Logger('GeneratorService');
    logger.log(`Refactoring code: ${codeId}`);

    const originalCode = await this.getCodeById(codeId);
    if (!originalCode) {
      logger.error(`Code not found: ${codeId}`);
      throw new Error(`Code with id ${codeId} not found`);
    }

    try {
      const templateVariables = {
        codeFiles: JSON.stringify(originalCode.files, null, 2),
        refactoringGoals: JSON.stringify(refactoringGoals, null, 2),
        expectationId: originalCode.expectationId,
      };

      const prompt = await this.getPromptTemplate('CODE_REFACTORING_PROMPT', templateVariables);
      logger.debug('Sending code refactoring prompt to LLM service');

      const refactoredCodeText = await this.llmService.generateContent(prompt);

      let refactoredCode;
      try {
        refactoredCode = JSON.parse(refactoredCodeText);
        logger.debug(
          `Successfully parsed refactored code with ${refactoredCode.files?.length || 0} files`,
        );
      } catch (error) {
        logger.error(`Failed to parse refactored code: ${error.message}`);
        throw new Error(`Failed to parse refactored code: ${error.message}`);
      }

      const newVersion = (originalCode.metadata.version || 1) + 1;

      const createdCode = new this.codeModel({
        expectationId: originalCode.expectationId,
        files: refactoredCode.files,
        metadata: {
          expectationId: originalCode.expectationId,
          version: newVersion,
          status: 'refactored',
          originalCodeId: codeId,
          refactoringGoals,
          refactoringChanges: refactoredCode.changes || [],
          refactoringExplanation: refactoredCode.explanation || 'No explanation provided',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.debug(`Saving refactored code (version ${newVersion}) to database`);
      const savedCode = await createdCode.save();

      logger.debug('Storing refactored code in memory service');
      await this.memoryService.storeMemory({
        type: MemoryType.CODE,
        content: savedCode,
        metadata: {
          expectationId: originalCode.expectationId,
          status: 'refactored',
          originalCodeId: codeId,
          version: newVersion,
        },
        tags: ['code', 'refactored', originalCode.expectationId, savedCode._id.toString()],
      });

      logger.log(`Successfully refactored code: ${codeId}`);
      return savedCode;
    } catch (error) {
      logger.error(`Error refactoring code: ${error.message}`);
      throw error;
    }
  }

  /**
   * 优化生成的代码
   * 基于语义反馈优化已生成的代码
   */
  /**
   * 获取提示模板
   * 从模板文件中获取指定的提示模板并填充变量
   */
  private async getPromptTemplate(
    templateName: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const logger = new Logger('GeneratorService');

    try {
      const templates = await import('../../services/prompt-templates/generator.templates');

      if (!templates[templateName]) {
        logger.warn(`Template not found: ${templateName}`);
        throw new Error(`Template not found: ${templateName}`);
      }

      let template = templates[templateName];

      Object.keys(variables).forEach((key) => {
        const placeholder = `{${key}}`;
        template = template.replace(new RegExp(placeholder, 'g'), variables[key]);
      });

      return template;
    } catch (error) {
      logger.error(`Failed to get prompt template: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证代码语义
   * 使用语义中介器验证代码是否符合语义期望
   */
  async validateCodeSemantics(codeId: string): Promise<any> {
    const logger = new Logger('GeneratorService');
    logger.log(`Validating code semantics for code ID: ${codeId}`);

    const code = await this.getCodeById(codeId);
    if (!code) {
      logger.error(`Code not found: ${codeId}`);
      throw new Error(`Code with id ${codeId} not found`);
    }

    logger.debug('Generating validation context');
    const validationContext = await this.semanticMediatorService.generateValidationContext(
      code.expectationId,
      codeId,
    );

    logger.debug('Extracting semantic insights from code');
    const codeInsights = await this.semanticMediatorService.extractSemanticInsights(
      code,
      'code validation',
    );

    logger.log(`Successfully validated code semantics for code ID: ${codeId}`);
    return {
      codeId,
      expectationId: code.expectationId,
      validationContext,
      semanticInsights: codeInsights,
      timestamp: new Date(),
    };
  }

  /**
   * 优化代码
   * 基于语义反馈优化现有代码
   */
  async optimizeCode(codeId: string, semanticFeedback: any): Promise<Code> {
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

    logger.debug('Extracting semantic insights from feedback');
    const semanticInsights = await this.semanticMediatorService.extractSemanticInsights(
      semanticFeedback,
      'code optimization',
    );

    logger.debug('Resolving semantic conflicts between expectation and code');
    const resolvedExpectation = await this.semanticMediatorService.resolveSemanticConflicts(
      'expectation',
      expectation.content.model,
      'code',
      originalCode,
    );

    const optimizationPrompt = `
      请优化以下代码，提高其质量和性能：
      
      原始代码：
      ${JSON.stringify(originalCode.files, null, 2)}
      
      期望模型：
      ${JSON.stringify(resolvedExpectation, null, 2)}
      
      语义反馈：
      ${JSON.stringify(semanticInsights, null, 2)}
      
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
      logger.debug(
        `Successfully parsed optimized code with ${optimizedCode.files?.length || 0} files`,
      );
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

    logger.debug('Evaluating semantic transformation');
    const evaluationResult = await this.semanticMediatorService.evaluateSemanticTransformation(
      originalCode,
      savedCode,
      'Optimize code based on semantic feedback',
    );

    logger.debug('Tracking semantic transformation');
    await this.semanticMediatorService.trackSemanticTransformation(
      'code',
      'optimized_code',
      originalCode,
      savedCode,
      {
        trackDifferences: true,
        analyzeTransformation: true,
        saveToMemory: true,
      },
    );

    logger.debug('Storing optimized code in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.CODE,
      content: savedCode,
      metadata: {
        expectationId: originalCode.expectationId,
        status: 'optimized',
        originalCodeId: codeId,
        version: newVersion,
        evaluationResult: evaluationResult,
      },
      tags: ['code', 'optimized', originalCode.expectationId, savedCode._id.toString()],
    });

    logger.log(`Successfully optimized code: ${codeId}`);
    return savedCode;
  }
}
