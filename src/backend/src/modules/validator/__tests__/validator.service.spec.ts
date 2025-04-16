import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ValidatorService } from '../validator.service';
import { Validation } from '../schemas/validation.schema';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';

describe('ValidatorService', () => {
  let service: ValidatorService;
  let validationModel: Model<Validation>;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;
  let semanticMediatorService: SemanticMediatorService;

  beforeEach(async () => {
    function MockValidationModel(data) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue({
        _id: 'test-validation-id',
        expectationId: data.expectationId || 'test-expectation-id',
        codeId: data.codeId || 'test-code-id',
        status: data.status || 'passed',
        score: data.score || 85,
        details: data.details || [
          {
            expectationId: 'exp-1',
            status: 'passed',
            score: 90,
            message: 'Test message',
          },
        ],
        metadata: data.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return this;
    }

    MockValidationModel.find = jest.fn().mockImplementation(() => {
      return {
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: 'test-validation-id',
              expectationId: 'test-expectation-id',
              codeId: 'test-code-id',
              status: 'passed',
              score: 85,
              details: [
                {
                  expectationId: 'exp-1',
                  status: 'passed',
                  score: 90,
                  message: 'Test message',
                },
              ],
            },
          ]),
        }),
        exec: jest.fn().mockResolvedValue([
          {
            _id: 'test-validation-id',
            expectationId: 'test-expectation-id',
            codeId: 'test-code-id',
            status: 'passed',
            score: 85,
            details: [
              {
                expectationId: 'exp-1',
                status: 'passed',
                score: 90,
                message: 'Test message',
              },
            ],
            toObject: () => ({
              _id: 'test-validation-id',
              expectationId: 'test-expectation-id',
              codeId: 'test-code-id',
              status: 'passed',
              score: 85,
              details: [
                {
                  expectationId: 'exp-1',
                  status: 'passed',
                  score: 90,
                  message: 'Test message',
                },
              ],
            }),
          },
        ]),
      };
    });

    MockValidationModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'test-validation-id',
        expectationId: 'test-expectation-id',
        codeId: 'test-code-id',
        status: 'passed',
        score: 85,
        details: [
          {
            expectationId: 'exp-1',
            status: 'passed',
            score: 90,
            message: 'Test message',
          },
        ],
        metadata: {
          iterationNumber: 1,
        },
      }),
    });

    const mockValidationModel = MockValidationModel;

    const mockLlmRouterService = {
      generateContent: jest.fn().mockImplementation((prompt) => {
        if (prompt.includes('评估代码是否满足期望要求')) {
          return Promise.resolve(
            JSON.stringify({
              status: 'passed',
              score: 85,
              details: [
                {
                  expectationId: 'exp-1',
                  status: 'passed',
                  score: 90,
                  message: 'Test message',
                },
              ],
            }),
          );
        } else if (prompt.includes('语义解析结果')) {
          return Promise.resolve(
            JSON.stringify({
              status: 'passed',
              score: 88,
              details: [
                {
                  expectationId: 'exp-1',
                  status: 'passed',
                  score: 92,
                  message: 'Test message with semantic insights',
                  semanticInsights: 'Additional semantic insights',
                },
              ],
              semanticAnalysis: 'Overall semantic analysis',
            }),
          );
        } else if (prompt.includes('进行迭代验证')) {
          return Promise.resolve(
            JSON.stringify({
              status: 'passed',
              score: 90,
              details: [
                {
                  expectationId: 'exp-1',
                  status: 'passed',
                  score: 95,
                  message: 'Improved test message',
                  improvement: 'Significant improvement',
                  remainingIssues: 'Minor issues',
                },
              ],
              iterationAnalysis: 'Iteration analysis',
              improvementSuggestions: 'Improvement suggestions',
            }),
          );
        } else if (prompt.includes('生成详细的反馈')) {
          return Promise.resolve(
            JSON.stringify({
              summary: 'Validation summary',
              strengths: ['Strength 1', 'Strength 2'],
              weaknesses: ['Weakness 1', 'Weakness 2'],
              prioritizedIssues: [
                {
                  issue: 'Issue 1',
                  severity: 'high',
                  impact: 'High impact',
                  suggestion: 'Suggestion 1',
                },
              ],
              codeOptimizationSuggestions: {
                functionality: ['Functionality suggestion 1'],
                performance: ['Performance suggestion 1'],
                maintainability: ['Maintainability suggestion 1'],
                security: ['Security suggestion 1'],
              },
              overallRecommendation: 'Overall recommendation',
            }),
          );
        } else if (prompt.includes('执行自适应语义验证')) {
          return Promise.resolve(
            JSON.stringify({
              status: 'passed',
              score: 92,
              details: [
                {
                  expectationId: 'exp-1',
                  status: 'passed',
                  score: 94,
                  message: 'Adaptive validation message',
                  adaptiveInsights: 'Adaptive insights',
                },
              ],
              adaptiveAnalysis: 'Adaptive analysis',
              contextualEvaluation: {
                contextRelevance: 'High',
                adaptationQuality: 'Excellent',
              },
            }),
          );
        } else {
          return Promise.resolve('{}');
        }
      }),
    };

    const mockSemanticMediatorService = {
      generateValidationContext: jest.fn().mockResolvedValue({
        strategy: 'balanced',
        weights: {
          functionality: 1.0,
          performance: 1.0,
          security: 1.0,
          maintainability: 1.0,
        },
        focusAreas: [],
        previousValidations: [],
        semanticContext: {
          codeFeatures: { features: ['Feature 1', 'Feature 2'] },
          semanticRelationship: { relationship: 'Strong match' },
          expectationSummary: 'Expectation summary',
          validationHistory: 'Validation history',
        },
      }),
      translateBetweenModules: jest.fn().mockResolvedValue(
        `基于以下期望模型、生成的代码和语义上下文，执行语义验证：
        
        期望模型：{"id":"root","name":"Root Expectation"}
        
        生成的代码：
        文件路径: test.js
        内容:
        /* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
console.log("test")
        
        语义上下文：
        {"codeFeatures":{"features":["Feature 1","Feature 2"]},"semanticRelationship":{"relationship":"Strong match"}}
        
        请评估代码对期望的满足程度，并提供JSON结果。`,
      ),
      enrichWithContext: jest.fn().mockImplementation((module, data, context) => {
        return Promise.resolve({
          ...data,
          enriched: true,
          context,
        });
      }),
      trackSemanticTransformation: jest.fn().mockResolvedValue(true),
      extractCodeFeatures: jest.fn().mockResolvedValue({
        features: ['Feature 1', 'Feature 2'],
      }),
      analyzeSemanticRelationship: jest.fn().mockResolvedValue({
        relationship: 'Strong match',
      }),
    };

    const mockMemoryService = {
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([
            {
              content: {
                _id: 'test-expectation-id',
                model: {
                  id: 'root',
                  name: 'Root Expectation',
                  description: 'Root expectation description',
                  children: [],
                },
              },
            },
          ]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([
            {
              content: {
                _id: 'test-code-id',
                expectationId: 'test-expectation-id',
                files: [
                  {
                    path: 'test.js',
                    content: '/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\nconsole.log("test")',
                    language: 'javascript',
                  },
                ],
              },
            },
          ]);
        } else if (type === MemoryType.VALIDATION) {
          return Promise.resolve([
            {
              content: {
                _id: 'test-validation-id',
                expectationId: 'test-expectation-id',
                codeId: 'test-code-id',
                status: 'passed',
                score: 85,
                details: [
                  {
                    expectationId: 'exp-1',
                    status: 'passed',
                    score: 90,
                    message: 'Test message',
                  },
                ],
              },
            },
          ]);
        } else {
          return Promise.resolve([]);
        }
      }),
      storeMemory: jest.fn().mockResolvedValue({
        _id: 'memory-id',
        type: 'validation',
        content: {
          _id: 'test-validation-id',
          expectationId: 'test-expectation-id',
          codeId: 'test-code-id',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidatorService,
        {
          provide: getModelToken(Validation.name),
          useValue: mockValidationModel,
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

    service = module.get<ValidatorService>(ValidatorService);
    validationModel = module.get<Model<Validation>>(getModelToken(Validation.name));
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateCode', () => {
    it('should validate code based on expectation', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';

      const result = await service.validateCode(expectationId, codeId);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.codeId).toBe(codeId);
      expect(result.status).toBe('passed');
      expect(result.score).toBe(85);
      expect(result.details).toHaveLength(1);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('基于以下期望模型和生成的代码，评估代码是否满足期望要求'),
      );
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation or code is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockImplementation((type) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([]);
        } else {
          return Promise.resolve([]);
        }
      });

      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';

      await expect(service.validateCode(expectationId, codeId)).rejects.toThrow(
        'Expectation or Code not found',
      );
    });
  });

  describe('getValidationsByExpectationId', () => {
    it('should return validations by expectation id', async () => {
      const expectationId = 'test-expectation-id';

      const result = await service.getValidationsByExpectationId(expectationId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].expectationId).toBe(expectationId);
    });
  });

  describe('getValidationsByCodeId', () => {
    it('should return validations by code id', async () => {
      const codeId = 'test-code-id';

      const result = await service.getValidationsByCodeId(codeId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].codeId).toBe(codeId);
    });
  });

  describe('getValidationById', () => {
    it('should return validation by id', async () => {
      const validationId = 'test-validation-id';

      const result = await service.getValidationById(validationId);

      expect(result).toBeDefined();
      expect(result._id).toBe(validationId);
    });
  });

  describe('validateCodeWithSemanticInput', () => {
    it('should validate code with semantic input', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const semanticInput = {
        key: 'value',
        insights: ['insight1', 'insight2'],
      };

      const result = await service.validateCodeWithSemanticInput(
        expectationId,
        codeId,
        semanticInput,
      );

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.codeId).toBe(codeId);
      expect(result.status).toBe('passed');
      expect(result.score).toBe(85);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('基于以下期望模型、生成的代码和语义上下文，执行语义验证'),
      );
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation or code is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockImplementation((type) => {
        return Promise.resolve([]);
      });

      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const semanticInput = {
        key: 'value',
        insights: ['insight1', 'insight2'],
      };

      await expect(
        service.validateCodeWithSemanticInput(expectationId, codeId, semanticInput),
      ).rejects.toThrow('Expectation or Code not found');
    });
  });

  describe('validateCodeIteratively', () => {
    it('should validate code iteratively', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const previousValidationId = 'test-validation-id';
      const iterationFocus = ['functionality', 'performance'];

      const result = await service.validateCodeIteratively(
        expectationId,
        codeId,
        previousValidationId,
        iterationFocus,
      );

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.codeId).toBe(codeId);
      expect(result.status).toBe('passed');
      expect(result.score).toBe(90);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('基于以下期望模型、生成的代码和前一轮验证结果，进行迭代验证'),
      );
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation, code, or previous validation is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockImplementation((type) => {
        return Promise.resolve([]);
      });
      jest.spyOn(validationModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const previousValidationId = 'test-validation-id';

      await expect(
        service.validateCodeIteratively(expectationId, codeId, previousValidationId),
      ).rejects.toThrow('Expectation, Code or Previous Validation not found');
    });

    it('should return previous validation if no focus areas and all previous validations passed', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const previousValidationId = 'test-validation-id';

      jest.spyOn(validationModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce({
          _id: 'test-validation-id',
          expectationId: 'test-expectation-id',
          codeId: 'test-code-id',
          status: 'passed',
          score: 100,
          details: [
            {
              expectationId: 'exp-1',
              status: 'passed',
              score: 100,
              message: 'Perfect',
            },
          ],
        }),
      } as any);

      const result = await service.validateCodeIteratively(
        expectationId,
        codeId,
        previousValidationId,
      );

      expect(result).toBeDefined();
      expect(result._id).toBe('test-validation-id');
      expect(result.status).toBe('passed');
      expect(result.score).toBe(100);
      expect(llmRouterService.generateContent).not.toHaveBeenCalled();
    });
  });

  describe('generateValidationFeedback', () => {
    it('should generate validation feedback', async () => {
      const validationId = 'test-validation-id';

      const result = await service.generateValidationFeedback(validationId);

      expect(result).toBeDefined();
      expect(result.summary).toBe('Validation summary');
      expect(result.strengths).toHaveLength(2);
      expect(result.weaknesses).toHaveLength(2);
      expect(result.prioritizedIssues).toHaveLength(1);
      expect(result.codeOptimizationSuggestions).toBeDefined();
      expect(result.summary).toBe('Validation summary');
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('基于以下验证结果，生成详细的反馈，用于指导代码优化'),
      );
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if validation is not found', async () => {
      jest.spyOn(validationModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      const validationId = 'test-validation-id';

      await expect(service.generateValidationFeedback(validationId)).rejects.toThrow(
        'Validation not found',
      );
    });

    it('should throw an error if related expectation or code is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockImplementation((type) => {
        return Promise.resolve([]);
      });

      const validationId = 'test-validation-id';

      await expect(service.generateValidationFeedback(validationId)).rejects.toThrow(
        'Related expectation or code not found',
      );
    });
  });

  describe('validateWithAdaptiveContext', () => {
    it('should validate with adaptive context', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const validationContext = {
        strategy: 'balanced',
        focusAreas: ['functionality', 'performance'],
        weights: {
          functionality: 1.2,
          performance: 1.1,
          security: 0.9,
          maintainability: 0.8,
        },
        semanticContext: {
          codeFeatures: { features: ['Feature 1', 'Feature 2'] },
          semanticRelationship: { relationship: 'Strong match' },
        },
      };

      const result = await service.validateWithAdaptiveContext(
        expectationId,
        codeId,
        validationContext,
      );

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.codeId).toBe(codeId);
      expect(result.status).toBe('passed');
      expect(result.score).toBe(92);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('执行自适应语义验证'),
      );
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should use default context if not provided', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';

      const defaultContext = { strategy: 'balanced' };
      const result = await service.validateWithAdaptiveContext(expectationId, codeId, defaultContext);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.codeId).toBe(codeId);
      expect(result.status).toBe('passed');
      expect(result.score).toBe(92);
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation or code is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockImplementation((type) => {
        return Promise.resolve([]);
      });

      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const validationContext = {
        strategy: 'balanced',
      };

      await expect(
        service.validateWithAdaptiveContext(expectationId, codeId, validationContext),
      ).rejects.toThrow('Expectation or Code not found');
    });
  });

  describe('validateWithSemanticMediation', () => {
    it('should validate with semantic mediation', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const options: {
        strategy?: 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom';
        focusAreas?: string[];
        weights?: {
          functionality?: number;
          performance?: number;
          security?: number;
          maintainability?: number;
          [key: string]: number | undefined;
        };
      } = {
        strategy: 'balanced',
        focusAreas: ['functionality'],
        weights: {
          functionality: 1.2,
        },
      };

      const result = await service.validateWithSemanticMediation(expectationId, codeId, options);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.codeId).toBe(codeId);
      expect(result.status).toBe('passed');
      expect(result.score).toBe(92);
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalled();
      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation or code is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockImplementation((type) => {
        throw new Error('Expectation or Code not found');
      });

      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const options: {
        strategy?: 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom';
        focusAreas?: string[];
        weights?: {
          functionality?: number;
          performance?: number;
          security?: number;
          maintainability?: number;
          [key: string]: number | undefined;
        };
      } = {
        strategy: 'balanced',
      };

      await expect(
        service.validateWithSemanticMediation(expectationId, codeId, options),
      ).rejects.toThrow('Expectation or Code not found');
    });
  });

  describe('validateCodeWithSemanticInput', () => {
    it('should use semantic mediator for validation', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const semanticInput = {
        key: 'value',
        insights: ['insight1', 'insight2'],
      };

      const result = await service.validateCodeWithSemanticInput(
        expectationId,
        codeId,
        semanticInput,
      );

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.codeId).toBe(codeId);
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });
  });
});
