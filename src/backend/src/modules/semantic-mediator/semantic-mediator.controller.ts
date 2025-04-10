import { Controller, Post, Body, Logger } from '@nestjs/common';
import { SemanticMediatorService } from './semantic-mediator.service';

interface TranslateDto {
  sourceModule: string;
  targetModule: string;
  data: any;
}

interface EnrichDto {
  module: string;
  data: any;
  contextQuery: string;
}

interface ResolveConflictsDto {
  moduleA: string;
  dataA: any;
  moduleB: string;
  dataB: any;
}

interface ExtractInsightsDto {
  data: any;
  query: string;
}

interface TrackTransformationDto {
  sourceModule: string;
  targetModule: string;
  sourceData: any;
  transformedData: any;
}

interface EvaluateTransformationDto {
  sourceData: any;
  transformedData: any;
  expectedOutcome: string;
}

@Controller('semantic-mediator')
export class SemanticMediatorController {
  private readonly logger = new Logger(SemanticMediatorController.name);

  constructor(private readonly semanticMediatorService: SemanticMediatorService) {}

  @Post('translate')
  async translateBetweenModules(@Body() dto: TranslateDto) {
    this.logger.debug(`Translating data from ${dto.sourceModule} to ${dto.targetModule}`);
    const { sourceModule, targetModule, data } = dto;
    const result = await this.semanticMediatorService.translateBetweenModules(sourceModule, targetModule, data);
    
    try {
      await this.semanticMediatorService.trackSemanticTransformation(
        sourceModule, 
        targetModule, 
        data, 
        result
      );
    } catch (error) {
      this.logger.warn(`Failed to track transformation: ${error.message}`);
    }
    
    return result;
  }

  @Post('enrich')
  async enrichWithContext(@Body() dto: EnrichDto) {
    this.logger.debug(`Enriching data for module ${dto.module} with context query: ${dto.contextQuery}`);
    const { module, data, contextQuery } = dto;
    return this.semanticMediatorService.enrichWithContext(module, data, contextQuery);
  }

  @Post('resolve-conflicts')
  async resolveSemanticConflicts(@Body() dto: ResolveConflictsDto) {
    this.logger.debug(`Resolving conflicts between ${dto.moduleA} and ${dto.moduleB}`);
    const { moduleA, dataA, moduleB, dataB } = dto;
    return this.semanticMediatorService.resolveSemanticConflicts(moduleA, dataA, moduleB, dataB);
  }

  @Post('extract-insights')
  async extractSemanticInsights(@Body() dto: ExtractInsightsDto) {
    this.logger.debug(`Extracting insights with query: ${dto.query}`);
    const { data, query } = dto;
    return this.semanticMediatorService.extractSemanticInsights(data, query);
  }

  @Post('track-transformation')
  async trackSemanticTransformation(@Body() dto: TrackTransformationDto) {
    this.logger.debug(`Manually tracking transformation from ${dto.sourceModule} to ${dto.targetModule}`);
    const { sourceModule, targetModule, sourceData, transformedData } = dto;
    await this.semanticMediatorService.trackSemanticTransformation(
      sourceModule, 
      targetModule, 
      sourceData, 
      transformedData
    );
    return { success: true, message: 'Transformation tracked successfully' };
  }

  @Post('evaluate-transformation')
  async evaluateSemanticTransformation(@Body() dto: EvaluateTransformationDto) {
    this.logger.debug(`Evaluating transformation quality`);
    const { sourceData, transformedData, expectedOutcome } = dto;
    return this.semanticMediatorService.evaluateSemanticTransformation(
      sourceData,
      transformedData,
      expectedOutcome
    );
  }
}
