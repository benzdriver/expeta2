import { Injectable, Inject, forwardRef, Logger, NotFoundException } from '@nestjs/common';
import { ClarifierService } from '../clarifier/clarifier.service';
import { GeneratorService } from '../generator/generator.service';
import { ValidatorService } from '../validator/validator.service';
import { MemoryService } from '../memory/memory.service';
import { SemanticMediatorService } from '../semantic-mediator/semantic-mediator.service';
import { MemoryType } from '../memory/schemas/memory.schema';
import { CustomWorkflowDto, WorkflowType } from './dto/workflow.dto';
import { v4 as uuidv4 } from 'uuid';
import { getValueByPath, setValueByPath, evaluateCondition } from './utils/workflow-utils';
import {
  executeClarifierOperation,
  executeGeneratorOperation,
  executeValidatorOperation,
  executeMemoryOperation,
  executeSemanticMediatorOperation,
} from './utils/module-operations';

import {
  WorkflowExecution,
  WorkflowExecutionStep,
  CustomWorkflow,
  WorkflowStep,
} from './schemas/workflow.schema';

/**
 * 编排器服务
 * 负责协调各个模块之间的工作流程，确保系统按照预期的顺序执行
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly workflowExecutions: Map<string, WorkflowExecution> = new Map();
  private readonly customWorkflows: Map<string, CustomWorkflow> = new Map();

  constructor(
    private readonly clarifierService: ClarifierService,
    private readonly generatorService: GeneratorService,
    private readonly validatorService: ValidatorService,
    private readonly memoryService: MemoryService,
    @Inject(forwardRef(() => SemanticMediatorService))
    private readonly semanticMediatorService: SemanticMediatorService,
  ) {}

  async processRequirement(requirementId: string): Promise<any> {
    const requirement = await this.clarifierService.getRequirementById(requirementId);

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    switch (requirement.status) {
      case 'initial':
        return {
          status: 'clarification_needed',
          message: '需要进行需求澄清',
          nextStep: 'clarify',
        };

      case 'clarifying':
        const clarificationAnalysis =
          await this.clarifierService.analyzeClarificationProgress(requirementId);

        if (clarificationAnalysis.needMoreClarification) {
          return {
            status: 'clarification_in_progress',
            message: '需要更多澄清',
            nextStep: 'continue_clarify',
            suggestedQuestions: clarificationAnalysis.suggestedQuestions,
          };
        } else {
          return {
            status: 'ready_for_expectations',
            message: '澄清已足够，可以生成期望模型',
            nextStep: 'generate_expectations',
            summary: clarificationAnalysis.summary,
          };
        }

      case 'expectations_generated':
        return {
          status: 'ready_for_code_generation',
          message: '期望模型已生成，可以生成代码',
          nextStep: 'generate_code',
        };

      case 'completed':
        return {
          status: 'completed',
          message: '需求处理流程已完成',
        };

      default:
        return {
          status: 'unknown',
          message: '未知状态',
        };
    }
  }

  async getProcessStatus(requirementId: string): Promise<any> {
    const requirement = await this.clarifierService.getRequirementById(requirementId);

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    const expectations = await this.clarifierService.getExpectations(requirementId);

    let code = null;
    let validation = null;

    if (expectations) {
      const codeList = await this.generatorService.getCodeByExpectationId(
        expectations._id.toString(),
      );

      if (codeList && codeList.length > 0) {
        code = codeList[0];

        const validationList = await this.validatorService.getValidationsByCodeId(
          code._id.toString(),
        );

        if (validationList && validationList.length > 0) {
          validation = validationList[0];
        }
      }
    }

    return {
      requirement,
      expectations,
      code,
      validation,
      status: requirement.status,
    };
  }

  /**
   * 执行指定的工作流程
   */
  async executeWorkflow(workflowId: string | WorkflowType, params: any): Promise<any> {
    try {
      this.logger.log(`Executing workflow: ${workflowId} with params: ${JSON.stringify(params)}`);

      const executionId = uuidv4();
      const execution: WorkflowExecution = {
        id: executionId,
        workflowId: workflowId.toString(),
        params,
        status: 'running',
        startTime: new Date(),
        steps: [],
      };

      this.workflowExecutions.set(executionId, execution);

      let result;

      switch (workflowId) {
        case WorkflowType.FULL_PROCESS:
          result = await this.executeFullProcess(params);
          break;

        case WorkflowType.REGENERATE_CODE:
          result = await this.regenerateCode(params);
          break;

        case WorkflowType.SEMANTIC_VALIDATION:
          result = await this.executeSemanticValidation(params);
          break;

        case WorkflowType.SEMANTIC_ENRICHMENT:
          result = await this.executeSemanticEnrichment(params);
          break;

        case WorkflowType.ITERATIVE_REFINEMENT:
          result = await this.executeIterativeRefinement(params);
          break;

        case WorkflowType.PARALLEL_VALIDATION:
          result = await this.executeParallelValidation(params);
          break;

        case WorkflowType.ADAPTIVE_VALIDATION:
          result = await this.executeAdaptiveValidation(params);
          break;

        case WorkflowType.CUSTOM:
          if (!params.customWorkflowId) {
            throw new Error('customWorkflowId is required for custom workflow execution');
          }
          result = await this.executeCustomWorkflow(params.customWorkflowId, params);
          break;

        default:
          if (this.customWorkflows.has(workflowId.toString())) {
            result = await this.executeCustomWorkflow(workflowId.toString(), params);
          } else {
            throw new Error(`Unknown workflow: ${workflowId}`);
          }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = result;

      await this.memoryService.storeMemory({
        type: MemoryType.SYSTEM,
        content: {
          executionId,
          workflowId,
          params,
          result,
          timestamp: new Date(),
        },
        metadata: {
          status: 'completed',
          duration: execution.endTime.getTime() - execution.startTime.getTime(),
        },
        tags: ['workflow', workflowId.toString(), executionId],
      });

      return {
        executionId,
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error executing workflow ${workflowId}: ${error.message}`, error.stack);

      const executionId = Array.from(this.workflowExecutions.entries()).find(
        ([_, exec]) => exec.workflowId === workflowId.toString() && exec.status === 'running',
      )?.[0];

      if (executionId) {
        const execution = this.workflowExecutions.get(executionId);
        execution.status = 'failed';
        execution.endTime = new Date();
        execution.error = error.message;

        await this.memoryService.storeMemory({
          type: MemoryType.SYSTEM,
          content: {
            executionId,
            workflowId,
            error: error.message,
            timestamp: new Date(),
          },
          metadata: {
            status: 'failed',
          },
          tags: ['workflow', 'error', workflowId.toString(), executionId],
        });
      }

      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  /**
   * 执行完整的处理流程
   */
  private async executeFullProcess(params: any): Promise<any> {
    const { requirementId } = params;

    const requirement = await this.clarifierService.getRequirementById(requirementId);

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    this.logger.log(`Generating expectations for requirement: ${requirementId}`);
    const expectations = await this.clarifierService.generateExpectations(requirementId);

    this.logger.log(`Enriching expectations with semantic context`);
    const enrichedExpectations = await this.semanticMediatorService.enrichWithContext(
      'clarifier',
      expectations,
      `requirement:${requirementId}`,
    );

    this.logger.log(`Generating code based on enriched expectations`);
    const code = await this.generatorService.generateCode(expectations._id.toString());

    this.logger.log(`Validating generated code`);
    const validation = await this.validatorService.validateCode(
      expectations._id.toString(),
      code._id.toString(),
    );

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        workflowId: 'full_process',
        requirementId,
        expectationsId: expectations._id.toString(),
        codeId: code._id.toString(),
        validationId: validation._id.toString(),
        timestamp: new Date(),
      },
      metadata: {
        status: 'completed',
        requirementTitle: requirement.title,
      },
      tags: ['workflow', 'full_process', requirementId],
    });

    return {
      status: 'completed',
      requirement,
      expectations: enrichedExpectations,
      code,
      validation,
    };
  }

  /**
   * 重新生成代码
   */
  private async regenerateCode(params: any): Promise<any> {
    const { expectationId } = params;

    this.logger.log(`Regenerating code for expectation: ${expectationId}`);
    const newCode = await this.generatorService.generateCode(expectationId);

    return {
      status: 'completed',
      code: newCode,
    };
  }

  /**
   * 执行语义验证流程
   * 使用语义分析解决期望和代码之间的冲突，并进行验证
   */
  private async executeSemanticValidation(params: any): Promise<any> {
    const { 
      expectationId, 
      codeId, 
      conflictResolutionOptions,
      validationOptions,
      extractInsights,
      trackTransformation
    } = params;
    if (!expectationId || !codeId) {
      throw new Error('Both expectationId and codeId are required');
    }

    const expectations = await this.clarifierService.getExpectationById(expectationId);
    const code = await this.generatorService.getCodeById(codeId);

    if (!expectations || !code) {
      throw new Error('Expectations or code not found');
    }
    
    
    this.logger.log(`Resolving semantic conflicts between expectations and code`);
    const semanticResolution = await this.semanticMediatorService.resolveSemanticConflicts(
      'expectations',
      expectations,
      'code',
      code,
    );
    
    let semanticInsights = null;
    if (extractInsights) {
      this.logger.log(`Extracting semantic insights from resolution`);
      semanticInsights = await this.semanticMediatorService.extractSemanticInsights(
        semanticResolution,
        `Semantic conflicts between expectations ${expectationId} and code ${codeId}`
      );
    }
    
    this.logger.log(`Validating code with semantic resolution`);
    const validation = await this.validatorService.validateCodeWithSemanticInput(
      expectationId,
      codeId,
      {
        ...semanticResolution,
        semanticInsights,
        ...validationOptions
      }
    );
    
    if (trackTransformation !== false) {
      await this.semanticMediatorService.trackSemanticTransformation(
        'expectations',
        'validation',
        expectations,
        validation,
        {
          trackDifferences: true,
          analyzeTransformation: true,
          saveToMemory: true
        }
      );
    }
    
    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        workflowId: WorkflowType.SEMANTIC_VALIDATION,
        expectationId,
        codeId,
        validationId: validation._id.toString(),
        semanticResolution,
        semanticInsights,
        timestamp: new Date()
      },
      metadata: {
        status: 'completed',
        score: validation.score,
        hasSemanticRelationship: true,
        hasSemanticInsights: !!semanticInsights,
        semanticValidationVersion: '2.0'
      },
      tags: ['workflow', 'semantic_validation', expectationId, codeId]
    });
    return {
      status: 'completed',
      validation,
      semanticResolution,
      semanticInsights,
      validationMetrics: {
        score: validation.score,
        semanticConflictsResolved: semanticResolution?.resolvedConflicts?.length || 0,
        semanticAnalysisApplied: true
      }
    };
  }

  /**
   * 执行语义丰富流程
   * 使用上下文信息和语义分析增强模块数据
   */
  private async executeSemanticEnrichment(params: any): Promise<any> {
    const { 
      moduleType, 
      dataId, 
      contextQuery,
      enrichmentOptions,
      transformationOptions,
      extractInsights
    } = params;
    if (!moduleType || !dataId || !contextQuery) {
      throw new Error('moduleType, dataId and contextQuery are required');
    }

    let originalData;

    switch (moduleType) {
      case 'requirement':
        originalData = await this.clarifierService.getRequirementById(dataId);
        break;
      case 'expectations':
        originalData = await this.clarifierService.getExpectationById(dataId);
        break;
      case 'code':
        originalData = await this.generatorService.getCodeById(dataId);
        break;
      case 'validation':
        originalData = await this.validatorService.getValidationById(dataId);
        break;
      default:
        throw new Error(`Unsupported module type: ${moduleType}`);
    }

    if (!originalData) {
      throw new Error(`Data not found for ${moduleType} with id ${dataId}`);
    }

    this.logger.log(`Enriching ${moduleType} data with context: ${contextQuery}`);
    
    const enrichedData = await this.semanticMediatorService.enrichWithContext(
      moduleType,
      originalData,
      contextQuery,
    );
    
    const transformOptions = {
      trackDifferences: true,
      analyzeTransformation: true,
      saveToMemory: true,
      ...transformationOptions
    };
    
    const transformationRecord = await this.semanticMediatorService.trackSemanticTransformation(
      moduleType,
      `${moduleType}_enriched`,
      originalData,
      enrichedData,
      transformOptions
    );
    
    let semanticInsights = null;
    if (extractInsights) {
      this.logger.log(`Extracting semantic insights from enriched data`);
      semanticInsights = await this.semanticMediatorService.extractSemanticInsights(
        enrichedData,
        contextQuery
      );
    }
    
    const transformationEvaluation = await this.semanticMediatorService.evaluateSemanticTransformation(
      originalData,
      enrichedData,
      `Enrichment of ${moduleType} data with context: ${contextQuery}`
    );
    
    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        workflowId: WorkflowType.SEMANTIC_ENRICHMENT,
        moduleType,
        dataId,
        contextQuery,
        enrichedDataId: enrichedData._id?.toString(),
        transformationRecord,
        semanticInsights,
        transformationEvaluation,
        timestamp: new Date()
      },
      metadata: {
        status: 'completed',
        moduleType,
        contextQuery,
        hasInsights: !!semanticInsights,
        enrichmentQuality: transformationEvaluation.totalQuality || 0
      },
      tags: ['workflow', 'semantic_enrichment', moduleType, dataId]
    });
    return {
      status: 'completed',
      originalData,
      enrichedData,
      transformationRecord,
      semanticInsights,
      transformationEvaluation,
      enrichmentMetrics: {
        semanticPreservation: transformationEvaluation.semanticPreservation || 0,
        informationCompleteness: transformationEvaluation.informationCompleteness || 0,
        contextRelevance: transformationEvaluation.contextRelevance || 0,
        totalQuality: transformationEvaluation.totalQuality || 0
      }
    };
  }

  /**
   * 执行迭代优化流程
   */
  private async executeIterativeRefinement(params: any): Promise<any> {
    const { expectationId, codeId, maxIterations = 3 } = params;

    if (!expectationId || !codeId) {
      throw new Error('Both expectationId and codeId are required');
    }

    const expectations = await this.clarifierService.getExpectationById(expectationId);
    const code = await this.generatorService.getCodeById(codeId);

    if (!expectations || !code) {
      throw new Error('Expectations or code not found');
    }

    this.logger.log(
      `Starting iterative refinement for expectation: ${expectationId}, code: ${codeId}`,
    );

    let currentIteration = 0;
    let validationResult;
    let refinedCode = code;
    const iterationResults = [];

    while (currentIteration < maxIterations) {
      currentIteration++;
      this.logger.log(`Iteration ${currentIteration} of ${maxIterations}`);

      validationResult = await this.validatorService.validateCode(
        expectationId,
        refinedCode._id.toString(),
      );

      iterationResults.push({
        iteration: currentIteration,
        codeId: refinedCode._id.toString(),
        validationId: validationResult._id.toString(),
        score: validationResult.score,
        issues: validationResult.issues,
      });

      if (validationResult.score >= 0.9) {
        this.logger.log(
          `Validation score ${validationResult.score} reached threshold, stopping iterations`,
        );
        break;
      }

      if (currentIteration >= maxIterations) {
        break;
      }

      const semanticAnalysis = await this.semanticMediatorService.resolveSemanticConflicts(
        'validation',
        validationResult,
        'expectations',
        expectations,
      );

      this.logger.log(`Generating improved code based on semantic analysis`);
      refinedCode = await this.generatorService.generateCodeWithSemanticInput(
        expectationId,
        semanticAnalysis,
      );
    }

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        workflowId: WorkflowType.ITERATIVE_REFINEMENT,
        expectationId,
        initialCodeId: codeId,
        finalCodeId: refinedCode._id.toString(),
        iterations: iterationResults,
        timestamp: new Date(),
      },
      metadata: {
        status: 'completed',
        iterationCount: currentIteration,
        finalScore: validationResult.score,
      },
      tags: ['workflow', 'iterative_refinement', expectationId],
    });

    return {
      status: 'completed',
      initialCode: code,
      finalCode: refinedCode,
      validation: validationResult,
      iterations: iterationResults,
    };
  }

  /**
   * 执行并行验证流程
   */
  private async executeParallelValidation(params: any): Promise<any> {
    const { expectationId, codeIds } = params;

    if (!expectationId || !codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      throw new Error('expectationId and non-empty codeIds array are required');
    }

    this.logger.log(
      `Starting parallel validation for expectation: ${expectationId}, codes: ${codeIds.join(', ')}`,
    );

    const validationPromises = codeIds.map((codeId) =>
      this.validatorService.validateCode(expectationId, codeId),
    );

    const validations = await Promise.all(validationPromises);

    const results = validations.map((validation, index) => ({
      codeId: codeIds[index],
      validation,
      score: validation.score,
    }));

    results.sort((a, b) => b.score - a.score);

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        workflowId: WorkflowType.PARALLEL_VALIDATION,
        expectationId,
        codeIds,
        results: results.map((r) => ({
          codeId: r.codeId,
          validationId: r.validation._id.toString(),
          score: r.score,
        })),
        timestamp: new Date(),
      },
      metadata: {
        status: 'completed',
        bestCodeId: results[0].codeId,
        bestScore: results[0].score,
      },
      tags: ['workflow', 'parallel_validation', expectationId],
    });

    return {
      status: 'completed',
      results,
      bestResult: results[0],
    };
  }

  /**
   * 执行自适应验证流程
   * 根据先前的验证结果和语义分析动态调整验证标准
   */
  private async executeAdaptiveValidation(params: any): Promise<any> {
    const { 
      expectationId, 
      codeId, 
      previousValidationId, 
      adaptationStrategy,
      customWeights,
      focusAreas,
      semanticAnalysisOptions
    } = params;
    
    if (!expectationId || !codeId) {
      throw new Error('expectationId and codeId are required');
    }

    this.logger.log(
      `Starting adaptive validation for expectation: ${expectationId}, code: ${codeId}`,
    );

    const expectations = await this.clarifierService.getExpectationById(expectationId);
    const code = await this.generatorService.getCodeById(codeId);

    if (!expectations || !code) {
      throw new Error('Expectations or code not found');
    }

    let previousValidations = [];
    if (previousValidationId) {
      const previousValidation =
        await this.validatorService.getValidationById(previousValidationId);

      if (!previousValidation) {
        throw new Error(`Previous validation with id ${previousValidationId} not found`);
      }

      previousValidations.push(previousValidationId);

      const relatedValidations = await this.validatorService.getValidationsByCodeId(codeId);
      if (relatedValidations && relatedValidations.length > 0) {
        previousValidations = [
          ...previousValidations,
          ...relatedValidations
            .filter((v) => v._id.toString() !== previousValidationId)
            .map((v) => v._id.toString()),
        ].slice(0, 5); // 最多使用5个验证记录
      }
    }

    this.logger.log(`Generating enhanced validation context using semantic mediator`);
    
    const validationContextOptions = {
      strategy: adaptationStrategy || 'balanced',
      focusAreas: focusAreas || [],
      customWeights: customWeights || {}
    };
    const validationContext = await this.semanticMediatorService.generateValidationContext(
      expectationId,
      codeId,
      previousValidations,
      validationContextOptions
    );
    
    this.logger.log(`Generated validation context: ${JSON.stringify({
      strategy: validationContext.strategy,
      focusAreas: validationContext.focusAreas,
      weights: validationContext.weights,
      semanticContext: Object.keys(validationContext.semanticContext || {})
    })}`);
    
    let validation;
    if (previousValidationId && validationContext.focusAreas && validationContext.focusAreas.length > 0) {
      validation = await this.validatorService.validateWithAdaptiveContext(
        expectationId,
        codeId,
        {
          ...validationContext,
          previousValidationId,
          focusOnAreas: validationContext.focusAreas
        }
      );
    } else {
      validation = await this.validatorService.validateWithAdaptiveContext(
        expectationId,
        codeId,
        validationContext,
      );
    }
    
    const feedback = await this.validatorService.generateValidationFeedback(validation._id.toString());
    
    const semanticInsights = await this.semanticMediatorService.extractSemanticInsights(
      validation,
      `Validation results for code ${codeId} against expectations ${expectationId}`
    );
    
    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        workflowId: WorkflowType.ADAPTIVE_VALIDATION,
        expectationId,
        codeId,
        validationId: validation._id.toString(),
        validationContext,
        previousValidations,
        previousValidationId,
        semanticInsights,
        timestamp: new Date()
      },
      metadata: {
        status: 'completed',
        score: validation.score,
        adaptationStrategy: validationContext.strategy,
        focusAreas: validationContext.focusAreas,
        semanticAnalysisApplied: true,
        validationContextVersion: '2.0',
        hasSemanticInsights: true
      },
      tags: ['workflow', 'adaptive_validation', 'semantic_validation', expectationId, codeId],
    });
    
    if (semanticAnalysisOptions?.trackTransformation !== false) {
      await this.semanticMediatorService.trackSemanticTransformation(
        'validator',
        'orchestrator',
        validation,
        {
          expectationId,
          codeId,
          validationContext,
          previousValidations
        },
        {
          trackDifferences: semanticAnalysisOptions?.trackDifferences !== false,
          analyzeTransformation: semanticAnalysisOptions?.analyzeTransformation !== false,
          saveToMemory: true
        }
      );
    }
    
    return {
      status: 'completed',
      validation,
      feedback,
      adaptedContext: validationContext,
      semanticInsights,
      semanticAnalysis: validationContext.semanticContext || {},
      validationMetrics: {
        previousValidationsCount: previousValidations.length,
        focusAreasCount: validationContext.focusAreas?.length || 0,
        adaptationStrategy: validationContext.strategy,
        semanticContextApplied: true
      }
    };
  }

  /**
   * 根据语义分析调整验证上下文
   * @private
   */
  private async adjustValidationContext(
    context: Record<string, any>,
    semanticAnalysis: any,
  ): Promise<Record<string, any>> {
    const updatedContext = { ...context };

    if (semanticAnalysis.improvementAreas && Array.isArray(semanticAnalysis.improvementAreas)) {
      updatedContext.focusAreas = semanticAnalysis.improvementAreas;
    } else if (semanticAnalysis.issues && Array.isArray(semanticAnalysis.issues)) {
      updatedContext.focusAreas = semanticAnalysis.issues.map(
        (issue) => issue.area || issue.category,
      );
    }

    if (semanticAnalysis.suggestedWeights) {
      updatedContext.weights = {
        ...updatedContext.weights,
        ...semanticAnalysis.suggestedWeights,
      };
    } else {
      switch (context.strategy) {
        case 'functionality_first':
          updatedContext.weights.functionality = 1.5;
          updatedContext.weights.performance = 0.8;
          break;
        case 'performance_focus':
          updatedContext.weights.performance = 1.5;
          updatedContext.weights.maintainability = 0.8;
          break;
        case 'security_critical':
          updatedContext.weights.security = 1.5;
          updatedContext.weights.functionality = 1.2;
          break;
        case 'maintainability_focus':
          updatedContext.weights.maintainability = 1.5;
          updatedContext.weights.performance = 0.8;
          break;
      }

      if (semanticAnalysis.criticalIssues) {
        semanticAnalysis.criticalIssues.forEach((issue) => {
          if (issue.category === 'security') updatedContext.weights.security += 0.3;
          if (issue.category === 'performance') updatedContext.weights.performance += 0.2;
          if (issue.category === 'functionality') updatedContext.weights.functionality += 0.2;
          if (issue.category === 'maintainability') updatedContext.weights.maintainability += 0.1;
        });
      }
    }

    const totalWeight = Object.values(updatedContext.weights).reduce(
      (sum: number, weight: number) => sum + weight,
      0,
    ) as number;
    const normalizationFactor = 4.0 / totalWeight;

    Object.keys(updatedContext.weights).forEach((key) => {
      updatedContext.weights[key] *= normalizationFactor;
    });

    return updatedContext;
  }

  /**
   * 执行自定义工作流
   */
  private async executeCustomWorkflow(workflowId: string, params: any): Promise<any> {
    const workflow = this.customWorkflows.get(workflowId);

    if (!workflow) {
      throw new NotFoundException(`Custom workflow with id ${workflowId} not found`);
    }

    this.logger.log(`Executing custom workflow: ${workflow.name}`);

    const executionId = uuidv4();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      params,
      status: 'running',
      startTime: new Date(),
      steps: workflow.steps.map((step) => ({
        name: `${step.moduleId}.${step.operation}`,
        status: 'pending',
      })),
    };

    this.workflowExecutions.set(executionId, execution);

    const context = { ...params };

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const executionStep = execution.steps[i];

      if (step.condition) {
        const conditionMet = evaluateCondition(step.condition, context);

        if (!conditionMet) {
          executionStep.status = 'skipped';
          continue;
        }
      }

      executionStep.status = 'running';
      executionStep.startTime = new Date();

      try {
        const stepParams = {};

        for (const [paramName, paramPath] of Object.entries(step.inputMapping)) {
          stepParams[paramName] = getValueByPath(context, paramPath);
        }

        let result;

        switch (step.moduleId) {
          case 'clarifier':
            result = await executeClarifierOperation(
              this.clarifierService,
              step.operation,
              stepParams,
            );
            break;
          case 'generator':
            result = await executeGeneratorOperation(
              this.generatorService,
              step.operation,
              stepParams,
            );
            break;
          case 'validator':
            result = await executeValidatorOperation(
              this.validatorService,
              step.operation,
              stepParams,
            );
            break;
          case 'memory':
            result = await executeMemoryOperation(this.memoryService, step.operation, stepParams);
            break;
          case 'semantic_mediator':
            result = await executeSemanticMediatorOperation(
              this.semanticMediatorService,
              step.operation,
              stepParams,
            );
            break;
          default:
            throw new Error(`Unknown module: ${step.moduleId}`);
        }

        for (const [contextPath, resultPath] of Object.entries(step.outputMapping)) {
          setValueByPath(context, contextPath, getValueByPath(result, resultPath));
        }

        executionStep.status = 'completed';
        executionStep.endTime = new Date();
        executionStep.result = result;
      } catch (error) {
        executionStep.status = 'failed';
        executionStep.endTime = new Date();
        executionStep.error = error.message;

        throw error;
      }
    }

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.result = context;

    return context;
  }

  /**
   * 创建自定义工作流
   */
  async createCustomWorkflow(dto: CustomWorkflowDto): Promise<any> {
    const workflowId = uuidv4();

    const workflow: CustomWorkflow = {
      id: workflowId,
      name: dto.name,
      steps: dto.steps,
      config: dto.config || {},
      description: dto.description || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.customWorkflows.set(workflowId, workflow);

    this.logger.log(`Created custom workflow: ${workflow.name} with ID: ${workflowId}`);

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        workflowId,
        name: workflow.name,
        steps: workflow.steps,
        config: workflow.config,
        timestamp: new Date(),
      },
      metadata: {
        type: 'custom_workflow',
        name: workflow.name,
      },
      tags: ['workflow', 'custom', workflowId],
    });

    return {
      id: workflowId,
      name: workflow.name,
      stepsCount: workflow.steps.length,
      createdAt: workflow.createdAt,
    };
  }

  /**
   * 获取自定义工作流列表
   */
  async getCustomWorkflows(): Promise<any[]> {
    return Array.from(this.customWorkflows.values()).map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      stepsCount: workflow.steps.length,
      description: workflow.description,
      createdAt: workflow.createdAt,
    }));
  }

  /**
   * 获取工作流执行状态
   */
  async getWorkflowStatus(executionId: string): Promise<any> {
    const execution = this.workflowExecutions.get(executionId);

    if (!execution) {
      throw new NotFoundException(`Workflow execution with id ${executionId} not found`);
    }

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      steps: execution.steps,
      result: execution.result,
      error: execution.error,
    };
  }

  /**
   * 取消工作流执行
   */
  async cancelWorkflow(executionId: string): Promise<any> {
    const execution = this.workflowExecutions.get(executionId);

    if (!execution) {
      throw new NotFoundException(`Workflow execution with id ${executionId} not found`);
    }

    if (execution.status !== 'running') {
      return {
        success: false,
        message: `Cannot cancel workflow execution with status: ${execution.status}`,
      };
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();

    this.logger.log(`Cancelled workflow execution: ${executionId}`);

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: {
        executionId,
        workflowId: execution.workflowId,
        status: 'cancelled',
        timestamp: new Date(),
      },
      metadata: {
        status: 'cancelled',
      },
      tags: ['workflow', 'cancelled', execution.workflowId, executionId],
    });

    return {
      success: true,
      message: 'Workflow execution cancelled successfully',
    };
  }
}
