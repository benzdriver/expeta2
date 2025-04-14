import { Controller, Post, Body, Get, Param, Logger } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import {
  ExecuteWorkflowDto,
  WorkflowStatusDto,
  CustomWorkflowDto,
  WorkflowType,
} from './dto/workflow.dto';

@Controller('orchestrator')
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);

  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('process-requirement')
  async processRequirement(@Body() data: { requirementId: string }) {
    this.logger.log(`Processing requirement: ${data.requirementId}`);
    return this.orchestratorService.processRequirement(data.requirementId);
  }

  @Get('status/:requirementId')
  async getProcessStatus(@Param('requirementId') requirementId: string) {
    this.logger.log(`Getting process status for requirement: ${requirementId}`);
    return this.orchestratorService.getProcessStatus(requirementId);
  }

  @Post('execute-workflow')
  async executeWorkflow(@Body() dto: ExecuteWorkflowDto) {
    this.logger.log(`Executing workflow: ${dto.workflowId}`);
    return this.orchestratorService.executeWorkflow(dto.workflowId, dto.params);
  }

  @Post('create-custom-workflow')
  async createCustomWorkflow(@Body() dto: CustomWorkflowDto) {
    this.logger.log(`Creating custom workflow: ${dto.name}`);
    return this.orchestratorService.createCustomWorkflow(dto);
  }

  @Get('workflows')
  async getAvailableWorkflows() {
    this.logger.log('Getting available workflows');
    return {
      standardWorkflows: Object.values(WorkflowType),
      customWorkflows: await this.orchestratorService.getCustomWorkflows(),
    };
  }

  @Get('workflow-status/:executionId')
  async getWorkflowStatus(@Param('executionId') executionId: string) {
    this.logger.log(`Getting workflow status for execution: ${executionId}`);
    return this.orchestratorService.getWorkflowStatus(executionId);
  }
  
  @Get('module-connections/:workflowId')
  async getModuleConnections(@Param('workflowId') workflowId: string) {
    this.logger.log(`Getting module connections for workflow: ${workflowId}`);
    return this.orchestratorService.getModuleConnections(workflowId);
  }

  @Post('cancel-workflow')
  async cancelWorkflow(@Body() data: { executionId: string }) {
    this.logger.log(`Cancelling workflow execution: ${data.executionId}`);
    return this.orchestratorService.cancelWorkflow(data.executionId);
  }

  @Post('iterative-refinement')
  async executeIterativeRefinement(
    @Body() data: { expectationId: string; codeId: string; maxIterations?: number },
  ) {
    this.logger.log(`Starting iterative refinement for expectation: ${data.expectationId}`);
    return this.orchestratorService.executeWorkflow(WorkflowType.ITERATIVE_REFINEMENT, {
      expectationId: data.expectationId,
      codeId: data.codeId,
      maxIterations: data.maxIterations || 3,
    });
  }

  @Post('parallel-validation')
  async executeParallelValidation(@Body() data: { expectationId: string; codeIds: string[] }) {
    this.logger.log(`Starting parallel validation for expectation: ${data.expectationId}`);
    return this.orchestratorService.executeWorkflow(WorkflowType.PARALLEL_VALIDATION, {
      expectationId: data.expectationId,
      codeIds: data.codeIds,
    });
  }

  @Post('adaptive-validation')
  async executeAdaptiveValidation(
    @Body()
    data: {
      expectationId: string;
      codeId: string;
      previousValidationId?: string;
      adaptationStrategy?: string;
    },
  ) {
    this.logger.log(`Starting adaptive validation for expectation: ${data.expectationId}`);
    return this.orchestratorService.executeWorkflow(WorkflowType.ADAPTIVE_VALIDATION, {
      expectationId: data.expectationId,
      codeId: data.codeId,
      previousValidationId: data.previousValidationId,
      adaptationStrategy: data.adaptationStrategy || 'balanced',
    });
  }
}
