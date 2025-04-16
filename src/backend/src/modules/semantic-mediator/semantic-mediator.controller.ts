import { Controller, Post, Get, Body, Param, Query, Delete, Logger } from '@nestjs/common';
import { SemanticMediatorService } from './semantic-mediator.service';
import { SemanticRegistryService } from './components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from './components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from './components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from './components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from './components/human-in-the-loop/human-in-the-loop.service';
import { SemanticDescriptor } from './interfaces/semantic-descriptor.interface';

interface TranslateDto {
  sourceModule: string;
  targetModule: string;
  data: unknown;
}

interface EnrichDto {
  module: string;
  data: unknown;
  contextQuery: string;
}

interface ResolveConflictsDto {
  moduleA: string;
  dataA: unknown;
  moduleB: string;
  dataB: unknown;
}

interface ExtractInsightsDto {
  data: unknown;
  query: string;
}

interface TrackTransformationDto {
  sourceModule: string;
  targetModule: string;
  sourceData: unknown;
  transformedData: unknown;
  options?: {
    trackDifferences?: boolean;
    analyzeTransformation?: boolean;
    saveToMemory?: boolean;
  };
}

interface EvaluateTransformationDto {
  sourceData: unknown;
  transformedData: unknown;
  expectedOutcome: string;
}

interface GenerateValidationContextDto {
  expectationId: string;
  codeId: string;
  previousValidations?: string[];
  options?: {
    focusAreas?: string[];
    strategy?: 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom';
    customWeights?: Record<string, number>;
  };
}

interface RegisterDataSourceDto {
  moduleId: string;
  semanticDescriptor: SemanticDescriptor;
  accessMethod: string; // 函数序列化为字符串
}

interface UpdateDataSourceDto {
  semanticDescriptor?: SemanticDescriptor;
  accessMethod?: string; // 函数序列化为字符串
}

interface FindSourcesDto {
  intent: unknown;
  threshold?: number;
}

interface StoreTransformationPathDto {
  sourceDescriptor: unknown;
  targetDescriptor: unknown;
  transformationPath: unknown;
  metadata?: unknown;
}

interface RetrieveTransformationPathDto {
  sourceDescriptor: unknown;
  targetDescriptor: unknown;
  similarityThreshold?: number;
}

interface LogTransformationEventDto {
  event: unknown;
}

interface LogErrorDto {
  error: Error;
  context?: unknown;
}

interface RequestHumanReviewDto {
  data: unknown;
  context?: unknown;
  timeout?: number;
}

interface SubmitHumanFeedbackDto {
  reviewId: string;
  feedback: unknown;
  metadata?: unknown;
}

@Controller('semantic-mediator')
export class SemanticMediatorController {
  private readonly logger = new Logger(SemanticMediatorController.name);

  constructor(
    private readonly semanticMediatorService: SemanticMediatorService,
    private readonly semanticRegistry: SemanticRegistryService,
    private readonly transformationEngine: TransformationEngineService,
    private readonly intelligentCache: IntelligentCacheService,
    private readonly monitoringSystem: MonitoringSystemService,
    private readonly humanInTheLoop: HumanInTheLoopService,
  ) {}

  @Post('translate')
  async translateBetweenModules(@Body() dto: TranslateDto) {
    this.logger.debug(`Translating data from ${dto.sourceModule} to ${dto.targetModule}`);
    const { sourceModule, targetModule, data } = dto;
    const result = await this.semanticMediatorService.translateBetweenModules(
      sourceModule,
      targetModule,
      data,
    );

    try {
      await this.semanticMediatorService.trackSemanticTransformation(
        sourceModule,
        targetModule,
        data,
        result,
      );
    } catch (error) {
      this.logger.warn(`Failed to track transformation: ${error.message}`);
    }

    return result;
  }

  @Post('enrich')
  async enrichWithContext(@Body() dto: EnrichDto) {
    this.logger.debug(
      `Enriching data for module ${dto.module} with context query: ${dto.contextQuery}`,
    );
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
    this.logger.debug(
      `Manually tracking transformation from ${dto.sourceModule} to ${dto.targetModule}`,
    );
    const { sourceModule, targetModule, sourceData, transformedData, options } = dto;

    const result = await this.semanticMediatorService.trackSemanticTransformation(
      sourceModule,
      targetModule,
      sourceData,
      transformedData,
      options,
    );

    return {
      success: true,
      message: 'Transformation tracked successfully',
      transformationId: result.transformationId,
      hasAnalysis: options?.analyzeTransformation !== false,
      hasDifferences: options?.trackDifferences !== false,
    };
  }

  @Post('evaluate-transformation')
  async evaluateSemanticTransformation(@Body() dto: EvaluateTransformationDto) {
    this.logger.debug(`Evaluating transformation quality`);
    const { sourceData, transformedData, expectedOutcome } = dto;
    return this.semanticMediatorService.evaluateSemanticTransformation(
      sourceData,
      transformedData,
      expectedOutcome,
    );
  }

  @Post('generate-validation-context')
  async generateValidationContext(@Body() dto: GenerateValidationContextDto) {
    this.logger.log(
      `Generating validation context for expectation: ${dto.expectationId}, code: ${dto.codeId}`,
    );
    const { expectationId, codeId, previousValidations = [], options = {} } = dto;

    return this.semanticMediatorService.generateValidationContext(
      expectationId,
      codeId,
      previousValidations,
      options,
    );
  }

  @Post('registry/data-sources')
  async registerDataSource(@Body() dto: RegisterDataSourceDto) {
    this.logger.debug(`Registering data source for module: ${dto.moduleId}`);
    const { moduleId, semanticDescriptor, accessMethod } = dto;

    const accessMethodFn = new Function(`return ${accessMethod}`)();

    const sourceId = await this.semanticRegistry.registerDataSource(
      moduleId,
      semanticDescriptor,
      accessMethodFn,
    );

    return {
      success: true,
      sourceId,
      message: 'Data source registered successfully',
    };
  }

  @Get('registry/data-sources')
  async getAllDataSources(@Query('moduleId') moduleId?: string) {
    this.logger.debug(`Getting all data sources${moduleId ? ` for module: ${moduleId}` : ''}`);
    return this.semanticRegistry.getAllDataSources(moduleId);
  }

  @Get('registry/data-sources/:sourceId')
  async getDataSource(@Param('sourceId') sourceId: string) {
    this.logger.debug(`Getting data source: ${sourceId}`);
    return this.semanticRegistry.getDataSource(sourceId);
  }

  @Post('registry/data-sources/:sourceId')
  async updateDataSource(@Param('sourceId') sourceId: string, @Body() dto: UpdateDataSourceDto) {
    this.logger.debug(`Updating data source: ${sourceId}`);

    let accessMethodFn;
    if (dto.accessMethod) {
      accessMethodFn = new Function(`return ${dto.accessMethod}`)();
    }

    const success = await this.semanticRegistry.updateDataSource(
      sourceId,
      dto.semanticDescriptor,
      accessMethodFn,
    );

    return {
      success,
      message: success ? 'Data source updated successfully' : 'Failed to update data source',
    };
  }

  @Delete('registry/data-sources/:sourceId')
  async removeDataSource(@Param('sourceId') sourceId: string) {
    this.logger.debug(`Removing data source: ${sourceId}`);
    const success = await this.semanticRegistry.removeDataSource(sourceId);

    return {
      success,
      message: success ? 'Data source removed successfully' : 'Failed to remove data source',
    };
  }

  @Post('registry/find-sources')
  async findPotentialSources(@Body() dto: FindSourcesDto) {
    this.logger.debug(`Finding potential sources for intent`);
    const { intent, threshold } = dto;
    const sources = await this.semanticRegistry.findPotentialSources(intent, threshold);

    return {
      success: true,
      sources,
      count: sources.length,
    };
  }

  @Get('transformation/strategies')
  async getTransformationStrategies() {
    this.logger.debug(`Getting available transformation strategies`);
    const strategies = await this.transformationEngine.getAvailableTransformationStrategies();

    return {
      success: true,
      strategies,
    };
  }

  @Post('transformation/generate-path')
  async generateTransformationPath(@Body() dto: unknown) {
    this.logger.debug(`Generating transformation path`);
    const { sourceDescriptor, targetDescriptor, context } = dto as any;

    const path = await this.transformationEngine.generateTransformationPath(
      sourceDescriptor,
      targetDescriptor,
      context,
    );

    return {
      success: true,
      path,
    };
  }

  @Post('transformation/execute')
  async executeTransformation(@Body() dto: unknown) {
    this.logger.debug(`Executing transformation`);
    const { data, transformationPath, context } = dto as any;

    const result = await this.transformationEngine.executeTransformation(
      data,
      transformationPath,
      context,
    );

    return {
      success: true,
      result,
    };
  }

  @Post('transformation/validate')
  async validateTransformation(@Body() dto: unknown) {
    this.logger.debug(`Validating transformation`);
    const { result, targetDescriptor, context } = dto as any;

    const validationResult = await this.transformationEngine.validateTransformation(
      result,
      targetDescriptor,
      context,
    );

    return {
      success: true,
      validationResult,
    };
  }

  @Post('cache/store')
  async storeTransformationPath(@Body() dto: StoreTransformationPathDto) {
    this.logger.debug(`Storing transformation path to cache`);
    const { sourceDescriptor, targetDescriptor, transformationPath, metadata } = dto;

    const pathId = await this.intelligentCache.storeTransformationPath(
      sourceDescriptor,
      targetDescriptor,
      transformationPath,
      metadata,
    );

    return {
      success: true,
      pathId,
    };
  }

  @Post('cache/retrieve')
  async retrieveTransformationPath(@Body() dto: RetrieveTransformationPathDto) {
    this.logger.debug(`Retrieving transformation path from cache`);
    const { sourceDescriptor, targetDescriptor, similarityThreshold } = dto;

    const path = await this.intelligentCache.retrieveTransformationPath(
      sourceDescriptor,
      targetDescriptor,
      similarityThreshold,
    );

    return {
      success: !!path,
      path,
    };
  }

  @Get('cache/most-used')
  async getMostUsedPaths(@Query('limit') limit?: string) {
    this.logger.debug(`Getting most used transformation paths`);
    const paths = await this.intelligentCache.getMostUsedPaths(limit ? parseInt(limit, 10) : undefined);

    return {
      success: true,
      paths,
      count: paths.length,
    };
  }

  @Get('cache/recently-used')
  async getRecentlyUsedPaths(@Query('limit') limit?: string) {
    this.logger.debug(`Getting recently used transformation paths`);
    const paths = await this.intelligentCache.getRecentlyUsedPaths(
      limit ? parseInt(limit, 10) : undefined,
    );

    return {
      success: true,
      paths,
      count: paths.length,
    };
  }

  @Post('cache/clear')
  async clearCache(@Body() dto: { olderThan?: string }) {
    this.logger.debug(`Clearing cache`);
    const olderThan = dto.olderThan ? new Date(dto.olderThan) : undefined;

    const count = await this.intelligentCache.clearCache(olderThan);

    return {
      success: true,
      clearedCount: count,
    };
  }

  @Get('cache/patterns')
  async analyzeUsagePatterns() {
    this.logger.debug(`Analyzing cache usage patterns`);
    const patterns = await this.intelligentCache.analyzeUsagePatterns();

    return {
      success: true,
      patterns,
    };
  }

  @Post('monitoring/events')
  async logTransformationEvent(@Body() dto: LogTransformationEventDto) {
    this.logger.debug(`Logging transformation event`);
    const eventId = await this.monitoringSystem.logTransformationEvent(dto.event);

    return {
      success: true,
      eventId,
    };
  }

  @Post('monitoring/errors')
  async logError(@Body() dto: LogErrorDto) {
    this.logger.debug(`Logging error`);
    const { error, context } = dto;

    const errorId = await this.monitoringSystem.logError(error, context);

    return {
      success: true,
      errorId,
    };
  }

  @Get('monitoring/transformation-history')
  async getTransformationHistory(
    @Query('filters') filters?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.debug(`Getting transformation history`);
    const parsedFilters = filters ? JSON.parse(filters) : undefined;

    const history = await this.monitoringSystem.getTransformationHistory(
      parsedFilters,
      limit ? parseInt(limit, 10) : undefined,
    );

    return {
      success: true,
      history,
      count: history.length,
    };
  }

  @Get('monitoring/error-history')
  async getErrorHistory(@Query('filters') filters?: string, @Query('limit') limit?: string) {
    this.logger.debug(`Getting error history`);
    const parsedFilters = filters ? JSON.parse(filters) : undefined;

    const history = await this.monitoringSystem.getErrorHistory(
      parsedFilters,
      limit ? parseInt(limit, 10) : undefined,
    );

    return {
      success: true,
      history,
      count: history.length,
    };
  }

  @Get('monitoring/performance')
  async getPerformanceReport(@Query('start') start?: string, @Query('end') end?: string) {
    this.logger.debug(`Getting performance report`);
    const timeRange =
      start && end
        ? {
            start: new Date(start),
            end: new Date(end),
          }
        : undefined;

    const report = await this.monitoringSystem.getPerformanceReport(timeRange);

    return {
      success: true,
      report,
    };
  }

  @Post('human-in-the-loop/review')
  async requestHumanReview(@Body() dto: RequestHumanReviewDto) {
    this.logger.debug(`Requesting human review`);
    const { data, context, timeout } = dto;

    const reviewId = await this.humanInTheLoop.requestHumanReview(data, context, timeout);

    return {
      success: true,
      reviewId,
    };
  }

  @Post('human-in-the-loop/feedback')
  async submitHumanFeedback(@Body() dto: SubmitHumanFeedbackDto) {
    this.logger.debug(`Submitting human feedback`);
    const { reviewId, feedback, metadata } = dto;

    const success = await this.humanInTheLoop.submitHumanFeedback(reviewId, feedback, metadata);

    return {
      success,
      message: success ? 'Feedback submitted successfully' : 'Failed to submit feedback',
    };
  }

  @Get('human-in-the-loop/reviews/:reviewId')
  async getReviewStatus(@Param('reviewId') reviewId: string) {
    this.logger.debug(`Getting review status: ${reviewId}`);
    const status = await this.humanInTheLoop.getReviewStatus(reviewId);

    return {
      success: true,
      status,
    };
  }

  @Get('human-in-the-loop/pending-reviews')
  async getPendingReviews(@Query('filters') filters?: string, @Query('limit') limit?: string) {
    this.logger.debug(`Getting pending reviews`);
    const parsedFilters = filters ? JSON.parse(filters) : undefined;

    const reviews = await this.humanInTheLoop.getPendingReviews(
      parsedFilters,
      limit ? parseInt(limit, 10) : undefined,
    );

    return {
      success: true,
      reviews,
      count: reviews.length,
    };
  }

  @Get('human-in-the-loop/feedback-history')
  async getFeedbackHistory(@Query('filters') filters?: string, @Query('limit') limit?: string) {
    this.logger.debug(`Getting feedback history`);
    const parsedFilters = filters ? JSON.parse(filters) : undefined;

    const history = await this.humanInTheLoop.getFeedbackHistory(
      parsedFilters,
      limit ? parseInt(limit, 10) : undefined,
    );

    return {
      success: true,
      history,
      count: history.length,
    };
  }

  @Get('human-in-the-loop/feedback-patterns')
  async analyzeFeedbackPatterns() {
    this.logger.debug(`Analyzing feedback patterns`);
    const patterns = await this.humanInTheLoop.analyzeFeedbackPatterns();

    return {
      success: true,
      patterns,
    };
  }
}
