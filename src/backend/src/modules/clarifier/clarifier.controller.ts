import { Controller, Post, Body, Get, Param, Put, Delete, Logger } from '@nestjs/common';
import { ClarifierService } from './clarifier.service';
import { CreateRequirementDto, UpdateRequirementDto, ClarificationQuestionDto } from './dto';

@Controller('clarifier')
export class ClarifierController {
  private readonly logger = new Logger(ClarifierController.name);

  constructor(private readonly clarifierService: ClarifierService) {}

  @Post('requirements')
  async createRequirement(@Body() createRequirementDto: CreateRequirementDto) {
    this.logger.log(`Creating new requirement: ${createRequirementDto.title}`);
    return this.clarifierService.createRequirement(createRequirementDto);
  }

  @Get('requirements')
  async getAllRequirements() {
    this.logger.debug('Fetching all requirements');
    return this.clarifierService.getAllRequirements();
  }

  @Get('requirements/:id')
  async getRequirementById(@Param('id') id: string) {
    this.logger.debug(`Fetching requirement by ID: ${id}`);
    return this.clarifierService.getRequirementById(id);
  }

  @Put('requirements/:id')
  async updateRequirement(
    @Param('id') id: string,
    @Body() updateRequirementDto: UpdateRequirementDto,
  ) {
    this.logger.log(`Updating requirement: ${id}`);
    return this.clarifierService.updateRequirement(id, updateRequirementDto);
  }

  @Delete('requirements/:id')
  async deleteRequirement(@Param('id') id: string) {
    this.logger.log(`Deleting requirement: ${id}`);
    return this.clarifierService.deleteRequirement(id);
  }

  @Post('clarify')
  async generateClarificationQuestions(@Body() requirement: { text: string }) {
    this.logger.log(`Generating clarification questions for requirement text`);
    return this.clarifierService.generateClarificationQuestions(requirement.text);
  }

  @Post('answer')
  async processClarificationAnswer(
    @Body() answer: { requirementId: string; questionId: string; answer: string },
  ) {
    this.logger.log(
      `Processing clarification answer for requirement: ${answer.requirementId}, question: ${answer.questionId}`,
    );
    return this.clarifierService.processClarificationAnswer(
      answer.requirementId,
      answer.questionId,
      answer.answer,
    );
  }

  @Post('generate-expectations')
  async generateExpectations(@Body() data: { requirementId: string }) {
    this.logger.log(`Generating expectations for requirement: ${data.requirementId}`);
    return this.clarifierService.generateExpectations(data.requirementId);
  }

  @Get('expectations/:requirementId')
  async getExpectations(@Param('requirementId') requirementId: string) {
    this.logger.debug(`Fetching expectations for requirement: ${requirementId}`);
    return this.clarifierService.getExpectations(requirementId);
  }

  @Get('expectations/by-id/:id')
  async getExpectationById(@Param('id') id: string) {
    this.logger.debug(`Fetching expectation by ID: ${id}`);
    return this.clarifierService.getExpectationById(id);
  }

  @Post('analyze-progress')
  async analyzeClarificationProgress(@Body() data: { requirementId: string }) {
    this.logger.log(`Analyzing clarification progress for requirement: ${data.requirementId}`);
    return this.clarifierService.analyzeClarificationProgress(data.requirementId);
  }

  @Post('analyze-dialogue')
  async analyzeMultiRoundDialogue(@Body() data: { requirementId: string }) {
    this.logger.log(`Analyzing multi-round dialogue for requirement: ${data.requirementId}`);
    return this.clarifierService.analyzeMultiRoundDialogue(data.requirementId);
  }

  @Post('expectation-summary/:id')
  async generateExpectationSummary(@Param('id') id: string) {
    this.logger.log(`Generating expectation summary for expectation: ${id}`);
    return this.clarifierService.generateExpectationSummary(id);
  }

  @Post('log-dialogue')
  async logDialogue(@Body() data: { requirementId: string; message: unknown }) {
    this.logger.debug(`Logging dialogue message for requirement: ${data.requirementId}`);
    await this.clarifierService.logDialogue(data.requirementId, data.message);
    return { success: true };
  }
}
