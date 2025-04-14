import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from '../orchestrator.service';
import { ClarifierService } from '../../clarifier/clarifier.service';
import { GeneratorService } from '../../generator/generator.service';
import { ValidatorService } from '../../validator/validator.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { WorkflowType } from '../dto/workflow.dto';

describe('Orchestrator-SemanticMediator Integration', () => {
  let orchestratorService: OrchestratorService;
  let clarifierService: ClarifierService;
  let generatorService: GeneratorService;
  let validatorService: ValidatorService;
  let memoryService: MemoryService;
  let semanticMediatorService: SemanticMediatorService;
  
  const expectationId = 'exp-123';
  const codeId = 'code-456';
  const previousValidationId = 'val-789';
  
  const mockExpectation = {
    _id: expectationId,
    requirementId: 'req-123',
    model: {
      requirements: ['Build a web application with user authentication'],
      constraints: ['Use TypeScript and React'],
      preferences: ['Clean code', 'Good documentation'],
      functionalComponents: [
        { name: 'Authentication', description: 'User login and registration' },
        { name: 'Dashboard', description: 'User dashboard with analytics' }
      ]
    },
    metadata: {
      version: '1.0',
      status: 'active'
    }
  };
  
  const mockCode = {
    _id: codeId,
    expectationId: expectationId,
    files: [
      {
        path: 'src/auth/auth.service.ts',
        content: 'export class AuthService { /* implementation */ }',
        language: 'typescript'
      },
      {
        path: 'src/dashboard/dashboard.component.tsx',
        content: 'export const Dashboard = () => { /* implementation */ }',
        language: 'typescript'
      }
    ],
    metadata: {
      version: '1.0',
      status: 'generated'
    }
  };
  
  const mockValidation = {
    _id: previousValidationId,
    expectationId: expectationId,
    codeId: codeId,
    score: 0.85,
    status: 'passed',
    details: [
      { category: 'functionality', score: 0.9, comments: 'Authentication works well' },
      { category: 'security', score: 0.8, comments: 'Some security improvements needed' }
    ],
    metadata: {
      version: '1.0',
      validationType: 'semantic'
    }
  };
  
  const mockSemanticResolution = {
    resolved: true,
    resolvedConflicts: [
      { type: 'missing_feature', resolution: 'Added feature implementation' },
      { type: 'security_issue', resolution: 'Fixed security vulnerability' }
    ],
    semanticMapping: {
      expectations: ['Authentication', 'Dashboard'],
      implementations: ['AuthService', 'Dashboard']
    }
  };
  
  const mockSemanticInsights = {
    insights: [
      'Authentication implementation follows best practices',
      'Dashboard component needs better state management'
    ],
    categories: {
      strengths: ['Authentication', 'API integration'],
      weaknesses: ['State management', 'Error handling']
    },
    recommendations: [
      'Improve error handling in authentication flow',
      'Add loading states to dashboard components'
    ]
  };
  
  const mockValidationContext = {
    strategy: 'balanced',
    focusAreas: ['security', 'performance'],
    weights: { security: 1.2, performance: 1.1, functionality: 1.0 },
    semanticContext: {
      previousIssues: ['Security vulnerabilities', 'Performance bottlenecks'],
      expectationSummary: 'Web application with authentication and dashboard',
      codeAnalysis: 'TypeScript React application with authentication services'
    }
  };
  
  const mockTransformationRecord = {
    transformationId: 'transform-123',
    sourceModule: 'expectations',
    targetModule: 'code',
    differences: {
      added: ['Error handling'],
      removed: ['Advanced analytics'],
      modified: ['Authentication flow']
    },
    analysis: {
      completeness: 90,
      accuracy: 85,
      semanticPreservation: 92
    }
  };
  
  const mockTransformationEvaluation = {
    semanticPreservation: 92,
    informationCompleteness: 90,
    contextRelevance: 88,
    totalQuality: 90
  };

  beforeEach(async () => {
    const mockClarifierService = {
      getRequirementById: jest.fn().mockResolvedValue({
        _id: 'req-123',
        title: 'Web Application',
        text: 'Build a web application with user authentication and dashboard',
        status: 'active'
      }),
      getExpectationById: jest.fn().mockResolvedValue(mockExpectation),
      generateExpectations: jest.fn(),
      getExpectations: jest.fn(),
    };

    const mockGeneratorService = {
      generateCode: jest.fn(),
      generateCodeWithSemanticInput: jest.fn(),
      getCodeById: jest.fn().mockResolvedValue(mockCode),
      getCodeByExpectationId: jest.fn(),
    };

    const mockValidatorService = {
      llmService: {
        generateContent: jest.fn().mockResolvedValue(JSON.stringify({
          content: 'Mock validation result',
          model: 'mock-model',
        })),
        analyzeContent: jest.fn().mockResolvedValue({
          analysis: 'Mock analysis result',
          relevance: 0.85,
          insights: ['Mock insight 1', 'Mock insight 2'],
        })
      },
      validateCode: jest.fn(),
      validateCodeWithSemanticInput: jest.fn().mockResolvedValue({
        ...mockValidation,
        _id: 'val-new-123',
        score: 0.9
      }),
      validateWithAdaptiveContext: jest.fn().mockResolvedValue({
        ...mockValidation,
        _id: 'val-new-456',
        score: 0.92
      }),
      getValidationById: jest.fn().mockResolvedValue(mockValidation),
      getValidationsByCodeId: jest.fn().mockResolvedValue([mockValidation]),
      generateValidationFeedback: jest.fn().mockResolvedValue({
        validationId: previousValidationId,
        feedback: 'Good implementation with some security improvements needed',
        suggestions: [
          'Add input validation to authentication forms',
          'Implement proper error handling in dashboard components'
        ]
      }),
    };

    const mockMemoryService = {
      storeMemory: jest.fn().mockImplementation((data) => {
        return Promise.resolve({
          _id: 'memory-' + Date.now(),
          ...data
        });
      }),
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([{ content: mockExpectation }]);
        }
        return Promise.resolve([]);
      }),
      getRelatedMemories: jest.fn().mockResolvedValue([]),
    };

    const mockSemanticMediatorService = {
      translateBetweenModules: jest.fn().mockResolvedValue({
        translated: true,
        data: { key: 'translated-value' }
      }),
      enrichWithContext: jest.fn().mockResolvedValue({
        ...mockExpectation,
        enriched: true,
        _id: 'enriched-' + expectationId
      }),
      resolveSemanticConflicts: jest.fn().mockResolvedValue(mockSemanticResolution),
      extractSemanticInsights: jest.fn().mockResolvedValue(mockSemanticInsights),
      trackSemanticTransformation: jest.fn().mockResolvedValue(mockTransformationRecord),
      evaluateSemanticTransformation: jest.fn().mockResolvedValue(mockTransformationEvaluation),
      generateValidationContext: jest.fn().mockResolvedValue(mockValidationContext),
      analyzeSemanticDifferences: jest.fn().mockResolvedValue({
        differences: mockTransformationRecord.differences,
        impact: 'moderate',
        semanticShift: 'minimal'
      }),
      generateTransformationAnalysis: jest.fn().mockResolvedValue({
        analysis: mockTransformationRecord.analysis,
        recommendations: [
          'Improve error handling implementation',
          'Add missing analytics features'
        ]
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

    orchestratorService = module.get<OrchestratorService>(OrchestratorService);
    clarifierService = module.get<ClarifierService>(ClarifierService);
    generatorService = module.get<GeneratorService>(GeneratorService);
    validatorService = module.get<ValidatorService>(ValidatorService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(orchestratorService).toBeDefined();
    expect(clarifierService).toBeDefined();
    expect(generatorService).toBeDefined();
    expect(validatorService).toBeDefined();
    expect(memoryService).toBeDefined();
    expect(semanticMediatorService).toBeDefined();
  });

  describe('Semantic Validation Integration', () => {
    it('should execute semantic validation workflow with enhanced options', async () => {
      const workflowType = WorkflowType.SEMANTIC_VALIDATION;
      const params = {
        expectationId,
        codeId,
        extractInsights: true,
        validationOptions: { strictMode: true },
        conflictResolutionOptions: { prioritizeExpectations: true }
      };

      const result = await orchestratorService.executeWorkflow(workflowType, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.validation).toBeDefined();
      expect(result.semanticResolution).toBeDefined();
      expect(result.semanticInsights).toBeDefined();
      expect(result.validationMetrics).toBeDefined();
      expect(result.validationMetrics.semanticConflictsResolved).toBe(2);
      
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(expectationId);
      expect(generatorService.getCodeById).toHaveBeenCalledWith(codeId);
      expect(semanticMediatorService.resolveSemanticConflicts).toHaveBeenCalledWith(
        'expectations',
        mockExpectation,
        'code',
        mockCode
      );
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalled();
      expect(validatorService.validateCodeWithSemanticInput).toHaveBeenCalledWith(
        expectationId,
        codeId,
        expect.objectContaining({
          semanticInsights: mockSemanticInsights,
          strictMode: true
        })
      );
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(expect.objectContaining({
        type: MemoryType.SYSTEM,
        content: expect.objectContaining({
          workflowId: WorkflowType.SEMANTIC_VALIDATION,
          expectationId,
          codeId
        })
      }));
    });

    it('should handle errors when code or expectations are not found', async () => {
      jest.spyOn(clarifierService, 'getExpectationById').mockResolvedValueOnce(null);
      
      const workflowType = WorkflowType.SEMANTIC_VALIDATION;
      const params = {
        expectationId: 'non-existent-id',
        codeId
      };

      await expect(orchestratorService.executeWorkflow(workflowType, params))
        .rejects.toThrow('Workflow execution failed: Expectations or code not found');
    });
  });

  describe('Semantic Enrichment Integration', () => {
    it('should execute semantic enrichment workflow with transformation options', async () => {
      const workflowType = WorkflowType.SEMANTIC_ENRICHMENT;
      const params = {
        moduleType: 'expectations',
        dataId: expectationId,
        contextQuery: 'web application authentication',
        extractInsights: true,
        transformationOptions: {
          trackDifferences: true,
          analyzeTransformation: true
        }
      };

      const result = await orchestratorService.executeWorkflow(workflowType, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.originalData).toBeDefined();
      expect(result.enrichedData).toBeDefined();
      expect(result.transformationRecord).toBeDefined();
      expect(result.semanticInsights).toBeDefined();
      expect(result.transformationEvaluation).toBeDefined();
      expect(result.enrichmentMetrics).toBeDefined();
      expect(result.enrichmentMetrics.semanticPreservation).toBe(92);
      expect(result.enrichmentMetrics.informationCompleteness).toBe(90);
      
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(expectationId);
      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalledWith(
        'expectations',
        mockExpectation,
        params.contextQuery
      );
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalledWith(
        'expectations',
        'expectations_enriched',
        mockExpectation,
        expect.objectContaining({ enriched: true }),
        expect.objectContaining({
          trackDifferences: true,
          analyzeTransformation: true
        })
      );
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalled();
      expect(semanticMediatorService.evaluateSemanticTransformation).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(expect.objectContaining({
        type: MemoryType.SYSTEM,
        content: expect.objectContaining({
          workflowId: WorkflowType.SEMANTIC_ENRICHMENT,
          moduleType: 'expectations',
          dataId: expectationId
        })
      }));
    });

    it('should handle errors when data is not found', async () => {
      jest.spyOn(clarifierService, 'getExpectationById').mockResolvedValueOnce(null);
      
      const workflowType = WorkflowType.SEMANTIC_ENRICHMENT;
      const params = {
        moduleType: 'expectations',
        dataId: 'non-existent-id',
        contextQuery: 'web application authentication'
      };

      await expect(orchestratorService.executeWorkflow(workflowType, params))
        .rejects.toThrow('Workflow execution failed: Data not found for expectations with id non-existent-id');
    });
  });

  describe('Adaptive Validation Integration', () => {
    it('should execute adaptive validation workflow with custom options', async () => {
      const workflowType = WorkflowType.ADAPTIVE_VALIDATION;
      const params = {
        expectationId,
        codeId,
        previousValidationId,
        adaptationStrategy: 'balanced',
        customWeights: { security: 1.5 },
        focusAreas: ['security'],
        semanticAnalysisOptions: {
          trackTransformation: true,
          trackDifferences: true,
          analyzeTransformation: true
        }
      };

      const result = await orchestratorService.executeWorkflow(workflowType, params);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.validation).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.adaptedContext).toBeDefined();
      expect(result.semanticInsights).toBeDefined();
      expect(result.validationMetrics).toBeDefined();
      
      expect(clarifierService.getExpectationById).toHaveBeenCalledWith(expectationId);
      expect(generatorService.getCodeById).toHaveBeenCalledWith(codeId);
      expect(validatorService.getValidationById).toHaveBeenCalledWith(previousValidationId);
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalledWith(
        expectationId,
        codeId,
        expect.any(Array),
        expect.objectContaining({
          strategy: params.adaptationStrategy,
          focusAreas: params.focusAreas,
          customWeights: params.customWeights
        })
      );
      expect(validatorService.validateWithAdaptiveContext).toHaveBeenCalledWith(
        expectationId,
        codeId,
        expect.objectContaining({
          previousValidationId,
          focusOnAreas: mockValidationContext.focusAreas
        })
      );
      expect(validatorService.generateValidationFeedback).toHaveBeenCalled();
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalled();
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(expect.objectContaining({
        type: MemoryType.SYSTEM,
        content: expect.objectContaining({
          workflowId: WorkflowType.ADAPTIVE_VALIDATION,
          expectationId,
          codeId
        })
      }));
    });

    it('should handle errors when previous validation is not found', async () => {
      jest.spyOn(validatorService, 'getValidationById').mockResolvedValueOnce(null);
      
      const workflowType = WorkflowType.ADAPTIVE_VALIDATION;
      const params = {
        expectationId,
        codeId,
        previousValidationId: 'non-existent-id',
        adaptationStrategy: 'balanced'
      };

      await expect(orchestratorService.executeWorkflow(workflowType, params))
        .rejects.toThrow('Workflow execution failed: Previous validation not found');
    });
  });
});
