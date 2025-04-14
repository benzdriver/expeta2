import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from '../orchestrator.service';
import { ClarifierService } from '../../clarifier/clarifier.service';
import { GeneratorService } from '../../generator/generator.service';
import { ValidatorService } from '../../validator/validator.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { WorkflowType } from '../dto/workflow.dto';

describe('OrchestratorService - Refactored', () => {
  let service: OrchestratorService;
  let clarifierService: ClarifierService;
  let generatorService: GeneratorService;
  let validatorService: ValidatorService;
  let memoryService: MemoryService;
  let semanticMediatorService: SemanticMediatorService;

  beforeEach(async () => {
    const mockClarifierService = {
      getRequirementById: jest.fn().mockResolvedValue({
        _id: 'req-123',
        title: 'Test Requirement',
        text: 'This is a test requirement',
        status: 'clarifying',
      }),
      getExpectationById: jest.fn().mockResolvedValue({
        _id: 'exp-456',
        requirementId: 'req-123',
        model: { key: 'value' },
      }),
    };

    const mockGeneratorService = {
      getCodeById: jest.fn().mockResolvedValue({
        _id: 'code-789',
        expectationId: 'exp-456',
        files: [{ path: 'test.js', content: 'console.log("test")' }],
      }),
    };

    const mockValidatorService = {
      getValidationById: jest.fn().mockResolvedValue({
        _id: 'val-123',
        codeId: 'code-789',
        expectationId: 'exp-456',
        score: 0.85,
        status: 'passed',
        details: [],
      }),
      getValidationsByCodeId: jest.fn().mockResolvedValue([
        {
          _id: 'val-123',
          codeId: 'code-789',
          expectationId: 'exp-456',
          score: 0.85,
          status: 'passed',
          details: [],
        },
      ]),
      validateCodeWithSemanticInput: jest.fn().mockResolvedValue({
        _id: 'val-124',
        codeId: 'code-789',
        expectationId: 'exp-456',
        score: 0.9,
        status: 'passed',
        details: [],
      }),
      validateWithAdaptiveContext: jest.fn().mockResolvedValue({
        _id: 'val-126',
        codeId: 'code-789',
        expectationId: 'exp-456',
        score: 0.92,
        status: 'passed',
        details: [],
      }),
      generateValidationFeedback: jest.fn().mockResolvedValue({
        validationId: 'val-126',
        feedback: 'Good job!',
        suggestions: ['Improve error handling'],
      }),
    };

    const mockMemoryService = {
      storeMemory: jest.fn().mockResolvedValue({
        _id: 'memory-id',
        type: MemoryType.SYSTEM,
        content: {
          workflowId: 'test-workflow-id',
          name: 'Test Workflow',
        },
      }),
      getMemoryByType: jest.fn().mockResolvedValue([
        {
          content: {
            _id: 'req-123',
            title: 'Test Requirement',
            text: 'This is a test requirement',
          },
        },
      ]),
      getRelatedMemories: jest.fn().mockResolvedValue([
        {
          content: {
            _id: 'memory-123',
            data: { key: 'related-value' },
          },
        },
      ]),
    };

    const mockSemanticMediatorService = {
      translateBetweenModules: jest.fn().mockResolvedValue({
        translated: true,
        data: { key: 'translated-value' },
      }),
      enrichWithContext: jest.fn().mockResolvedValue({
        enriched: true,
        data: { key: 'enriched-value' },
        _id: 'enriched-123',
      }),
      resolveSemanticConflicts: jest.fn().mockResolvedValue({
        resolved: true,
        data: { key: 'resolved-value' },
        resolvedConflicts: [
          { type: 'conflict1', resolution: 'resolved1' },
          { type: 'conflict2', resolution: 'resolved2' },
        ],
      }),
      extractSemanticInsights: jest.fn().mockResolvedValue({
        insights: true,
        data: { key: 'insights-value' },
      }),
      generateValidationContext: jest.fn().mockResolvedValue({
        strategy: 'balanced',
        focusAreas: ['functionality', 'security'],
        weights: { functionality: 1.0, security: 1.2 },
        semanticContext: { 
          codeFeatures: { complexity: 'medium' },
          expectationSummary: 'Test summary',
          validationHistory: { trend: 'improving' }
        },
      }),
      trackSemanticTransformation: jest.fn().mockResolvedValue({
        tracked: true,
        transformationId: 'transform-123',
        differences: { semanticPreservation: { preserved: ['key1'], changed: [] } },
        analysis: { completeness: 95, accuracy: 90 },
      }),
      evaluateSemanticTransformation: jest.fn().mockResolvedValue({
        semanticPreservation: 95,
        informationCompleteness: 90,
        contextRelevance: 85,
        totalQuality: 90,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: ClarifierService, useValue: mockClarifierService },
        { provide: GeneratorService, useValue: mockGeneratorService },
        { provide: ValidatorService, useValue: mockValidatorService },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: SemanticMediatorService, useValue: mockSemanticMediatorService },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
    clarifierService = module.get<ClarifierService>(ClarifierService);
    generatorService = module.get<GeneratorService>(GeneratorService);
    validatorService = module.get<ValidatorService>(ValidatorService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeWorkflow with enhanced semantic middleware', () => {
    it('should execute a semantic validation workflow with enhanced options', async () => {
      const workflowId = WorkflowType.SEMANTIC_VALIDATION;
      const params = { 
        expectationId: 'exp-456', 
        codeId: 'code-789',
        extractInsights: true,
        validationOptions: { strictMode: true }
      };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.validation).toBeDefined();
      expect(result.semanticResolution).toBeDefined();
      expect(result.semanticInsights).toBeDefined();
      expect(result.validationMetrics).toBeDefined();
      expect(result.validationMetrics.semanticConflictsResolved).toBe(2);
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(params.expectationId);
      expect(generatorService.getCodeById).toHaveBeenCalledWith(params.codeId);
      expect(semanticMediatorService.resolveSemanticConflicts).toHaveBeenCalled();
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalled();
      expect(validatorService.validateCodeWithSemanticInput).toHaveBeenCalled();
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should execute a semantic enrichment workflow with enhanced options', async () => {
      const workflowId = WorkflowType.SEMANTIC_ENRICHMENT;
      const params = { 
        moduleType: 'expectations', 
        dataId: 'exp-456', 
        contextQuery: 'test query',
        extractInsights: true,
        transformationOptions: {
          trackDifferences: true,
          analyzeTransformation: true
        }
      };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.originalData).toBeDefined();
      expect(result.enrichedData).toBeDefined();
      expect(result.transformationRecord).toBeDefined();
      expect(result.semanticInsights).toBeDefined();
      expect(result.transformationEvaluation).toBeDefined();
      expect(result.enrichmentMetrics).toBeDefined();
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(params.dataId);
      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalled();
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalled();
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalled();
      expect(semanticMediatorService.evaluateSemanticTransformation).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should execute an adaptive validation workflow with enhanced options', async () => {
      const workflowId = WorkflowType.ADAPTIVE_VALIDATION;
      const params = { 
        expectationId: 'exp-456', 
        codeId: 'code-789', 
        previousValidationId: 'val-123',
        adaptationStrategy: 'balanced',
        customWeights: { security: 1.5 },
        focusAreas: ['security'],
        semanticAnalysisOptions: {
          trackTransformation: true,
          trackDifferences: true,
          analyzeTransformation: true
        }
      };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.validation).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.adaptedContext).toBeDefined();
      expect(result.semanticInsights).toBeDefined();
      expect(result.validationMetrics).toBeDefined();
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(params.expectationId);
      expect(generatorService.getCodeById).toHaveBeenCalledWith(params.codeId);
      expect(validatorService.getValidationById).toHaveBeenCalledWith(params.previousValidationId);
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalledWith(
        params.expectationId,
        params.codeId,
        expect.any(Array),
        expect.objectContaining({
          strategy: params.adaptationStrategy,
          focusAreas: params.focusAreas,
          customWeights: params.customWeights
        })
      );
      expect(validatorService.validateWithAdaptiveContext).toHaveBeenCalled();
      expect(validatorService.generateValidationFeedback).toHaveBeenCalled();
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalled();
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });
  });
});
