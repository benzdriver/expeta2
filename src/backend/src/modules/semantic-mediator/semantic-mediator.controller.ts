import { Controller, Post, Body } from '@nestjs/common';
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

@Controller('semantic-mediator')
export class SemanticMediatorController {
  constructor(private readonly semanticMediatorService: SemanticMediatorService) {}

  @Post('translate')
  async translateBetweenModules(@Body() dto: TranslateDto) {
    const { sourceModule, targetModule, data } = dto;
    return this.semanticMediatorService.translateBetweenModules(sourceModule, targetModule, data);
  }

  @Post('enrich')
  async enrichWithContext(@Body() dto: EnrichDto) {
    const { module, data, contextQuery } = dto;
    return this.semanticMediatorService.enrichWithContext(module, data, contextQuery);
  }

  @Post('resolve-conflicts')
  async resolveSemanticConflicts(@Body() dto: ResolveConflictsDto) {
    const { moduleA, dataA, moduleB, dataB } = dto;
    return this.semanticMediatorService.resolveSemanticConflicts(moduleA, dataA, moduleB, dataB);
  }

  @Post('extract-insights')
  async extractSemanticInsights(@Body() dto: ExtractInsightsDto) {
    const { data, query } = dto;
    return this.semanticMediatorService.extractSemanticInsights(data, query);
  }
}
