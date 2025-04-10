import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('process-requirement')
  async processRequirement(@Body() data: { requirementId: string }) {
    return this.orchestratorService.processRequirement(data.requirementId);
  }

  @Get('status/:requirementId')
  async getProcessStatus(@Param('requirementId') requirementId: string) {
    return this.orchestratorService.getProcessStatus(requirementId);
  }

  @Post('execute-workflow')
  async executeWorkflow(@Body() data: { workflowId: string; params: any }) {
    return this.orchestratorService.executeWorkflow(data.workflowId, data.params);
  }
}
