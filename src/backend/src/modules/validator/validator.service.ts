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
    const _expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const _expectation = _expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const _codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const _code = _codeMemories.find((memory) => memory.content._id.toString() === codeId)?.content;

    if (!_expectation || !_code) {
      throw new Error('Expectation or Code not found');
    }

    const _validationPrompt = `
      基于以下期望模型和生成的代码，评估代码是否满足期望要求：
      
      期望模型：${JSON.stringify(_expectation.model, null, 2)}
      
      生成的代码：
      ${_code.files.map((file) => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n')}
      
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

    const _validationResultText = await this.llmRouterService.generateContent(_validationPrompt);
    const _validationResult = JSON.parse(_validationResultText);

    const _validation = new this.validationModel({
      expectationId,
      codeId,
      status: _validationResult.status,
      score: _validationResult.score,
      details: _validationResult.details,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const _savedValidation = await _validation.save();

    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: _savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: _validationResult.status,
        score: _validationResult.score,
      },
    });

    return _savedValidation;
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
    semanticInput: {
      semanticContext?: string;
      focusAreas?: string[];
      [key: string]: unknown;
    },
  ): Promise<Validation> {
    const _logger = new Logger('ValidatorService');
    _logger.log(
      `Validating code with semantic input - expectation: ${expectationId}, code: ${codeId}`,
    );

    const _expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const _expectation = _expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const _codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const _code = _codeMemories.find((memory) => memory.content._id.toString() === codeId)?.content;

    if (!_expectation || !_code) {
      _logger.error(
        `Expectation or Code not found - expectation: ${expectationId}, code: ${codeId}`,
      );
      throw new Error('Expectation or Code not found');
    }

    _logger.debug(`Found expectation and code for validation`);

    _logger.debug('Generating validation context using semantic mediator');
    const _validationContext = await this.semanticMediatorService.generateValidationContext(
      expectationId,
      codeId,
      [], // No previous validations
      {
        strategy: 'balanced',
        focusAreas: [], // No specific focus areas
      },
    );

    _logger.debug('Enriching semantic input with context');
    const _enrichedSemanticInput = await this.semanticMediatorService.enrichWithContext(
      'validator',
      semanticInput,
      `expectation:${expectationId} code:${codeId}`,
    );

    const _enhancedValidationContext = {
      expectation: _expectation.model,
      code: {
        files: _code.files,
        features: _validationContext.semanticContext?.codeFeatures || {},
      },
      semanticInput: _enrichedSemanticInput,
      semanticRelationship: _validationContext.semanticContext?.semanticRelationship || {},
      validationType: 'semantic',
    };

    _logger.debug('Transforming validation context to prompt using semantic mediator');
    const _transformedPrompt = await this.semanticMediatorService.translateBetweenModules(
      'validator',
      'llm',
      _enhancedValidationContext,
    );

    _logger.debug('Sending transformed validation prompt to LLM service');
    const _validationResultText = await this.llmRouterService.generateContent(_transformedPrompt);
    let _validationResult;
    try {
      _validationResult = JSON.parse(_validationResultText);
      _logger.debug(
        `Successfully parsed validation result with status: ${_validationResult.status}`,
      );
    } catch (error) {
      _logger.error(`Failed to parse validation result: ${error.message}`);
      throw new Error(`Failed to parse validation result: ${error.message}`);
    }

    await this.semanticMediatorService.trackSemanticTransformation(
      'llm',
      'validator',
      _validationResultText,
      _validationResult,
      {
        trackDifferences: true,
        analyzeTransformation: true,
        saveToMemory: true,
      },
    );

    const _validation = new this.validationModel({
      expectationId,
      codeId,
      status: _validationResult.status,
      score: _validationResult.score,
      details: _validationResult.details,
      metadata: {
        semanticAnalysis: _validationResult.semanticAnalysis,
        usedSemanticInput: true,
        validationContext: _validationContext.semanticContext || {},
        validatedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    _logger.debug('Saving validation result to database');
    const _savedValidation = await _validation.save();

    _logger.debug('Storing validation in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: _savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: _validationResult.status,
        score: _validationResult.score,
        usedSemanticInput: true,
        timestamp: new Date().toISOString(),
      },
      tags: ['validation', 'semantic_validation', expectationId, codeId],
    });

    _logger.log(
      `Successfully validated code with semantic input - status: ${_validationResult.status}, score: ${_validationResult.score}`,
    );
    return _savedValidation;
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
    } = {},
  ): Promise<Validation> {
    const _logger = new Logger('ValidatorService');
    _logger.log(
      `Performing semantic mediation validation - expectation: ${expectationId}, code: ${codeId}`,
    );

    _logger.debug('Generating comprehensive validation context using semantic mediator');
    const _validationContext = await this.semanticMediatorService.generateValidationContext(
      expectationId,
      codeId,
      options.previousValidations || [],
      {
        strategy: options.strategy || 'balanced',
        focusAreas: options.focusAreas,
        customWeights: options.weights,
      },
    );

    _logger.debug('Transforming validation context to prompt using semantic mediator');
    const _transformedPrompt = await this.semanticMediatorService.translateBetweenModules(
      'validator',
      'llm',
      {
        expectationId,
        codeId,
        validationContext: _validationContext,
        validationType: 'semantic_mediation',
        iterative: options.iterative || false,
      },
    );

    _logger.debug('Sending transformed validation prompt to LLM service');
    const _validationResultText = await this.llmRouterService.generateContent(_transformedPrompt);

    let validationResult;
    try {
      validationResult = JSON.parse(_validationResultText);
      _logger.debug(
        `Successfully parsed semantic mediation validation result with status: ${validationResult.status}`,
      );
    } catch (error) {
      _logger.error(`Failed to parse semantic mediation validation result: ${error.message}`);
      throw new Error(`Failed to parse semantic mediation validation result: ${error.message}`);
    }

    await this.semanticMediatorService.trackSemanticTransformation(
      'llm',
      'validator',
      _validationResultText,
      _validationResult,
      {
        trackDifferences: true,
        analyzeTransformation: true,
        saveToMemory: true,
      },
    );

    const _validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      metadata: {
        semanticAnalysis: validationResult.semanticAnalysis,
        semanticInsights: validationResult.semanticInsights,
        validationContext: _validationContext,
        validatedAt: new Date().toISOString(),
        validationType: 'semantic_mediation',
        iterative: options.iterative || false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    _logger.debug('Saving semantic mediation validation result to database');
    const _savedValidation = await _validation.save();

    _logger.debug('Storing semantic mediation validation in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: _savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: _validationResult.status,
        score: _validationResult.score,
        isSemanticMediation: true,
        validationContext: {
          strategy: options.strategy || 'balanced',
          focusAreas: options.focusAreas,
          weights: options.weights,
          iterative: options.iterative || false,
        },
        timestamp: new Date().toISOString(),
      },
      tags: ['validation', 'semantic_mediation', expectationId, codeId],
    });

    _logger.log(
      `Successfully performed semantic mediation validation - status: ${_validationResult.status}, score: ${_validationResult.score}`,
    );
    return _savedValidation;
  }

  async validateCodeIteratively(
    expectationId: string,
    codeId: string,
    previousValidationId: string,
    iterationFocus?: string[],
  ): Promise<Validation> {
    const _logger = new Logger('ValidatorService');
    _logger.log(
      `Performing iterative validation - expectation: ${expectationId}, code: ${codeId}, previous: ${previousValidationId}`,
    );

    const _expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const _expectation = _expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const _codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const _code = _codeMemories.find((memory) => memory.content._id.toString() === codeId)?.content;

    const _previousValidation = await this.validationModel.findById(previousValidationId).exec();

    if (!_expectation || !_code || !_previousValidation) {
      _logger.error(`Expectation, Code or Previous Validation not found`);
      throw new Error('Expectation, Code or Previous Validation not found');
    }

    _logger.debug(`Found expectation, code and previous validation for iterative validation`);

    const focusAreas =
      iterationFocus ||
      _previousValidation.details
        .filter((detail) => detail.status !== 'passed')
        .map((detail) => detail.expectationId);

    if (focusAreas.length === 0) {
      _logger.debug('No focus areas specified and all previous validations passed');
      return _previousValidation; // 如果没有需要重点关注的方面，直接返回前一轮验证结果
    }

    const _validationPrompt = `
      基于以下期望模型、生成的代码和前一轮验证结果，进行迭代验证：
      
      期望模型：${JSON.stringify(_expectation.model, null, 2)}
      
      生成的代码：
      ${_code.files.map((file) => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n')}
      
      前一轮验证结果：
      ${JSON.stringify(_previousValidation, null, 2)}
      
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

    _logger.debug('Sending iterative validation prompt to LLM service');
    const _validationResultText = await this.llmRouterService.generateContent(_validationPrompt);

    let validationResult;
    try {
      validationResult = JSON.parse(_validationResultText);
      _logger.debug(
        `Successfully parsed iterative validation result with status: ${validationResult.status}`,
      );
    } catch (error) {
      _logger.error(`Failed to parse iterative validation result: ${error.message}`);
      throw new Error(`Failed to parse iterative validation result: ${error.message}`);
    }

    const _validation = new this.validationModel({
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
        iterationNumber: (_previousValidation.metadata?.iterationNumber || 0) + 1,
        validatedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    _logger.debug('Saving iterative validation result to database');
    const _savedValidation = await _validation.save();

    _logger.debug('Storing iterative validation in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: _savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: _validationResult.status,
        score: _validationResult.score,
        isIterative: true,
        iterationNumber: _validation.metadata.iterationNumber,
        previousValidationId,
        timestamp: new Date().toISOString(),
      },
      tags: ['validation', 'iterative_validation', expectationId, codeId, previousValidationId],
    });

    _logger.log(
      `Successfully performed iterative validation - status: ${_validationResult.status}, score: ${_validationResult.score}`,
    );
    return _savedValidation;
  }

  /**
   * 生成验证反馈
   * 基于验证结果生成详细的反馈，用于指导代码优化
   */
  async generateValidationFeedback(validationId: string): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    prioritizedIssues: Array<{
      issue: string;
      severity: 'high' | 'medium' | 'low';
      impact: string;
      suggestion: string;
    }>;
    codeOptimizationSuggestions: Record<string, string[]>;
  }> {
    const _logger = new Logger('ValidatorService');
    _logger.log(`Generating validation feedback for validation: ${validationId}`);

    const _validation = await this.validationModel.findById(validationId).exec();

    if (!_validation) {
      _logger.error(`Validation not found: ${validationId}`);
      throw new Error('Validation not found');
    }

    const _expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const _expectation = _expectationMemories.find(
      (memory) => memory.content._id.toString() === _validation.expectationId,
    )?.content;

    const _codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const _code = _codeMemories.find(
      (memory) => memory.content._id.toString() === _validation.codeId,
    )?.content;

    if (!_expectation || !_code) {
      _logger.error(`Related expectation or code not found for validation: ${validationId}`);
      throw new Error('Related expectation or code not found');
    }

    const _feedbackPrompt = `
      基于以下验证结果，生成详细的反馈，用于指导代码优化：
      
      期望模型：${JSON.stringify(_expectation.model, null, 2)}
      
      验证结果：${JSON.stringify(_validation, null, 2)}
      
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

    _logger.debug('Sending feedback generation prompt to LLM service');
    const _feedbackText = await this.llmRouterService.generateContent(_feedbackPrompt);

    let feedback;
    try {
      feedback = JSON.parse(_feedbackText);
      _logger.debug('Successfully parsed validation feedback');
    } catch (error) {
      _logger.error(`Failed to parse validation feedback: ${error.message}`);
      throw new Error(`Failed to parse validation feedback: ${error.message}`);
    }

    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION_FEEDBACK,
      content: {
        validationId,
        feedback,
        generatedAt: new Date(),
      },
      metadata: {
        validationId,
        expectationId: _validation.expectationId,
        codeId: _validation.codeId,
        timestamp: new Date().toISOString(),
      },
      tags: ['validation_feedback', _validation.expectationId, _validation.codeId, validationId],
    });

    _logger.log(`Successfully generated validation feedback for validation: ${validationId}`);
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
  private mapToValidStrategy(
    strategy: string,
  ): 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom' {
    const _validStrategies = ['balanced', 'strict', 'lenient', 'performance', 'security', 'custom'];

    if (!strategy || !_validStrategies.includes(strategy)) {
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
      semanticContext?: Record<string, unknown>;
    },
  ): Promise<Validation> {
    const _logger = new Logger('ValidatorService');
    _logger.log(
      `Performing adaptive validation with context - expectation: ${expectationId}, code: ${codeId}`,
    );

    const _expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const _expectation = _expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const _codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const _code = _codeMemories.find((memory) => memory.content._id.toString() === codeId)?.content;

    if (!_expectation || !_code) {
      _logger.error(`Expectation or Code not found for adaptive validation`);
      throw new Error('Expectation or Code not found');
    }

    let _previousValidationsData = [];
    if (validationContext.previousValidations && validationContext.previousValidations.length > 0) {
      const _previousValidationIds = validationContext.previousValidations;
      const _previousValidations = await this.validationModel
        .find({
          _id: { $in: _previousValidationIds },
        })
        .exec();

      _previousValidationsData = _previousValidations.map((v) => ({
        id: v._id.toString(),
        status: v.status,
        score: v.score,
        details: v.details,
        metadata: v.metadata,
      }));
    }

    let _enhancedContext = validationContext;
    if (!validationContext.semanticContext) {
      _logger.debug('Generating semantic validation context using semantic mediator');
      const _validStrategy = this.mapToValidStrategy(validationContext.strategy);

      const _generatedContext = await this.semanticMediatorService.generateValidationContext(
        expectationId,
        codeId,
        validationContext.previousValidations || [],
        {
          strategy: _validStrategy,
          focusAreas: validationContext.focusAreas,
          customWeights: validationContext.weights,
        },
      );

      _enhancedContext = {
        ...validationContext,
        semanticContext: _generatedContext.semanticContext,
      };
    }

    const _adaptiveValidationData = {
      expectation: _expectation.model,
      code: {
        files: _code.files,
      },
      validationContext: _enhancedContext,
      previousValidations: _previousValidationsData,
      validationType: 'adaptive',
    };

    _logger.debug('Transforming validation data to prompt using semantic mediator');
    const _transformedPrompt = await this.semanticMediatorService.transformData(
      'validator',
      'llm',
      _adaptiveValidationData,
    );

    _logger.debug('Sending adaptive validation prompt to LLM service');
    const _validationResultText = await this.llmRouterService.generateContent(_transformedPrompt);

    let _validationResult;
    try {
      _validationResult = JSON.parse(_validationResultText);
      _logger.debug(
        `Successfully parsed adaptive validation result with status: ${_validationResult.status}`,
      );
    } catch (error) {
      _logger.error(`Failed to parse adaptive validation result: ${error.message}`);
      throw new Error(`Failed to parse adaptive validation result: ${error.message}`);
    }

    await this.semanticMediatorService.trackSemanticTransformation(
      'llm',
      'validator',
      _validationResultText,
      _validationResult,
      {
        trackDifferences: true,
        analyzeTransformation: true,
        saveToMemory: true,
      },
    );

    const _validation = new this.validationModel({
      expectationId,
      codeId,
      status: _validationResult.status,
      score: _validationResult.score,
      details: _validationResult.details,
      metadata: {
        adaptiveInsights: _validationResult.adaptiveInsights,
        validationContext: _enhancedContext,
        previousValidations: _generatedContext.previousValidations || [],
        validatedAt: new Date().toISOString(),
        validationType: 'adaptive',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    _logger.debug('Saving adaptive validation result to database');
    const _savedValidation = await _validation.save();

    _logger.debug('Storing adaptive validation in memory service');
    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: _savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: _validationResult.status,
        score: _validationResult.score,
        isAdaptive: true,
        validationContext: {
          strategy: _enhancedContext.strategy,
          focusAreas: _enhancedContext.focusAreas,
          weights: _enhancedContext.weights,
          semanticContext: _enhancedContext.semanticContext ? true : false,
        },
        timestamp: new Date().toISOString(),
      },
      tags: ['validation', 'adaptive_validation', expectationId, codeId],
    });

    _logger.log(
      `Successfully performed adaptive validation - status: ${_validationResult.status}, score: ${_validationResult.score}`,
    );
    return _savedValidation;
  }
}
