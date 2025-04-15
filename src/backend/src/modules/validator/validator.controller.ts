import { Controller, Post, Body, Get, Param, Logger } from '@nestjs/common';
import { ValidatorService } from './validator.service';

interface ValidateWithSemanticInputDto {
  expectationId: string;
  codeId: string;
  semanticInput: {
    semanticContext?: string;
    focusAreas?: string[];
    [key: string]: unknown;
  };
}

interface ValidateIterativelyDto {
  expectationId: string;
  codeId: string;
  previousValidationId: string;
  iterationFocus?: string[];
}

interface ValidateWithAdaptiveContextDto {
  expectationId: string;
  codeId: string;
  validationContext: {
    strategy: string;
    focusAreas?: string[];
    weights?: Record<string, number>;
    previousValidations?: string[];
    semanticContext?: Record<string, unknown>;
  };
}

@Controller('validator')
export class ValidatorController {
  private readonly logger = new Logger(ValidatorController.name);

  constructor(private readonly validatorService: ValidatorService) {}

  @Post('validate')
  async validateCode(@Body() data: { expectationId: string; codeId: string }) {
    this.logger.log(`Validating code - expectation: ${data.expectationId}, code: ${data.codeId}`);
    return this.validatorService.validateCode(data.expectationId, data.codeId);
  }

  @Post('validate-with-semantic')
  async validateCodeWithSemanticInput(@Body() data: ValidateWithSemanticInputDto) {
    this.logger.log(
      `Validating code with semantic input - expectation: ${data.expectationId}, code: ${data.codeId}`,
    );
    return this.validatorService.validateCodeWithSemanticInput(
      data.expectationId,
      data.codeId,
      data.semanticInput,
    );
  }

  @Post('validate-iteratively')
  async validateCodeIteratively(@Body() data: ValidateIterativelyDto) {
    this.logger.log(
      `Validating code iteratively - expectation: ${data.expectationId}, code: ${data.codeId}, previous: ${data.previousValidationId}`,
    );
    return this.validatorService.validateCodeIteratively(
      data.expectationId,
      data.codeId,
      data.previousValidationId,
      data.iterationFocus,
    );
  }

  @Post('generate-feedback/:validationId')
  async generateValidationFeedback(@Param('validationId') validationId: string) {
    this.logger.log(`Generating validation feedback for validation: ${validationId}`);
    return this.validatorService.generateValidationFeedback(validationId);
  }

  @Get('validations/:expectationId')
  async getValidationsByExpectationId(@Param('expectationId') expectationId: string) {
    this.logger.debug(`Fetching validations for expectation: ${expectationId}`);
    return this.validatorService.getValidationsByExpectationId(expectationId);
  }

  @Get('validations/code/:codeId')
  async getValidationsByCodeId(@Param('codeId') codeId: string) {
    this.logger.debug(`Fetching validations for code: ${codeId}`);
    return this.validatorService.getValidationsByCodeId(codeId);
  }

  @Get('validation/:id')
  async getValidationById(@Param('id') id: string) {
    this.logger.debug(`Fetching validation by ID: ${id}`);
    return this.validatorService.getValidationById(id);
  }

  @Post('validate-with-adaptive-context')
  async validateWithAdaptiveContext(@Body() data: ValidateWithAdaptiveContextDto) {
    this.logger.log(
      `Validating with adaptive context - expectation: ${data.expectationId}, code: ${data.codeId}`,
    );
    return this.validatorService.validateWithAdaptiveContext(
      data.expectationId,
      data.codeId,
      data.validationContext,
    );
  }
}
