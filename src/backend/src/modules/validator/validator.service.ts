import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Validation } from './schemas/validation.schema';
import { LlmRouterService } from '../../services/llm-router.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';
import { SemanticMediatorService } from '../semantic-mediator/semantic-mediator.service';

@Injectable()
export class ValidatorService {
  constructor(
    @InjectModel(Validation.name) private validationModel: Model<Validation>,
    private readonly llmRouterService: LlmRouterService,
    private readonly memoryService: MemoryService,
    private readonly semanticMediatorService: SemanticMediatorService,
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

    const validationResultText = await this.llmRouterService.generateContent(validationPrompt);
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
   * 这个方法使用语义中介器提供的额外语义信息来增强验证过程
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

    logger.debug('Generating validation context using semantic mediator');
    const validationContext = await this.semanticMediatorService.generateValidationContext(
      expectationId,
      codeId,
      [], // No previous validations
      {
        strategy: 'balanced',
        focusAreas: [] // No specific focus areas
      }
    );
    
    logger.debug('Enriching semantic input with context');
    const enrichedSemanticInput = await this.semanticMediatorService.enrichWithContext(
      'validator',
      semanticInput,
      `expectation:${expectationId} code:${codeId}`
    );
    
    const enhancedValidationContext = {
      expectation: expectation.model,
      code: {
        files: code.files,
        features: validationContext.semanticContext?.codeFeatures || {}
      },
      semanticInput: enrichedSemanticInput,
      semanticRelationship: validationContext.semanticContext?.semanticRelationship || {},
      validationType: 'semantic'
    };
    
    logger.debug('Transforming validation context to prompt using semantic mediator');
    const transformedPrompt = await this.semanticMediatorService.translateBetweenModules(
      'validator',
      'llm',
      enhancedValidationContext
    );
    
    logger.debug('Sending transformed validation prompt to LLM service');
    const validationResultText = await this.llmRouterService.generateContent(transformedPrompt);
    
    let validationResult;
    try {
      validationResult = JSON.parse(validationResultText);
      logger.debug(`Successfully parsed validation result with status: ${validationResult.status}`);
    } catch (error) {
      logger.error(`Failed to parse validation result: ${error.message}`);
      throw new Error(`Failed to parse validation result: ${error.message}`);
    }

    await this.semanticMediatorService.trackSemanticTransformation(
      'llm',
      'validator',
      validationResultText,
      validationResult,
      {
        trackDifferences: true,
        analyzeTransformation: true,
        saveToMemory: true
      }
    );

    const validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      metadata: {
        semanticAnalysis: validationResult.semanticAnalysis,
        usedSemanticInput: true,
        validationContext: validationContext.semanticContext || {},
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
  /**
   * 使用语义中介器验证代码
   * 这个方法完全利用语义中介器的能力进行增强的语义验证
   */
  async validateWithSemanticMediation(
    expectationId: string,
    codeId: string,
    options: {
      strategy?: 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom';
      focusAreas?: string[];
      weights?: Record<string, number>;
      previousValidations?: string[];
      iterative?: boolean;
    } = {}
  ): Promise<Validation> {
    const logger = new Logger('ValidatorService');
    logger.log(`Performing semantic mediation validation - expectation: ${expectationId}, code: ${codeId}`);
    
    logger.debug('Generating comprehensive validation context using semantic mediator');
    const validationContext = await this.semanticMediatorService.generateValidationContext(
      expectationId,
      codeId,
      options.previousValidations || [],
      {
        strategy: options.strategy || 'balanced',
        focusAreas: options.focusAreas,
        customWeights: options.weights
      }
    );
    
    logger.debug('Transforming validation context to prompt using semantic mediator');
    const transformedPrompt = await this.semanticMediatorService.translateBetweenModules(
      'validator',
      'llm',
      {
        expectationId,
        codeId,
        validationContext,
        validationType: 'semantic_mediation',
        iterative: options.iterative || false
      }
    );
    
    logger.debug('Sending transformed validation prompt to LLM service');
    const validationResultText = await this.llmRouterService.generateContent(transformedPrompt);
    
    let validationResult;
    try {
      validationResult = JSON.parse(validationResultText);
      logger.debug(`Successfully parsed semantic mediation validation result with status: ${validationResult.status}`);
    } catch (error) {
      logger.error(`Failed to parse semantic mediation validation result: ${error.message}`);
      throw new Error(`Failed to parse semantic mediation validation result: ${error.message}`);
    }
    
    await this.semanticMediatorService.trackSemanticTransformation(
      'llm',
      'validator',
      validationResultText,
      validationResult,
      {
        trackDifferences: true,
        analyzeTransformation: true,
        saveToMemory: true
      }
    );
    
    const validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      metadata: {
        semanticAnalysis: validationResult.semanticAnalysis,
        semanticInsights: validationResult.semanticInsights,
        validationContext,
        validatedAt: new Date().toISOString(),
        validationType: 'semantic_mediation',
        iterative: options.iterative || false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    logger.debug('Saving semantic mediation validation result to database');
    const savedValidation = await validation.save();
    
    logger.debug('Storing semantic mediation validation in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: validationResult.status,
        score: validationResult.score,
        isSemanticMediation: true,
        validationContext: {
          strategy: options.strategy || 'balanced',
          focusAreas: options.focusAreas,
          weights: options.weights,
          iterative: options.iterative || false
        },
        timestamp: new Date().toISOString()
      },
      tags: ['validation', 'semantic_mediation', expectationId, codeId]
    });
    
    logger.log(`Successfully performed semantic mediation validation - status: ${validationResult.status}, score: ${validationResult.score}`);
    return savedValidation;
  }

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
    const validationResultText = await this.llmRouterService.generateContent(validationPrompt);
    
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
    const feedbackText = await this.llmRouterService.generateContent(feedbackPrompt);
    
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
  
  /**
   * 使用自适应语义验证
   * 根据验证上下文和语义分析动态调整验证标准和权重
   */
  /**
   * 将任意策略字符串映射到有效的验证策略
   * 私有辅助方法，确保策略值符合语义中介器的要求
   */
  private mapToValidStrategy(strategy: string): 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom' {
    const validStrategies = ['balanced', 'strict', 'lenient', 'performance', 'security', 'custom'];
    
    if (!strategy || !validStrategies.includes(strategy)) {
      return 'balanced'; // 默认使用平衡策略
    }
    
    return strategy as 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom';
  }

  async validateWithAdaptiveContext(
    expectationId: string,
    codeId: string,
    validationContext: {
      strategy: string;
      focusAreas?: string[];
      weights?: Record<string, number>;
      previousValidations?: string[];
      semanticContext?: any;
    }
  ): Promise<Validation> {
    const logger = new Logger('ValidatorService');
    logger.log(`Performing adaptive validation with context - expectation: ${expectationId}, code: ${codeId}`);
    
    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const code = codeMemories.find(
      (memory) => memory.content._id.toString() === codeId,
    )?.content;
    
    if (!expectation || !code) {
      logger.error(`Expectation or Code not found for adaptive validation`);
      throw new Error('Expectation or Code not found');
    }
    
    let previousValidationsData = [];
    if (validationContext.previousValidations && validationContext.previousValidations.length > 0) {
      const previousValidationIds = validationContext.previousValidations;
      const previousValidations = await this.validationModel.find({
        _id: { $in: previousValidationIds }
      }).exec();
      
      previousValidationsData = previousValidations.map(v => ({
        id: v._id.toString(),
        status: v.status,
        score: v.score,
        details: v.details,
        metadata: v.metadata
      }));
    }
    
    let enhancedContext = { ...validationContext };
    if (!validationContext.semanticContext) {
      logger.debug('Generating semantic validation context using semantic mediator');
      const validStrategy = this.mapToValidStrategy(validationContext.strategy);
      
      const generatedContext = await this.semanticMediatorService.generateValidationContext(
        expectationId,
        codeId,
        validationContext.previousValidations || [],
        {
          strategy: validStrategy,
          focusAreas: validationContext.focusAreas,
          customWeights: validationContext.weights
        }
      );
      
      enhancedContext = {
        ...validationContext,
        semanticContext: generatedContext.semanticContext
      };
    }
    
    const adaptiveValidationData = {
      expectation: expectation.model,
      code: {
        files: code.files
      },
      validationContext: enhancedContext,
      previousValidations: previousValidationsData,
      validationType: 'adaptive'
    };
    
    logger.debug('Transforming validation data to prompt using semantic mediator');
    const transformedPrompt = await this.semanticMediatorService.translateBetweenModules(
      'validator',
      'llm',
      adaptiveValidationData
    );
    
    logger.debug('Sending adaptive validation prompt to LLM service');
    const validationResultText = await this.llmRouterService.generateContent(transformedPrompt);
    
    let validationResult;
    try {
      validationResult = JSON.parse(validationResultText);
      logger.debug(`Successfully parsed adaptive validation result with status: ${validationResult.status}`);
    } catch (error) {
      logger.error(`Failed to parse adaptive validation result: ${error.message}`);
      throw new Error(`Failed to parse adaptive validation result: ${error.message}`);
    }
    
    await this.semanticMediatorService.trackSemanticTransformation(
      'llm',
      'validator',
      validationResultText,
      validationResult,
      {
        trackDifferences: true,
        analyzeTransformation: true,
        saveToMemory: true
      }
    );
    
    const validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      metadata: {
        adaptiveInsights: validationResult.adaptiveInsights,
        validationContext: enhancedContext,
        previousValidations: validationContext.previousValidations || [],
        validatedAt: new Date().toISOString(),
        validationType: 'adaptive'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    logger.debug('Saving adaptive validation result to database');
    const savedValidation = await validation.save();
    
    logger.debug('Storing adaptive validation in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: validationResult.status,
        score: validationResult.score,
        isAdaptive: true,
        validationContext: {
          strategy: enhancedContext.strategy,
          focusAreas: enhancedContext.focusAreas,
          weights: enhancedContext.weights,
          semanticContext: enhancedContext.semanticContext ? true : false
        },
        timestamp: new Date().toISOString()
      },
      tags: ['validation', 'adaptive_validation', expectationId, codeId]
    });
    
    logger.log(`Successfully performed adaptive validation - status: ${validationResult.status}, score: ${validationResult.score}`);
    return savedValidation;
  }
}
