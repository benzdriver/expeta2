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

  /**
   * 处理需求
   */
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

  /**
   * 获取处理状态
   */
  async getProcessStatus(requirementId: string): Promise<any> {
    const requirement = await this.clarifierService.getRequirementById(requirementId);

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    const expectations = await this.clarifierService.getExpectations(requirementId);

    let code = null;
    let validation = null;

    if (expectations) {
      const codeList = await (this.generatorService as any).getCodeByExpectationId(
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
   * 执行工作流
   */
  async executeWorkflow(workflowId: string | WorkflowType, params: unknown): Promise<any> {
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
          if (!params || typeof params !== 'object' || !('customWorkflowId' in params)) {
            throw new Error('customWorkflowId is required for custom workflow execution');
          }
          result = await this.executeCustomWorkflow(params['customWorkflowId'] as string, params);
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
        if (execution) {
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
      }

      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  /**
   * 创建自定义工作流
   */
  async createCustomWorkflow(dto: CustomWorkflowDto): Promise<any> {
    this.logger.log(`Creating custom workflow: ${dto.name}`);

    const workflowId = uuidv4();
    const customWorkflow: CustomWorkflow = {
      id: workflowId,
      name: dto.name,
      description: dto.description,
      steps: dto.steps,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.customWorkflows.set(workflowId, customWorkflow);

    await this.memoryService.storeMemory({
      type: MemoryType.SYSTEM,
      content: customWorkflow,
      metadata: {
        type: 'custom_workflow',
      },
      tags: ['workflow', 'custom', workflowId, dto.name],
    });

    return {
      id: workflowId,
      ...customWorkflow,
    };
  }

  /**
   * 获取所有自定义工作流
   */
  async getCustomWorkflows(): Promise<CustomWorkflow[]> {
    this.logger.log('Getting custom workflows');
    return Array.from(this.customWorkflows.values());
  }

  /**
   * 获取工作流执行状态
   */
  async getWorkflowStatus(executionId: string): Promise<any> {
    this.logger.log(`Getting workflow status for execution: ${executionId}`);

    const execution = this.workflowExecutions.get(executionId);
    if (!execution) {
      throw new NotFoundException(`Workflow execution with ID ${executionId} not found`);
    }

    return {
      executionId,
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
   * 获取工作流的模块连接
   */
  async getModuleConnections(workflowId: string): Promise<any> {
    this.logger.log(`Getting module connections for workflow: ${workflowId}`);

    // 如果是自定义工作流，返回其步骤定义
    if (this.customWorkflows.has(workflowId)) {
      const customWorkflow = this.customWorkflows.get(workflowId);
      if (customWorkflow) {
        return {
          workflowId,
          name: customWorkflow.name,
          steps: customWorkflow.steps,
          moduleConnections: this.analyzeModuleConnections(customWorkflow.steps),
        };
      }
    }
    
    // 如果是预定义工作流，返回其标准连接
    const predefinedConnections = this.getPredefinedWorkflowConnections(workflowId);
    if (predefinedConnections) {
      return predefinedConnections;
    }
    
    throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
  }

  /**
   * 取消工作流执行
   */
  async cancelWorkflow(executionId: string): Promise<any> {
    this.logger.log(`Cancelling workflow execution: ${executionId}`);
    
    const execution = this.workflowExecutions.get(executionId);
    if (!execution) {
      throw new NotFoundException(`Workflow execution with ID ${executionId} not found`);
    }
    
    if (execution.status === 'completed' || execution.status === 'failed') {
      return {
        message: `Workflow execution ${executionId} is already ${execution.status}`,
        execution,
      };
    }
    
    execution.status = 'cancelled';
    execution.endTime = new Date();
    
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
        duration: execution.endTime.getTime() - execution.startTime.getTime(),
      },
      tags: ['workflow', 'cancelled', execution.workflowId, executionId],
    });
    
    return {
      message: `Workflow execution ${executionId} cancelled successfully`,
      execution,
    };
  }

  /**
   * 执行完整的处理流程
   */
  private async executeFullProcess(params: any): Promise<any> {
    const { requirementId } = params;

    if (!requirementId) {
      throw new Error('requirementId is required');
    }

    const requirement = await this.clarifierService.getRequirementById(requirementId);

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    this.logger.log(`Generating expectations for requirement: ${requirementId}`);
    const expectations = await this.clarifierService.generateExpectations(requirementId);

    this.logger.log(`Enriching expectations with semantic context`);
    const enrichedExpectations = await (this.semanticMediatorService as any).translate(
      'clarifier',
      'enriched_clarifier',
      expectations,
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

    if (!expectationId) {
      throw new Error('expectationId is required');
    }

    this.logger.log(`Regenerating code for expectation: ${expectationId}`);
    const newCode = await this.generatorService.generateCode(expectationId);

    return {
      status: 'completed',
      code: newCode,
    };
  }

  /**
   * 执行语义验证流程
   */
  private async executeSemanticValidation(params: any): Promise<any> {
    const { expectationId, codeId } = params;

    if (!expectationId || !codeId) {
      throw new Error('Both expectationId and codeId are required');
    }

    const expectations = await this.clarifierService.getExpectationById(expectationId);
    const code = await (this.generatorService as any).getCodeById(codeId);

    if (!expectations || !code) {
      throw new Error('Expectations or code not found');
    }

    this.logger.log(`Resolving semantic conflicts between expectations and code`);
    const semanticResolution = await (this.semanticMediatorService as any).resolver.resolveConflicts(
      'expectations',
      expectations,
      'code',
      code,
    );

    this.logger.log(`Validating code with semantic resolution`);
    const validation = await (this.validatorService as any).validateWithSemanticMediation(
      expectationId,
      codeId,
      {
        semanticAnalysis: semanticResolution
      }
    );

    return {
      status: 'completed',
      validation,
      semanticResolution,
    };
  }

  /**
   * 执行语义丰富流程
   */
  private async executeSemanticEnrichment(params: any): Promise<any> {
    const { moduleType, dataId, contextQuery } = params;

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
        originalData = await (this.generatorService as any).findCodeById(dataId);
        break;
      default:
        throw new Error(`Unsupported module type: ${moduleType}`);
    }

    if (!originalData) {
      throw new Error(`Data not found for ${moduleType} with id ${dataId}`);
    }

    this.logger.log(`Enriching ${moduleType} data with context: ${contextQuery}`);
    const enrichedData = await (this.semanticMediatorService as any).enrichWithContext(
      moduleType,
      originalData,
      contextQuery,
    );

    await (this.semanticMediatorService as any).trackSemanticTransformation(
      moduleType,
      `${moduleType}_enriched`,
      originalData,
      enrichedData,
    );

    return {
      status: 'completed',
      originalData,
      enrichedData,
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
    const code = await (this.generatorService as any).findCodeById(codeId);

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

      const semanticAnalysis = await (this.semanticMediatorService as any).analyzeSemanticRelationship(
        'validation',
        validationResult,
        'expectations',
        expectations,
      );

      this.logger.log(`Generating improved code based on semantic analysis`);
      refinedCode = await (this.generatorService as any).generateCodeWithSemantic(
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
        finalScore: validationResult?.score || 0,
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
        bestCodeId: results[0]?.codeId,
        bestScore: results[0]?.score,
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
    const { expectationId, codeId, previousValidationId, adaptationStrategy } = params;

    if (!expectationId || !codeId) {
      throw new Error('expectationId and codeId are required');
    }

    this.logger.log(
      `Starting adaptive validation for expectation: ${expectationId}, code: ${codeId}`,
    );

    const expectations = await this.clarifierService.getExpectationById(expectationId);
    const code = await (this.generatorService as any).findCodeById(codeId);

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

      const relatedValidations = await (this.validatorService as any).findRelatedValidations(previousValidationId);
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

    const validationContext = await (this.validatorService as any).generateAdaptiveContext(
      expectationId,
      codeId,
      previousValidations,
      {
        strategy: adaptationStrategy || 'balanced',
        focusAreas: [],
      },
    );

    this.logger.log(
      `Generated validation context: ${JSON.stringify({
        strategy: validationContext.strategy,
        focusAreas: validationContext.focusAreas,
        weights: validationContext.weights,
      })}`,
    );

    let validation;
    if (
      previousValidationId &&
      validationContext.focusAreas &&
      validationContext.focusAreas.length > 0
    ) {
      validation = await this.validatorService.validateCodeIteratively(
        expectationId,
        codeId,
        previousValidationId,
        validationContext.focusAreas,
      );
    } else {
      validation = await this.validatorService.validateWithAdaptiveContext(
        expectationId,
        codeId,
        validationContext,
      );
    }

    const feedback = await this.validatorService.generateValidationFeedback(
      validation._id.toString(),
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
        timestamp: new Date(),
      },
      metadata: {
        status: 'completed',
        score: validation.score,
        adaptationStrategy: validationContext.strategy,
        focusAreas: validationContext.focusAreas,
        semanticAnalysisApplied: true,
        validationContextVersion: '2.0',
      },
      tags: ['workflow', 'adaptive_validation', 'semantic_validation', expectationId, codeId],
    });

    return {
      status: 'completed',
      validation,
      feedback,
      adaptedContext: validationContext,
      semanticAnalysis: validationContext.semanticAnalysis || {},
      validationMetrics: {
        previousValidationsCount: previousValidations.length,
        focusAreasCount: validationContext.focusAreas?.length || 0,
        adaptationStrategy: validationContext.strategy,
      },
    };
  }

  /**
   * 根据语义分析调整验证上下文
   * @private
   */
  private async adjustValidationContext(
    context: Record<string, any>,
    semanticAnalysis: unknown,
  ): Promise<Record<string, any>> {
    const updatedContext = { ...context };

    if (semanticAnalysis && typeof semanticAnalysis === 'object') {
      const analysis = semanticAnalysis as Record<string, any>;
      
      if (analysis.improvementAreas && Array.isArray(analysis.improvementAreas)) {
        updatedContext.focusAreas = analysis.improvementAreas;
      } else if (analysis.issues && Array.isArray(analysis.issues)) {
        updatedContext.focusAreas = analysis.issues.map(
          (issue: any) => issue.area || issue.category,
        );
      }

      if (analysis.suggestedWeights) {
        updatedContext.weights = {
          ...updatedContext.weights,
          ...analysis.suggestedWeights,
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

        if (analysis.criticalIssues) {
          analysis.criticalIssues.forEach((issue: any) => {
            if (issue.category === 'security') updatedContext.weights.security += 0.3;
            if (issue.category === 'performance') updatedContext.weights.performance += 0.2;
            if (issue.category === 'functionality') updatedContext.weights.functionality += 0.2;
            if (issue.category === 'maintainability') updatedContext.weights.maintainability += 0.1;
          });
        }
      }
    }

    const totalWeight = Object.values(updatedContext.weights || {}).reduce(
      (sum: number, weight: number) => sum + weight,
      0,
    ) as number;
    
    const normalizationFactor = totalWeight > 0 ? 5 / totalWeight : 1;

    if (updatedContext.weights) {
      Object.keys(updatedContext.weights).forEach((key) => {
        updatedContext.weights[key] *= normalizationFactor;
      });
    }

    return updatedContext;
  }

  /**
   * 执行自定义工作流
   */
  private async executeCustomWorkflow(workflowId: string, params: unknown): Promise<any> {
    try {
      this.logger.log(`Executing custom workflow: ${workflowId}`);
      
      const workflow = this.customWorkflows.get(workflowId);

      if (!workflow) {
        throw new Error(`Custom workflow with ID ${workflowId} not found`);
      }
      
      const context = {
        params,
        steps: {} as Record<string, any>,
        results: {} as Record<string, any>,
      };
      
      for (const step of workflow.steps) {
        try {
          const stepStart = Date.now();
          
          this.logger.log(`Executing step ${step.moduleId}: ${step.moduleId}.${step.operation}`);
          
          // Resolve any parameter templates
          const resolvedParams = this.resolveParamTemplates(step.inputMapping || {}, context);
          
          // Execute the appropriate module operation
          let result;
          switch (step.moduleId) {
            case 'clarifier':
              result = await executeClarifierOperation(
                this.clarifierService,
                step.operation,
                resolvedParams,
              );
              break;
              
            case 'generator':
              result = await executeGeneratorOperation(
                this.generatorService,
                step.operation,
                resolvedParams,
              );
              break;
              
            case 'validator':
              result = await executeValidatorOperation(
                this.validatorService,
                step.operation,
                resolvedParams,
              );
              break;
              
            case 'memory':
              result = await executeMemoryOperation(
                this.memoryService,
                step.operation,
                resolvedParams,
              );
              break;
              
            case 'semantic_mediator':
              result = await executeSemanticMediatorOperation(
                this.semanticMediatorService,
                step.operation,
                resolvedParams,
              );
              break;
              
            default:
              throw new Error(`Unsupported module: ${step.moduleId}`);
          }
          
          // Store the step result in the context
          context.steps[step.moduleId] = {
            result,
            duration: Date.now() - stepStart,
            status: 'success',
          };
          
          // 使用outputMapping代替outputName
          for (const [key, path] of Object.entries(step.outputMapping || {})) {
            if (typeof path === 'string') {
              const value = this.getValueFromPath(result, key);
              if (value !== undefined) {
                // 设置到results中
                context.results[path] = value;
              }
            }
          }
          
          // 使用condition代替condition和targetStepId
          if (step.condition) {
            const shouldSkip = evaluateCondition(step.condition, context);
            if (shouldSkip && step.retryConfig) { // 使用retryConfig代替maxRetries
              const skipToIndex = workflow.steps.findIndex(s => s.moduleId === step.moduleId);
              if (skipToIndex !== -1) {
                const currentIndex = workflow.steps.indexOf(step);
                if (skipToIndex > currentIndex) {
                  // 这里我们不能直接修改workflow.steps，因为它是原始数据
                  // 我们可以跳过中间的步骤
                  const remainingSteps = workflow.steps.slice(skipToIndex);
                  // 我们需要创建一个新的循环来处理剩余的步骤
                  for (const remainingStep of remainingSteps) {
                    this.logger.log(`Would process step ${remainingStep.moduleId} next`);
                  }
                  break;
                }
              }
            }
          }
        } catch (error) {
          this.logger.error(`Error executing step ${step.moduleId}: ${error.message}`, error.stack);
          
          // Store the failure in the context
          context.steps[step.moduleId] = {
            error: error.message,
            duration: Date.now() - (context.steps[step.moduleId]?.startTime || Date.now()),
            status: 'failed',
          };
          
          // 使用retryConfig代替onFailure, maxRetries
          if (step.retryConfig && step.retryConfig.maxRetries > 0) {
            this.logger.log(`Retrying step ${step.moduleId}, ${step.retryConfig.maxRetries} attempts remaining`);
            const retryStep = { 
              ...step, 
              retryConfig: { 
                ...step.retryConfig, 
                maxRetries: step.retryConfig.maxRetries - 1 
              }
            };
            workflow.steps.unshift(retryStep); // Add back to the beginning
            continue;
          } else {
            throw new Error(`Workflow step ${step.moduleId} failed: ${error.message}`);
          }
        }
      }
      
      return {
        workflowId,
        steps: Object.keys(context.steps).map(id => ({
          id,
          status: context.steps[id].status,
          duration: context.steps[id].duration,
        })),
        results: context.results,
      };
    } catch (error) {
      this.logger.error(`Error executing custom workflow: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * 解析参数模板
   * @private
   */
  private resolveParamTemplates(params: Record<string, any>, context: Record<string, any>): Record<string, any> {
    const result = { ...params };
    
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string' && value.includes('${')) {
        // Extract template expressions like ${steps.stepId.result.property}
        const templates = value.match(/\${([^}]+)}/g) || [];
        
        let resolvedValue = value;
        for (const template of templates) {
          const path = template.substring(2, template.length - 1);
          const pathValue = getValueByPath(context, path);
          
          if (pathValue !== undefined) {
            // Replace the template with the actual value
            resolvedValue = resolvedValue.replace(template, JSON.stringify(pathValue));
          }
        }
        
        // Try to parse if it's a pure JSON value now
        if (resolvedValue !== value && !resolvedValue.includes('${')) {
          try {
            result[key] = JSON.parse(resolvedValue);
          } catch (e) {
            result[key] = resolvedValue;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve nested objects
        result[key] = this.resolveParamTemplates(value, context);
      }
    }
    
    return result;
  }

  /**
   * 分析工作流步骤之间的模块连接
   * @private
   */
  private analyzeModuleConnections(steps: WorkflowStep[]): any[] {
    const connections = [];
    
    for (let i = 0; i < steps.length - 1; i++) {
      const sourceStep = steps[i];
      const targetStep = steps[i + 1];
      
      connections.push({
        source: {
          id: sourceStep.moduleId,
          module: sourceStep.moduleId,
          operation: sourceStep.operation,
        },
        target: {
          id: targetStep.moduleId,
          module: targetStep.moduleId,
          operation: targetStep.operation,
        },
        dataFlow: this.inferDataFlow(sourceStep, targetStep),
      });
    }

    return connections;
  }

  /**
   * 推断步骤之间的数据流
   * @private
   */
  private inferDataFlow(sourceStep: WorkflowStep, targetStep: WorkflowStep): string[] {
    const dataFlow = [];
    
    // 分析目标步骤的输入参数引用
    if (targetStep.inputMapping) {
      for (const [key, value] of Object.entries(targetStep.inputMapping)) {
        if (typeof value === 'string' && value.includes('${')) {
          const matches = value.match(/\${([^}]+)}/g) || [];
          
          for (const match of matches) {
            const path = match.substring(2, match.length - 1);
            if (path.startsWith(`steps.${sourceStep.moduleId}.result`)) {
              dataFlow.push(`${path} -> params.${key}`);
            }
          }
        }
      }
    }
    
    return dataFlow.length > 0 ? dataFlow : ['implicit'];
  }

  /**
   * 获取预定义工作流的连接
   * @private
   */
  private getPredefinedWorkflowConnections(workflowId: string): any {
    const workflowType = Object.values(WorkflowType).find(type => type === workflowId);
    
    if (!workflowType) {
      return null;
    }
    
    switch (workflowType) {
      case WorkflowType.FULL_PROCESS:
        return {
          workflowId,
          name: 'Full Process Workflow',
          modules: ['clarifier', 'semantic_mediator', 'generator', 'validator'],
          connections: [
            { source: 'clarifier', target: 'semantic_mediator', label: 'expectations' },
            { source: 'semantic_mediator', target: 'generator', label: 'enriched_expectations' },
            { source: 'generator', target: 'validator', label: 'code' },
          ],
        };
        
      case WorkflowType.ITERATIVE_REFINEMENT:
        return {
          workflowId,
          name: 'Iterative Refinement Workflow',
          modules: ['validator', 'semantic_mediator', 'generator'],
          connections: [
            { source: 'validator', target: 'semantic_mediator', label: 'validation_results' },
            { source: 'semantic_mediator', target: 'generator', label: 'refinement_suggestions' },
            { source: 'generator', target: 'validator', label: 'refined_code' },
          ],
        };
      
      // Add other predefined workflows as needed
      
      default:
        return {
          workflowId,
          name: `${workflowType} Workflow`,
          modules: ['generic'],
          connections: [],
        };
    }
  }

  // 添加辅助方法来从复杂对象中获取值
  private getValueFromPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
}
