import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { ClarifierService } from '../clarifier/clarifier.service';
import { GeneratorService } from '../generator/generator.service';
import { ValidatorService } from '../validator/validator.service';
import { MemoryService } from '../memory/memory.service';
import { SemanticMediatorService } from '../semantic-mediator/semantic-mediator.service';
import { MemoryType } from '../memory/schemas/memory.schema';

/**
 * 编排器服务
 * 负责协调各个模块之间的工作流程，确保系统按照预期的顺序执行
 */

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

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
        const clarificationAnalysis = await this.clarifierService.analyzeClarificationProgress(requirementId);
        
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
      const codeList = await this.generatorService.getCodeByExpectationId(expectations._id.toString());
      
      if (codeList && codeList.length > 0) {
        code = codeList[0];
        
        const validationList = await this.validatorService.getValidationsByCodeId(code._id.toString());
        
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
  async executeWorkflow(workflowId: string, params: any): Promise<any> {
    try {
      this.logger.log(`Executing workflow: ${workflowId} with params: ${JSON.stringify(params)}`);
      
      switch (workflowId) {
        case 'full_process':
          return await this.executeFullProcess(params);
          
        case 'regenerate_code':
          return await this.regenerateCode(params);
          
        case 'semantic_validation':
          return await this.executeSemanticValidation(params);
          
        case 'semantic_enrichment':
          return await this.executeSemanticEnrichment(params);
          
        default:
          throw new Error(`Unknown workflow: ${workflowId}`);
      }
    } catch (error) {
      this.logger.error(`Error executing workflow ${workflowId}: ${error.message}`, error.stack);
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
      `requirement:${requirementId}`
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
        timestamp: new Date()
      },
      metadata: {
        status: 'completed',
        requirementTitle: requirement.title
      },
      tags: ['workflow', 'full_process', requirementId]
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
   */
  private async executeSemanticValidation(params: any): Promise<any> {
    const { expectationId, codeId } = params;
    
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
      code
    );
    
    this.logger.log(`Validating code with semantic resolution`);
    const validation = await this.validatorService.validateCodeWithSemanticInput(
      expectationId,
      codeId,
      semanticResolution
    );
    
    return {
      status: 'completed',
      validation,
      semanticResolution
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
        originalData = await this.generatorService.getCodeById(dataId);
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
      contextQuery
    );
    
    await this.semanticMediatorService.trackSemanticTransformation(
      moduleType,
      `${moduleType}_enriched`,
      originalData,
      enrichedData
    );
    
    return {
      status: 'completed',
      originalData,
      enrichedData
    };
  }
}
