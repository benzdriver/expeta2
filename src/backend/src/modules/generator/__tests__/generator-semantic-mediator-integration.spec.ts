import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GeneratorService } from '../generator.service';
import { Code } from '../schemas/code.schema';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';

describe('GeneratorService - Semantic Mediator Integration', () => {
  let generatorService: GeneratorService;
  let semanticMediatorService: SemanticMediatorService;
  let memoryService: MemoryService;
  let llmRouterService: LlmRouterService;
  let codeModel: Model<Code>;

  const _mockExpectation = 
    _id: 'test-expectation-id',
    content: {
      _id: 'test-expectation-id',
      title: 'Test Expectation',
      model: {
        requirements: ['Build a simple web app'],
        constraints: ['Use TypeScript'],
        preferences: ['Clean code'],
      },
    },
  };

  const _mockCode = 
    _id: 'test-code-id',
    expectationId: 'test-expectation-id',
    files: [
      {
        path: 'test.ts',
        content: '/* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
console.log("test")',
        language: 'typescript',
      },
    ],
    metadata: {
      expectationId: 'test-expectation-id',
      version: 1,
      status: 'generated',
      semanticAnalysisUsed: true,
      semanticAnalysisSummary: 'Enriched semantic analysis',
      techStack: {},
      architecturePattern: '',
      originalCodeId: null,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const _mockCodeModel = 
      this.save = jest.fn().mockImplementation(function () {
        return Promise.resolve({
          ...this,
          _id: 'test-code-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      return this;
    };

    mockCodeModel.find = jest.fn().mockReturnThis();
    mockCodeModel.findById = jest.fn().mockImplementation((id) => {
      if (id === 'test-code-id') {
        return {
          exec: jest.fn().mockResolvedValue(mockCode),
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(null),
      };
    });
    mockCodeModel.findOne = jest.fn().mockReturnThis();
    mockCodeModel.sort = jest.fn().mockReturnThis();
    mockCodeModel.exec = jest.fn().mockResolvedValue([mockCode]);

    const _mockLlmRouterService = 
      generateContent: jest.fn().mockResolvedValue(
        JSON.stringify({
          files: [
            {
              path: 'test.ts',
              content: '/* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
console.log("test")',
              language: 'typescript',
            },
          ],
        }),
      ),
    };

    const _mockMemoryService = 
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([mockExpectation]);
        }
        return Promise.resolve([]);
      }),
      storeMemory: jest.fn().mockResolvedValue({
        _id: 'test-memory-id',
        type: MemoryType.CODE,
        content: { codeId: 'test-code-id' },
      }),
    };

    const _mockSemanticMediatorService = 
      enrichWithContext: jest.fn().mockImplementation((source, data, context) => {
        return Promise.resolve({
          ...data,
          enriched: true,
          context,
          summary: 'Enriched semantic analysis',
        });
      }),
      translateBetweenModules: jest.fn().mockImplementation((source, target, data) => {
        return Promise.resolve({
          ...data,
          translated: true,
          source,
          target,
        });
      }),
      trackSemanticTransformation: jest.fn().mockResolvedValue({
        transformationId: 'test-transformation-id',
        source: 'expectation',
        target: 'code',
      }),

      resolveSemanticConflicts: jest
        .fn()
        .mockImplementation((source, target, sourceData, targetData) => {
          return Promise.resolve({
            resolved: true,
            conflicts: [],
            source,
            target,
          });
        }),
      generateValidationContext: jest.fn().mockImplementation((expectationId, codeId) => {
        return Promise.resolve({
          expectationId,
          codeId,
          validationRules: ['Rule 1', 'Rule 2'],
          validationStrategy: 'semantic',
          previousValidations: [],
        });
      }),
      extractSemanticInsights: jest.fn().mockImplementation((data, query) => {
        return Promise.resolve({
          insights: ['Insight 1', 'Insight 2'],
          query,
          data: data._id,
        });
      }),
      evaluateSemanticTransformation: jest
        .fn()
        .mockImplementation((sourceData, transformedData, expectedOutcome) => {
          return Promise.resolve({
            semanticPreservation: 95,
            structuralAdaptability: 90,
            informationCompleteness: 85,
            overallQuality: 90,
            improvements: ['Suggestion 1', 'Suggestion 2'],
            isValid: true,
            validationScore: 0.9,
          });
        }),
    };

    const _module: TestingModule = 
      providers: [
        GeneratorService,
        {
          provide: getModelToken(Code.name),
          useValue: mockCodeModel,
        },
        {
          provide: LlmRouterService,
          useValue: mockLlmRouterService,
        },
        {
          provide: MemoryService,
          useValue: mockMemoryService,
        },
        {
          provide: SemanticMediatorService,
          useValue: mockSemanticMediatorService,
        },
      ],
    }).compile();

    generatorService = module.get<GeneratorService>(GeneratorService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);
    memoryService = module.get<MemoryService>(MemoryService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    codeModel = module.get<Model<Code>>(getModelToken(Code.name));
  });

  describe('generateCodeWithSemanticInput', () => {
    it('should enrich semantic analysis with context', async () => {
      const _expectationId = 
      const _semanticAnalysis = 
        key: 'value',
        summary: 'Semantic analysis summary',
      };

      const _result = 
        expectationId,
        semanticAnalysis,
      );

      expect(result).toBeDefined();
      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalledWith(
        'generator',
        semanticAnalysis,
        `expectation:${expectationId}`,
      );
    });

    it('should translate expectation to generator-friendly format', async () => {
      const _expectationId = 
      const _semanticAnalysis = 
        key: 'value',
        summary: 'Semantic analysis summary',
      };

      const _result = 
        expectationId,
        semanticAnalysis,
      );

      expect(result).toBeDefined();
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalledWith(
        'expectation',
        'generator',
        mockExpectation.content.model,
      );
    });

    it('should track semantic transformation between expectation and code', async () => {
      const _expectationId = 
      const _semanticAnalysis = 
        key: 'value',
        summary: 'Semantic analysis summary',
      };

      const _result = 
        expectationId,
        semanticAnalysis,
      );

      expect(result).toBeDefined();
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalledWith(
        'expectation',
        'code',
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('optimizeCode', () => {
    it('should extract semantic insights from feedback', async () => {
      const _codeId = 
      const _semanticFeedback = 
        suggestions: ['Improve performance', 'Enhance readability'],
        priority: 'high',
      };

      const _result = 

      expect(result).toBeDefined();
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalledWith(
        semanticFeedback,
        'code optimization',
      );
    });

    it('should resolve semantic conflicts between expectation and code', async () => {
      const _codeId = 
      const _semanticFeedback = 
        suggestions: ['Improve performance', 'Enhance readability'],
        priority: 'high',
      };

      const _result = 

      expect(result).toBeDefined();
      expect(semanticMediatorService.resolveSemanticConflicts).toHaveBeenCalledWith(
        'expectation',
        mockExpectation.content.model,
        'code',
        mockCode,
      );
    });
  });

  describe('validateCodeSemantics', () => {
    it('should validate code against semantic expectations', async () => {
      const _codeId = 

      const _result = 

      expect(result).toBeDefined();
      expect(result.validationContext).toBeDefined();
      expect(result.semanticInsights).toBeDefined();
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalledWith(
        mockCode.expectationId,
        codeId,
      );
    });

    it('should throw an error if code is not found', async () => {
      const _codeId = 

      await expect(generatorService.validateCodeSemantics(codeId)).rejects.toThrow(
        `Code with id ${codeId} not found`,
      );
    });
  });
});
