import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { GeneratorService } from './generator.service';

@Controller('generator')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Post('generate')
  async generateCode(@Body() data: { expectationId: string }) {
    return this.generatorService.generateCode(data.expectationId);
  }

  @Get('code/:expectationId')
  async getCodeByExpectationId(@Param('expectationId') expectationId: string) {
    return this.generatorService.getCodeByExpectationId(expectationId);
  }

  @Get('code/:id/files')
  async getCodeFiles(@Param('id') id: string) {
    return this.generatorService.getCodeFiles(id);
  }

  @Put('code/:id/approve')
  async approveCode(@Param('id') id: string) {
    return this.generatorService.approveCode(id);
  }
}
