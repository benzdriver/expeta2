import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from '../orchestrator.service';
import { ClarifierService } from '../../clarifier/clarifier.service';
import { GeneratorService } from '../../generator/generator.service';
import { ValidatorService } from '../../validator/validator.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { WorkflowType } from '../dto/workflow.dto';

describe('OrchestratorService', () => {
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
      analyzeClarificationProgress: jest.fn().mockResolvedValue({
        needMoreClarification: false,
        summary: 'Requirement is clear',
        suggestedQuestions: [],
      }),
      getExpectations: jest.fn().mockResolvedValue({
        _id: 'exp-456',
        requirementId: 'req-123',
        model: { key: 'value' },
      }),
      generateExpectations: jest.fn().mockResolvedValue({
        _id: 'exp-456',
        requirementId: 'req-123',
        model: { key: 'value' },
      }),
      getExpectationById: jest.fn().mockResolvedValue({
        _id: 'exp-456',
        requirementId: 'req-123',
        model: { key: 'value' },
      }),
    };

    const mockGeneratorService = {
      getCodeByExpectationId: jest.fn().mockResolvedValue([
        {
          _id: 'code-789',
          expectationId: 'exp-456',
          files: [{ path: 'test.js', content: 'console.log("test")' }],
        },
      ]),
      generateCode: jest.fn().mockResolvedValue({
        _id: 'code-789',
        expectationId: 'exp-456',
        files: [{ path: 'test.js', content: 'console.log("test")' }],
      }),
      getCodeById: jest.fn().mockResolvedValue({
        _id: 'code-789',
        expectationId: 'exp-456',
        files: [{ path: 'test.js', content: 'console.log("test")' }],
      }),
      generateCodeWithSemanticInput: jest.fn().mockResolvedValue({
        _id: 'code-790',
        expectationId: 'exp-456',
        files: [{ path: 'test.js', content: 'console.log("improved")' }],
      }),
    };

    const mockValidatorService = {
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
      validateCode: jest.fn().mockResolvedValue({
        _id: 'val-123',
        codeId: 'code-789',
        expectationId: 'exp-456',
        score: 0.85,
        status: 'passed',
        details: [],
      }),
      getValidationById: jest.fn().mockResolvedValue({
        _id: 'val-123',
        codeId: 'code-789',
        expectationId: 'exp-456',
        score: 0.85,
        status: 'passed',
        details: [],
      }),
      validateCodeWithSemanticInput: jest.fn().mockResolvedValue({
        _id: 'val-124',
        codeId: 'code-789',
        expectationId: 'exp-456',
        score: 0.9,
        status: 'passed',
        details: [],
      }),
      validateCodeIteratively: jest.fn().mockResolvedValue({
        _id: 'val-125',
        codeId: 'code-789',
        expectationId: 'exp-456',
        score: 0.95,
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
    };

    const mockSemanticMediatorService = {
      translateBetweenModules: jest.fn().mockResolvedValue({
        translated: true,
        data: { key: 'translated-value' },
      }),
      enrichWithContext: jest.fn().mockResolvedValue({
        enriched: true,
        data: { key: 'enriched-value' },
      }),
      resolveSemanticConflicts: jest.fn().mockResolvedValue({
        resolved: true,
        data: { key: 'resolved-value' },
      }),
      generateValidationContext: jest.fn().mockResolvedValue({
        strategy: 'balanced',
        focusAreas: ['functionality', 'security'],
        weights: { functionality: 1.0, security: 1.2 },
        semanticAnalysis: { key: 'analysis-value' },
      }),
      trackSemanticTransformation: jest.fn().mockResolvedValue({
        tracked: true,
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

  describe('processRequirement', () => {
    it('should process a requirement in clarifying status', async () => {
      const requirementId = 'req-123';

      const result = await service.processRequirement(requirementId);

      expect(result).toBeDefined();
      expect(result.status).toBe('ready_for_expectations');
      expect(clarifierService.getRequirementById).toHaveBeenCalledWith(requirementId);
      expect(clarifierService.analyzeClarificationProgress).toHaveBeenCalledWith(requirementId);
    });

    it('should throw an error if requirement is not found', async () => {
      jest.spyOn(clarifierService, 'getRequirementById').mockResolvedValueOnce(null);

      const requirementId = 'non-existent-id';

      await expect(service.processRequirement(requirementId)).rejects.toThrow(
        'Requirement not found'
      );
    });
  });

  describe('getProcessStatus', () => {
    it('should return the status of the process', async () => {
      const requirementId = 'req-123';

      const result = await service.getProcessStatus(requirementId);

      expect(result).toBeDefined();
      expect(result.requirement).toBeDefined();
      expect(result.expectations).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(clarifierService.getRequirementById).toHaveBeenCalledWith(requirementId);
      expect(clarifierService.getExpectations).toHaveBeenCalledWith(requirementId);
      expect(generatorService.getCodeByExpectationId).toHaveBeenCalled();
      expect(validatorService.getValidationsByCodeId).toHaveBeenCalled();
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a full process workflow', async () => {
      const workflowId = WorkflowType.FULL_PROCESS;
      const params = { requirementId: 'req-123' };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.requirement).toBeDefined();
      expect(result.expectations).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(clarifierService.getRequirementById).toHaveBeenCalledWith(params.requirementId);
      expect(clarifierService.generateExpectations).toHaveBeenCalledWith(params.requirementId);
      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalled();
      expect(generatorService.generateCode).toHaveBeenCalled();
      expect(validatorService.validateCode).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should execute a regenerate code workflow', async () => {
      const workflowId = WorkflowType.REGENERATE_CODE;
      const params = { expectationId: 'exp-456' };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.code).toBeDefined();
      expect(generatorService.generateCode).toHaveBeenCalledWith(params.expectationId);
    });

    it('should execute a semantic validation workflow', async () => {
      const workflowId = WorkflowType.SEMANTIC_VALIDATION;
      const params = { expectationId: 'exp-456', codeId: 'code-789' };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.validation).toBeDefined();
      expect(result.semanticResolution).toBeDefined();
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(params.expectationId);
      expect(generatorService.getCodeById).toHaveBeenCalledWith(params.codeId);
      expect(semanticMediatorService.resolveSemanticConflicts).toHaveBeenCalled();
      expect(validatorService.validateCodeWithSemanticInput).toHaveBeenCalled();
    });

    it('should execute a semantic enrichment workflow', async () => {
      const workflowId = WorkflowType.SEMANTIC_ENRICHMENT;
      const params = { moduleType: 'expectations', dataId: 'exp-456', contextQuery: 'test query' };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.originalData).toBeDefined();
      expect(result.enrichedData).toBeDefined();
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(params.dataId);
      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalled();
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalled();
    });

    it('should execute an iterative refinement workflow', async () => {
      const workflowId = WorkflowType.ITERATIVE_REFINEMENT;
      const params = { expectationId: 'exp-456', codeId: 'code-789', maxIterations: 2 };

      // Mock validatorService.validateCode to return a score below threshold first, then above
      jest.spyOn(validatorService, 'validateCode')
        .mockResolvedValueOnce({
          _id: 'val-123',
          codeId: 'code-789',
          expectationId: 'exp-456',
          score: 0.7,
          status: 'partial',
          details: [{ 
            expectationId: 'exp-456-sub', 
            status: 'failed', 
            score: 0.7, 
            message: 'Test issue',
            semanticInsights: 'Needs improvement'
          }],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        } as any)
        .mockResolvedValueOnce({
          _id: 'val-124',
          codeId: 'code-790',
          expectationId: 'exp-456',
          score: 0.95,
          status: 'passed',
          details: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        } as any);

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.initialCode).toBeDefined();
      expect(result.finalCode).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.iterations).toBeDefined();
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(params.expectationId);
      expect(generatorService.getCodeById).toHaveBeenCalledWith(params.codeId);
      expect(validatorService.validateCode).toHaveBeenCalled();
      expect(semanticMediatorService.resolveSemanticConflicts).toHaveBeenCalled();
      expect(generatorService.generateCodeWithSemanticInput).toHaveBeenCalled();
    });

    it('should execute a parallel validation workflow', async () => {
      const workflowId = WorkflowType.PARALLEL_VALIDATION;
      const params = { expectationId: 'exp-456', codeIds: ['code-789', 'code-790'] };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.results).toBeDefined();
      expect(result.bestResult).toBeDefined();
      expect(validatorService.validateCode).toHaveBeenCalledTimes(params.codeIds.length);
    });

    it('should execute an adaptive validation workflow', async () => {
      const workflowId = WorkflowType.ADAPTIVE_VALIDATION;
      const params = { 
        expectationId: 'exp-456', 
        codeId: 'code-789', 
        previousValidationId: 'val-123',
        adaptationStrategy: 'balanced'
      };

      const result = await service.executeWorkflow(workflowId, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.validation).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.adaptedContext).toBeDefined();
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(params.expectationId);
      expect(generatorService.getCodeById).toHaveBeenCalledWith(params.codeId);
      expect(validatorService.getValidationById).toHaveBeenCalledWith(params.previousValidationId);
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalled();
      expect(validatorService.validateWithAdaptiveContext).toHaveBeenCalled();
      expect(validatorService.generateValidationFeedback).toHaveBeenCalled();
    });

    it('should throw an error for unknown workflow type', async () => {
      const workflowId = 'unknown-workflow';
      const params = {};

      await expect(service.executeWorkflow(workflowId, params)).rejects.toThrow(
        `Unknown workflow: ${workflowId}`
      );
    });
  });

  describe('createCustomWorkflow', () => {
    it('should create a custom workflow', async () => {
      const customWorkflowDto = {
        name: 'Custom Workflow',
        steps: [
          {
            moduleId: 'clarifier',
            operation: 'generateExpectations',
            inputMapping: { requirementId: 'req-123' },
            outputMapping: { expectationId: 'output.expectationId' }
          }
        ]
      };

      const result = await service.createCustomWorkflow(customWorkflowDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Custom Workflow');
      expect(result.steps).toHaveLength(1);
    });
  });

  describe('getCustomWorkflows', () => {
    it('should return all custom workflows', async () => {
      const result = await service.getCustomWorkflows();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return the status of a workflow execution', async () => {
      const executionId = 'exec-123';

      const result = await service.getWorkflowStatus(executionId);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe('cancelWorkflow', () => {
    it('should cancel a workflow execution', async () => {
      const executionId = 'exec-123';

      const result = await service.cancelWorkflow(executionId);

      expect(result).toBeDefined();
      expect(result.status).toBe('cancelled');
    });
  });
});
