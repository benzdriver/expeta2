import { Controller, Post, Body, Get, Param, Put, Delete } from '@nestjs/common';
import { ClarifierService } from './clarifier.service';
import { CreateRequirementDto, UpdateRequirementDto, ClarificationQuestionDto } from './dto';

@Controller('clarifier')
export class ClarifierController {
  constructor(private readonly clarifierService: ClarifierService) {}

  @Post('requirements')
  async createRequirement(@Body() createRequirementDto: CreateRequirementDto) {
    return this.clarifierService.createRequirement(createRequirementDto);
  }

  @Get('requirements')
  async getAllRequirements() {
    return this.clarifierService.getAllRequirements();
  }

  @Get('requirements/:id')
  async getRequirementById(@Param('id') id: string) {
    return this.clarifierService.getRequirementById(id);
  }

  @Put('requirements/:id')
  async updateRequirement(
    @Param('id') id: string,
    @Body() updateRequirementDto: UpdateRequirementDto,
  ) {
    return this.clarifierService.updateRequirement(id, updateRequirementDto);
  }

  @Delete('requirements/:id')
  async deleteRequirement(@Param('id') id: string) {
    return this.clarifierService.deleteRequirement(id);
  }

  @Post('clarify')
  async generateClarificationQuestions(@Body() requirement: { text: string }) {
    return this.clarifierService.generateClarificationQuestions(requirement.text);
  }

  @Post('answer')
  async processClarificationAnswer(@Body() answer: { requirementId: string; questionId: string; answer: string }) {
    return this.clarifierService.processClarificationAnswer(
      answer.requirementId,
      answer.questionId,
      answer.answer,
    );
  }

  @Post('generate-expectations')
  async generateExpectations(@Body() data: { requirementId: string }) {
    return this.clarifierService.generateExpectations(data.requirementId);
  }

  @Get('expectations/:requirementId')
  async getExpectations(@Param('requirementId') requirementId: string) {
    return this.clarifierService.getExpectations(requirementId);
  }
}
