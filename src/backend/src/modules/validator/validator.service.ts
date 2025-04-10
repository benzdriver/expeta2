import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Validation } from './schemas/validation.schema';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';

@Injectable()
export class ValidatorService {
  constructor(
    @InjectModel(Validation.name) private validationModel: Model<Validation>,
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  async validateCode(expectationId: string, codeId: string): Promise<Validation> {
    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const code = codeMemories.find(
      (memory) => memory.content._id.toString() === codeId,
    )?.content;

    if (!expectation || !code) {
      throw new Error('Expectation or Code not found');
    }

    const validationPrompt = `
      基于以下期望模型和生成的代码，评估代码是否满足期望要求：
      
      期望模型：${JSON.stringify(expectation.model, null, 2)}
      
      生成的代码：
      ${code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n')}
      
      请评估代码对每个期望的满足程度，并提供以下格式的JSON结果：
      {
        "status": "passed|failed|partial",
        "score": 0-100,
        "details": [
          {
            "expectationId": "期望ID",
            "status": "passed|failed|partial",
            "score": 0-100,
            "message": "评估说明"
          }
        ]
      }
    `;

    const validationResultText = await this.llmService.generateContent(validationPrompt);
    const validationResult = JSON.parse(validationResultText);

    const validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedValidation = await validation.save();

    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: validationResult.status,
        score: validationResult.score,
      },
    });

    return savedValidation;
  }

  async getValidationsByExpectationId(expectationId: string): Promise<Validation[]> {
    return this.validationModel.find({ expectationId }).sort({ createdAt: -1 }).exec();
  }

  async getValidationsByCodeId(codeId: string): Promise<Validation[]> {
    return this.validationModel.find({ codeId }).sort({ createdAt: -1 }).exec();
  }

  async getValidationById(id: string): Promise<Validation> {
    return this.validationModel.findById(id).exec();
  }
  
  /**
   * 使用语义输入验证代码
   * 这个方法接收语义中介器提供的额外语义信息来增强验证过程
   */
  async validateCodeWithSemanticInput(
    expectationId: string, 
    codeId: string, 
    semanticInput: any
  ): Promise<Validation> {
    const logger = new Logger('ValidatorService');
    logger.log(`Validating code with semantic input - expectation: ${expectationId}, code: ${codeId}`);
    
    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const code = codeMemories.find(
      (memory) => memory.content._id.toString() === codeId,
    )?.content;

    if (!expectation || !code) {
      logger.error(`Expectation or Code not found - expectation: ${expectationId}, code: ${codeId}`);
      throw new Error('Expectation or Code not found');
    }
    
    logger.debug(`Found expectation and code for validation`);

    const validationPrompt = `
      基于以下期望模型、生成的代码和语义解析结果，评估代码是否满足期望要求：
      
      期望模型：${JSON.stringify(expectation.model, null, 2)}
      
      生成的代码：
      ${code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n')}
      
      语义解析结果：
      ${JSON.stringify(semanticInput, null, 2)}
      
      请评估代码对每个期望的满足程度，并提供以下格式的JSON结果：
      {
        "status": "passed|failed|partial",
        "score": 0-100,
        "details": [
          {
            "expectationId": "期望ID",
            "status": "passed|failed|partial",
            "score": 0-100,
            "message": "评估说明",
            "semanticInsights": "基于语义解析的额外洞察"
          }
        ],
        "semanticAnalysis": "对语义解析结果的总体分析"
      }
    `;
    
    logger.debug('Sending validation prompt to LLM service');
    const validationResultText = await this.llmService.generateContent(validationPrompt);
    
    let validationResult;
    try {
      validationResult = JSON.parse(validationResultText);
      logger.debug(`Successfully parsed validation result with status: ${validationResult.status}`);
    } catch (error) {
      logger.error(`Failed to parse validation result: ${error.message}`);
      throw new Error(`Failed to parse validation result: ${error.message}`);
    }

    const validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      metadata: {
        semanticAnalysis: validationResult.semanticAnalysis,
        usedSemanticInput: true,
        validatedAt: new Date().toISOString()
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    logger.debug('Saving validation result to database');
    const savedValidation = await validation.save();
    
    logger.debug('Storing validation in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: validationResult.status,
        score: validationResult.score,
        usedSemanticInput: true,
        timestamp: new Date().toISOString()
      },
      tags: ['validation', 'semantic_validation', expectationId, codeId]
    });
    
    logger.log(`Successfully validated code with semantic input - status: ${validationResult.status}, score: ${validationResult.score}`);
    return savedValidation;
  }
  
  /**
   * 迭代验证代码
   * 这个方法在多轮验证过程中使用，接收前一轮验证的反馈
   */
  async validateCodeIteratively(
    expectationId: string,
    codeId: string,
    previousValidationId: string,
    iterationFocus?: string[]
  ): Promise<Validation> {
    const logger = new Logger('ValidatorService');
    logger.log(`Performing iterative validation - expectation: ${expectationId}, code: ${codeId}, previous: ${previousValidationId}`);
    
    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const code = codeMemories.find(
      (memory) => memory.content._id.toString() === codeId,
    )?.content;
    
    const previousValidation = await this.validationModel.findById(previousValidationId).exec();
    
    if (!expectation || !code || !previousValidation) {
      logger.error(`Expectation, Code or Previous Validation not found`);
      throw new Error('Expectation, Code or Previous Validation not found');
    }
    
    logger.debug(`Found expectation, code and previous validation for iterative validation`);
    
    const focusAreas = iterationFocus || previousValidation.details
      .filter(detail => detail.status !== 'passed')
      .map(detail => detail.expectationId);
    
    if (focusAreas.length === 0) {
      logger.debug('No focus areas specified and all previous validations passed');
      return previousValidation; // 如果没有需要重点关注的方面，直接返回前一轮验证结果
    }
    
    const validationPrompt = `
      基于以下期望模型、生成的代码和前一轮验证结果，进行迭代验证：
      
      期望模型：${JSON.stringify(expectation.model, null, 2)}
      
      生成的代码：
      ${code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n')}
      
      前一轮验证结果：
      ${JSON.stringify(previousValidation, null, 2)}
      
      本轮重点关注的方面：
      ${JSON.stringify(focusAreas, null, 2)}
      
      请评估代码对每个期望的满足程度，特别是重点关注的方面，并提供以下格式的JSON结果：
      {
        "status": "passed|failed|partial",
        "score": 0-100,
        "details": [
          {
            "expectationId": "期望ID",
            "status": "passed|failed|partial",
            "score": 0-100,
            "message": "评估说明",
            "improvement": "相比前一轮的改进",
            "remainingIssues": "仍然存在的问题"
          }
        ],
        "iterationAnalysis": "本轮迭代验证的总体分析",
        "improvementSuggestions": "进一步改进的建议"
      }
    `;
    
    logger.debug('Sending iterative validation prompt to LLM service');
    const validationResultText = await this.llmService.generateContent(validationPrompt);
    
    let validationResult;
    try {
      validationResult = JSON.parse(validationResultText);
      logger.debug(`Successfully parsed iterative validation result with status: ${validationResult.status}`);
    } catch (error) {
      logger.error(`Failed to parse iterative validation result: ${error.message}`);
      throw new Error(`Failed to parse iterative validation result: ${error.message}`);
    }
    
    const validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      metadata: {
        iterationAnalysis: validationResult.iterationAnalysis,
        improvementSuggestions: validationResult.improvementSuggestions,
        previousValidationId,
        focusAreas,
        iterationNumber: (previousValidation.metadata?.iterationNumber || 0) + 1,
        validatedAt: new Date().toISOString()
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    logger.debug('Saving iterative validation result to database');
    const savedValidation = await validation.save();
    
    logger.debug('Storing iterative validation in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: validationResult.status,
        score: validationResult.score,
        isIterative: true,
        iterationNumber: validation.metadata.iterationNumber,
        previousValidationId,
        timestamp: new Date().toISOString()
      },
      tags: ['validation', 'iterative_validation', expectationId, codeId, previousValidationId]
    });
    
    logger.log(`Successfully performed iterative validation - status: ${validationResult.status}, score: ${validationResult.score}`);
    return savedValidation;
  }
  
  /**
   * 生成验证反馈
   * 基于验证结果生成详细的反馈，用于指导代码优化
   */
  async generateValidationFeedback(validationId: string): Promise<any> {
    const logger = new Logger('ValidatorService');
    logger.log(`Generating validation feedback for validation: ${validationId}`);
    
    const validation = await this.validationModel.findById(validationId).exec();
    
    if (!validation) {
      logger.error(`Validation not found: ${validationId}`);
      throw new Error('Validation not found');
    }
    
    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === validation.expectationId,
    )?.content;
    
    const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const code = codeMemories.find(
      (memory) => memory.content._id.toString() === validation.codeId,
    )?.content;
    
    if (!expectation || !code) {
      logger.error(`Related expectation or code not found for validation: ${validationId}`);
      throw new Error('Related expectation or code not found');
    }
    
    const feedbackPrompt = `
      基于以下验证结果，生成详细的反馈，用于指导代码优化：
      
      期望模型：${JSON.stringify(expectation.model, null, 2)}
      
      验证结果：${JSON.stringify(validation, null, 2)}
      
      请生成以下格式的JSON结果：
      {
        "summary": "验证结果总结",
        "strengths": ["代码的优点1", "代码的优点2", ...],
        "weaknesses": ["代码的缺点1", "代码的缺点2", ...],
        "prioritizedIssues": [
          {
            "issue": "问题描述",
            "severity": "high|medium|low",
            "impact": "问题影响",
            "suggestion": "改进建议"
          },
          ...
        ],
        "codeOptimizationSuggestions": {
          "functionality": ["功能优化建议1", "功能优化建议2", ...],
          "performance": ["性能优化建议1", "性能优化建议2", ...],
          "maintainability": ["可维护性优化建议1", "可维护性优化建议2", ...],
          "security": ["安全性优化建议1", "安全性优化建议2", ...]
        },
        "overallRecommendation": "总体改进建议"
      }
    `;
    
    logger.debug('Sending feedback generation prompt to LLM service');
    const feedbackText = await this.llmService.generateContent(feedbackPrompt);
    
    let feedback;
    try {
      feedback = JSON.parse(feedbackText);
      logger.debug('Successfully parsed validation feedback');
    } catch (error) {
      logger.error(`Failed to parse validation feedback: ${error.message}`);
      throw new Error(`Failed to parse validation feedback: ${error.message}`);
    }
    
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION_FEEDBACK,
      content: {
        validationId,
        feedback,
        generatedAt: new Date()
      },
      metadata: {
        validationId,
        expectationId: validation.expectationId,
        codeId: validation.codeId,
        timestamp: new Date().toISOString()
      },
      tags: ['validation_feedback', validation.expectationId, validation.codeId, validationId]
    });
    
    logger.log(`Successfully generated validation feedback for validation: ${validationId}`);
    return feedback;
  }
}
