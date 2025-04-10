import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ClarifierService } from '../clarifier/clarifier.service';
import { GeneratorService } from '../generator/generator.service';
import { ValidatorService } from '../validator/validator.service';
import { MemoryService } from '../memory/memory.service';
import { SemanticMediatorService } from '../semantic-mediator/semantic-mediator.service';

@Injectable()
export class OrchestratorService {
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

  async executeWorkflow(workflowId: string, params: any): Promise<any> {
    switch (workflowId) {
      case 'full_process':
        const { requirementId } = params;
        
        const requirement = await this.clarifierService.getRequirementById(requirementId);
        
        if (!requirement) {
          throw new Error('Requirement not found');
        }
        
        const expectations = await this.clarifierService.generateExpectations(requirementId);
        
        const code = await this.generatorService.generateCode(expectations._id.toString());
        
        const validation = await this.validatorService.validateCode(
          expectations._id.toString(),
          code._id.toString(),
        );
        
        return {
          status: 'completed',
          requirement,
          expectations,
          code,
          validation,
        };
        
      case 'regenerate_code':
        const { expectationId } = params;
        
        const newCode = await this.generatorService.generateCode(expectationId);
        
        return {
          status: 'completed',
          code: newCode,
        };
        
      default:
        throw new Error(`Unknown workflow: ${workflowId}`);
    }
  }
}
