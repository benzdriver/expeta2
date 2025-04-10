import { Controller, Post, Body, Get, Param, Put, Logger } from '@nestjs/common';
import { GeneratorService } from './generator.service';
import { 
  GenerateCodeWithSemanticInputDto, 
  OptimizeCodeDto,
  GenerateProjectStructureDto,
  GenerateCodeWithArchitectureDto,
  GenerateTestSuiteDto,
  RefactorCodeDto
} from './dto';

@Controller('generator')
export class GeneratorController {
  private readonly logger = new Logger(GeneratorController.name);
  
  constructor(private readonly generatorService: GeneratorService) {}

  @Post('generate')
  async generateCode(@Body() data: { expectationId: string }) {
    this.logger.log(`Received request to generate code for expectation: ${data.expectationId}`);
    return this.generatorService.generateCode(data.expectationId);
  }

  @Post('generate-with-semantic')
  async generateCodeWithSemanticInput(@Body() data: GenerateCodeWithSemanticInputDto) {
    this.logger.log(`Received request to generate code with semantic input for expectation: ${data.expectationId}`);
    return this.generatorService.generateCodeWithSemanticInput(
      data.expectationId,
      data.semanticAnalysis,
      data.options
    );
  }

  @Post('optimize')
  async optimizeCode(@Body() data: OptimizeCodeDto) {
    this.logger.log(`Received request to optimize code: ${data.codeId}`);
    return this.generatorService.optimizeCode(
      data.codeId,
      data.semanticFeedback
    );
  }

  @Post('project-structure')
  async generateProjectStructure(@Body() data: GenerateProjectStructureDto) {
    this.logger.log(`Received request to generate project structure for expectation: ${data.expectationId}`);
    return this.generatorService.generateProjectStructure(
      data.expectationId,
      data.techStack,
      data.options
    );
  }

  @Post('generate-with-architecture')
  async generateCodeWithArchitecture(@Body() data: GenerateCodeWithArchitectureDto) {
    this.logger.log(`Received request to generate code with architecture for expectation: ${data.expectationId}`);
    return this.generatorService.generateCodeWithArchitecture(
      data.expectationId,
      data.architectureGuide,
      data.technicalRequirements
    );
  }

  @Post('test-suite')
  async generateTestSuite(@Body() data: GenerateTestSuiteDto) {
    this.logger.log(`Received request to generate test suite for code: ${data.codeId}`);
    return this.generatorService.generateTestSuite(
      data.codeId,
      data.testRequirements
    );
  }

  @Post('refactor')
  async refactorCode(@Body() data: RefactorCodeDto) {
    this.logger.log(`Received request to refactor code: ${data.codeId}`);
    return this.generatorService.refactorCode(
      data.codeId,
      data.refactoringGoals
    );
  }

  @Get('code/:expectationId')
  async getCodeByExpectationId(@Param('expectationId') expectationId: string) {
    this.logger.debug(`Fetching code for expectation: ${expectationId}`);
    return this.generatorService.getCodeByExpectationId(expectationId);
  }

  @Get('code/:id')
  async getCodeById(@Param('id') id: string) {
    this.logger.debug(`Fetching code by ID: ${id}`);
    return this.generatorService.getCodeById(id);
  }

  @Get('code/:id/files')
  async getCodeFiles(@Param('id') id: string) {
    this.logger.debug(`Fetching files for code: ${id}`);
    return this.generatorService.getCodeFiles(id);
  }

  @Put('code/:id/approve')
  async approveCode(@Param('id') id: string) {
    this.logger.log(`Approving code: ${id}`);
    return this.generatorService.approveCode(id);
  }
}
