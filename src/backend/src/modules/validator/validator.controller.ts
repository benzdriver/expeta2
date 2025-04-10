import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ValidatorService } from './validator.service';

@Controller('validator')
export class ValidatorController {
  constructor(private readonly validatorService: ValidatorService) {}

  @Post('validate')
  async validateCode(@Body() data: { expectationId: string; codeId: string }) {
    return this.validatorService.validateCode(data.expectationId, data.codeId);
  }

  @Get('validations/:expectationId')
  async getValidationsByExpectationId(@Param('expectationId') expectationId: string) {
    return this.validatorService.getValidationsByExpectationId(expectationId);
  }

  @Get('validations/code/:codeId')
  async getValidationsByCodeId(@Param('codeId') codeId: string) {
    return this.validatorService.getValidationsByCodeId(codeId);
  }

  @Get('validation/:id')
  async getValidationById(@Param('id') id: string) {
    return this.validatorService.getValidationById(id);
  }
}
