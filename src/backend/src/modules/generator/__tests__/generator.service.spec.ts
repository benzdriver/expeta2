import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GeneratorService } from '../generator.service';
import { Code } from '../schemas/code.schema';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { GenerateCodeWithSemanticInputDto } from '../dto';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';

describe('GeneratorService', () => {
  let service: GeneratorService;
  let codeModel: Model<Code>;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;
  let semanticMediatorService: SemanticMediatorService;

  beforeEach(async () => {
    const mockCodeModel = function () {
      this.save = jest.fn().mockImplementation(function () {
        const metadata = this.metadata || {
          expectationId: 'test-expectation-id',
          version: 1,
          status: 'generated',
          semanticAnalysisUsed: false,
          semanticAnalysisSummary: '',
          techStack: {},
          architecturePattern: '',
          originalCodeId: null,
        };

        return Promise.resolve({
          _id: 'test-code-id',
          expectationId: 'test-expectation-id',
          files: [
            {
              path: 'test.js',
              content: 'console.log("test")',
              language: 'javascript',
            },
          ],
          metadata: metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      return this;
    };

    mockCodeModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: 'test-code-id',
            expectationId: 'test-expectation-id',
            files: [
              {
                path: 'test.js',
                content: 'console.log("test")',
                language: 'javascript',
              },
            ],
            metadata: {
              expectationId: 'test-expectation-id',
              version: 1,
              status: 'generated',
              semanticAnalysisUsed: false,
              semanticAnalysisSummary: '',
              techStack: {},
              architecturePattern: '',
              originalCodeId: null,
            },
          },
        ]),
      }),
    });

    mockCodeModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'test-code-id',
        expectationId: 'test-expectation-id',
        files: [
          {
            path: 'test.js',
            content: 'console.log("test")',
            language: 'javascript',
          },
        ],
        metadata: {
          expectationId: 'test-expectation-id',
          version: 1,
          status: 'generated',
          semanticAnalysisUsed: false,
          semanticAnalysisSummary: '',
          techStack: {},
          architecturePattern: '',
          originalCodeId: null,
        },
        save: jest.fn().mockResolvedValue({
          _id: 'test-code-id',
          expectationId: 'test-expectation-id',
          metadata: {
            status: 'approved',
            semanticAnalysisUsed: false,
            semanticAnalysisSummary: '',
            techStack: {},
            architecturePattern: '',
            originalCodeId: null,
          },
        }),
      }),
    });

    const mockLlmRouterService = {
      generateContent: jest.fn().mockImplementation((prompt, options) => {
        if (prompt.includes('生成相应的代码实现')) {
          return Promise.resolve(
            JSON.stringify({
              files: [
                {
                  path: 'test.js',
                  content: 'console.log("test")',
                  language: 'javascript',
                },
              ],
            }),
          );
        } else if (prompt.includes('基于以下期望模型和语义分析结果')) {
          return Promise.resolve(
            JSON.stringify({
              files: [
                {
                  path: 'enhanced.js',
                  content: 'console.log("enhanced")',
                  language: 'javascript',
                },
              ],
            }),
          );
        } else if (prompt.includes('生成项目结构')) {
          return Promise.resolve(
            JSON.stringify({
              files: [
                {
                  path: 'structure.js',
                  content: 'console.log("structure")',
                  language: 'javascript',
                },
              ],
              explanation: 'Project structure explanation',
            }),
          );
        } else if (prompt.includes('基于架构指南和技术要求生成代码')) {
          return Promise.resolve(
            JSON.stringify({
              files: [
                {
                  path: 'architecture.js',
                  content: 'console.log("architecture")',
                  language: 'javascript',
                },
              ],
              explanation: 'Architecture explanation',
              componentRelationships: [{ source: 'A', target: 'B' }],
            }),
          );
        } else if (prompt.includes('为已生成的代码创建测试套件')) {
          return Promise.resolve(
            JSON.stringify({
              files: [
                {
                  path: 'test.test.js',
                  content: 'test("should work", () => {})',
                  language: 'javascript',
                },
              ],
              coverage: { statements: 80, branches: 70, functions: 90, lines: 85 },
              strategy: 'Unit and integration tests',
            }),
          );
        } else if (prompt.includes('基于重构目标优化代码结构和质量')) {
          return Promise.resolve(
            JSON.stringify({
              files: [
                {
                  path: 'refactored.js',
                  content: 'console.log("refactored")',
                  language: 'javascript',
                },
              ],
              changes: [{ file: 'test.js', description: 'Improved structure' }],
              explanation: 'Refactoring explanation',
            }),
          );
        } else if (prompt.includes('基于语义反馈优化已生成的代码')) {
          return Promise.resolve(
            JSON.stringify({
              files: [
                {
                  path: 'optimized.js',
                  content: 'console.log("optimized")',
                  language: 'javascript',
                },
              ],
              optimizations: [{ description: 'Improved performance' }],
              explanation: 'Optimization explanation',
            }),
          );
        } else {
          return Promise.resolve('{}');
        }
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
                    content: 'console.log("test")',
                    language: 'javascript',
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
        type: 'code',
        content: {
          _id: 'test-code-id',
          expectationId: 'test-expectation-id',
        },
      }),
      updateMemory: jest.fn().mockResolvedValue({
        _id: 'memory-id',
        type: 'code',
        content: {
          _id: 'test-code-id',
          expectationId: 'test-expectation-id',
          metadata: {
            status: 'approved',
          },
        },
      }),
    };

    const mockSemanticMediatorService = {
      enrichWithContext: jest.fn().mockResolvedValue({
        enriched: true,
        summary: 'Enriched semantic analysis',
        context: { key: 'value' },
      }),
      translateBetweenModules: jest.fn().mockResolvedValue({
        translated: true,
        model: { id: 'translated-model' },
      }),
      trackSemanticTransformation: jest.fn().mockResolvedValue({
        tracked: true,
        transformationId: 'test-transformation-id',
      }),
      extractSemanticInsights: jest.fn().mockResolvedValue({
        insights: ['Insight 1', 'Insight 2'],
        summary: 'Semantic insights summary',
      }),
      resolveSemanticConflicts: jest.fn().mockResolvedValue({
        resolved: true,
        model: { id: 'resolved-model' },
      }),
      evaluateSemanticTransformation: jest.fn().mockResolvedValue({
        score: 0.85,
        feedback: 'Good transformation',
      }),
      generateValidationContext: jest.fn().mockResolvedValue({
        context: 'Validation context',
        rules: ['Rule 1', 'Rule 2'],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<GeneratorService>(GeneratorService);
    codeModel = module.get<Model<Code>>(getModelToken(Code.name));
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCode', () => {
    it('should generate code based on expectation', async () => {
      const expectationId = 'test-expectation-id';

      const result = await service.generateCode(expectationId);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('test.js');
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('基于以下期望模型，生成相应的代码实现'),
      );
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      const expectationId = 'non-existent-id';

      await expect(service.generateCode(expectationId)).rejects.toThrow('Expectation not found');
    });
  });

  describe('getCodeByExpectationId', () => {
    it('should return code by expectation id', async () => {
      const expectationId = 'test-expectation-id';

      const result = await service.getCodeByExpectationId(expectationId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].expectationId).toBe(expectationId);
    });
  });

  describe('getCodeById', () => {
    it('should return code by id', async () => {
      const codeId = 'test-code-id';

      const result = await service.getCodeById(codeId);

      expect(result).toBeDefined();
      expect(result._id).toBe(codeId);
    });

    it('should throw an error if code is not found', async () => {
      jest.spyOn(codeModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);
      const codeId = 'non-existent-id';

      await expect(service.getCodeById(codeId)).rejects.toThrow(`Code with id ${codeId} not found`);
    });
  });

  describe('getCodeFiles', () => {
    it('should return code files', async () => {
      const codeId = 'test-code-id';

      const result = await service.getCodeFiles(codeId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('test.js');
    });

    it('should throw an error if code is not found', async () => {
      jest.spyOn(codeModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);
      const codeId = 'non-existent-id';

      await expect(service.getCodeFiles(codeId)).rejects.toThrow('Code not found');
    });
  });

  describe('approveCode', () => {
    it('should approve code', async () => {
      const codeId = 'test-code-id';

      const result = await service.approveCode(codeId);

      expect(result).toBeDefined();
      expect(result.metadata.status).toBe('approved');
      expect(memoryService.updateMemory).toHaveBeenCalled();
    });

    it('should throw an error if code is not found', async () => {
      jest.spyOn(codeModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);
      const codeId = 'non-existent-id';

      await expect(service.approveCode(codeId)).rejects.toThrow('Code not found');
    });
  });

  describe('generateCodeWithSemanticInput', () => {
    it('should generate code with semantic input using semantic mediator', async () => {
      const expectationId = 'test-expectation-id';
      const semanticAnalysis = {
        key: 'value',
        summary: 'Semantic analysis summary',
      };

      jest
        .spyOn(service as any, 'getPromptTemplate')
        .mockResolvedValueOnce('Mocked prompt template');

      const mockResult = {
        _id: 'test-code-id',
        expectationId: expectationId,
        files: [{ path: 'enhanced.js', content: 'console.log("enhanced")' }],
        metadata: {
          expectationId: expectationId,
          version: 1,
          status: 'generated',
          semanticAnalysisUsed: true,
          semanticAnalysisSummary: 'Enriched semantic analysis',
          generationOptions: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service as any, 'createCode').mockResolvedValueOnce(mockResult);

      const result = await service.generateCodeWithSemanticInput(expectationId, semanticAnalysis);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.metadata.semanticAnalysisUsed).toBe(true);
      expect(result.metadata.semanticAnalysisSummary).toBe('Enriched semantic analysis');

      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalledWith(
        'generator',
        semanticAnalysis,
        `expectation:${expectationId}`,
      );
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalledWith(
        'expectation',
        'generator',
        expect.any(Object),
      );
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalledWith(
        'expectation',
        'code',
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          trackDifferences: true,
          analyzeTransformation: true,
          saveToMemory: true,
        }),
      );

      expect(llmRouterService.generateContent).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      const expectationId = 'non-existent-id';
      const semanticAnalysis = { key: 'value' };

      await expect(
        service.generateCodeWithSemanticInput(expectationId, semanticAnalysis),
      ).rejects.toThrow('Expectation not found');
    });

    it('should use default prompt if template is not found', async () => {
      const expectationId = 'test-expectation-id';
      const semanticAnalysis = { key: 'value' };

      jest
        .spyOn(service as any, 'getPromptTemplate')
        .mockRejectedValueOnce(new Error('Template not found'));

      const result = await service.generateCodeWithSemanticInput(expectationId, semanticAnalysis);

      expect(result).toBeDefined();
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('基于以下期望模型和语义分析结果，生成相应的代码实现'),
      );

      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalled();
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalled();
    });
  });

  describe('generateProjectStructure', () => {
    it('should generate project structure', async () => {
      const expectationId = 'test-expectation-id';
      const techStack = {
        frontend: 'React',
        backend: 'Node.js',
        database: 'MongoDB',
      };

      jest
        .spyOn(service as any, 'getPromptTemplate')
        .mockResolvedValueOnce('Mocked project structure prompt');

      const mockSave = jest.fn().mockResolvedValueOnce({
        _id: 'test-code-id',
        expectationId: expectationId,
        files: [{ path: 'structure.js', content: 'console.log("structure")' }],
        metadata: {
          expectationId: expectationId,
          version: 1,
          status: 'structure_generated',
          techStack: techStack,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(service as any, 'codeModel').mockImplementationOnce(() => ({
        save: mockSave,
      }));

      const result = await service.generateProjectStructure(expectationId, techStack);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.metadata.status).toBe('structure_generated');
      expect(result.metadata.techStack).toEqual(techStack);
      expect(llmRouterService.generateContent).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      const expectationId = 'non-existent-id';
      const techStack = { frontend: 'React' };

      await expect(service.generateProjectStructure(expectationId, techStack)).rejects.toThrow(
        'Expectation not found',
      );
    });
  });

  describe('generateCodeWithArchitecture', () => {
    it('should generate code with architecture', async () => {
      const expectationId = 'test-expectation-id';
      const architectureGuide = {
        pattern: 'MVC',
        description: 'Model-View-Controller',
      };
      const technicalRequirements = {
        performance: 'High',
        security: 'Medium',
      };

      jest
        .spyOn(service as any, 'getPromptTemplate')
        .mockResolvedValueOnce('Mocked architecture prompt');

      const mockResult = {
        _id: 'test-code-id',
        expectationId: expectationId,
        files: [{ path: 'architecture.js', content: 'console.log("architecture")' }],
        metadata: {
          expectationId: expectationId,
          version: 1,
          status: 'architecture_generated',
          architecturePattern: 'MVC',
          technicalRequirements: technicalRequirements,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service as any, 'createCode').mockResolvedValueOnce(mockResult);

      const result = await service.generateCodeWithArchitecture(
        expectationId,
        architectureGuide,
        technicalRequirements,
      );

      expect(result).toBeDefined();
      expect(result.expectationId).toBe(expectationId);
      expect(result.metadata.status).toBe('architecture_generated');
      expect(result.metadata.architecturePattern).toBe('MVC');
      expect(llmRouterService.generateContent).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if expectation is not found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      const expectationId = 'non-existent-id';
      const architectureGuide = { pattern: 'MVC' };
      const technicalRequirements = { performance: 'High' };

      await expect(
        service.generateCodeWithArchitecture(
          expectationId,
          architectureGuide,
          technicalRequirements,
        ),
      ).rejects.toThrow('Expectation not found');
    });
  });

  describe('generateTestSuite', () => {
    it('should generate test suite', async () => {
      const codeId = 'test-code-id';
      const testRequirements = {
        coverage: 'High',
        types: ['Unit', 'Integration'],
      };

      jest
        .spyOn(service as any, 'getPromptTemplate')
        .mockResolvedValueOnce('Mocked test suite prompt');

      const mockResult = {
        _id: 'test-code-id',
        expectationId: 'test-expectation-id',
        files: [{ path: 'test.test.js', content: 'test("should work", () => {})' }],
        metadata: {
          expectationId: 'test-expectation-id',
          version: 2,
          status: 'tests_added',
          originalCodeId: codeId,
          testRequirements: testRequirements,
          testCoverage: { statements: 80 },
          testStrategy: 'Unit and integration tests',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service as any, 'createCode').mockResolvedValueOnce(mockResult);

      const result = await service.generateTestSuite(codeId, testRequirements);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe('test-expectation-id');
      expect(result.metadata.status).toBe('tests_added');
      expect(result.metadata.originalCodeId).toBe(codeId);
      expect(llmRouterService.generateContent).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if code is not found', async () => {
      jest
        .spyOn(service, 'getCodeById')
        .mockRejectedValueOnce(new Error('Code with id non-existent-id not found'));
      const codeId = 'non-existent-id';
      const testRequirements = { coverage: 'High' };

      await expect(service.generateTestSuite(codeId, testRequirements)).rejects.toThrow(
        'Code with id non-existent-id not found',
      );
    });
  });

  describe('refactorCode', () => {
    it('should refactor code', async () => {
      const codeId = 'test-code-id';
      const refactoringGoals = {
        readability: 'Improve',
        performance: 'Optimize',
      };

      jest
        .spyOn(service as any, 'getPromptTemplate')
        .mockResolvedValueOnce('Mocked refactoring prompt');

      const mockSave = jest.fn().mockResolvedValueOnce({
        _id: 'test-code-id',
        expectationId: 'test-expectation-id',
        files: [{ path: 'refactored.js', content: 'console.log("refactored")' }],
        metadata: {
          expectationId: 'test-expectation-id',
          version: 2,
          status: 'refactored',
          originalCodeId: codeId,
          refactoringGoals: refactoringGoals,
          refactoringChanges: [{ file: 'test.js', description: 'Improved structure' }],
          refactoringExplanation: 'Refactoring explanation',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.refactorCode(codeId, refactoringGoals);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe('test-expectation-id');
      expect(result.metadata.status).toBe('refactored');
      expect(result.metadata.originalCodeId).toBe(codeId);
      expect(llmRouterService.generateContent).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if code is not found', async () => {
      jest
        .spyOn(service, 'getCodeById')
        .mockRejectedValueOnce(new Error('Code with id non-existent-id not found'));
      const codeId = 'non-existent-id';
      const refactoringGoals = { readability: 'Improve' };

      await expect(service.refactorCode(codeId, refactoringGoals)).rejects.toThrow(
        'Code with id non-existent-id not found',
      );
    });
  });

  describe('optimizeCode', () => {
    it('should optimize code using semantic mediator', async () => {
      const codeId = 'test-code-id';
      const semanticFeedback = {
        suggestions: ['Improve performance', 'Enhance readability'],
        priority: 'high',
      };

      jest
        .spyOn(service as any, 'getPromptTemplate')
        .mockResolvedValueOnce('Mocked optimization prompt');

      const mockSave = jest.fn().mockResolvedValueOnce({
        _id: 'test-code-id',
        expectationId: 'test-expectation-id',
        files: [{ path: 'optimized.js', content: 'console.log("optimized")' }],
        metadata: {
          expectationId: 'test-expectation-id',
          version: 2,
          status: 'optimized',
          originalCodeId: codeId,
          optimizationChanges: [{ description: 'Improved performance' }],
          optimizationExplanation: 'Optimization explanation',
          semanticFeedbackUsed: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.optimizeCode(codeId, semanticFeedback);

      expect(result).toBeDefined();
      expect(result.expectationId).toBe('test-expectation-id');
      expect(result.metadata.status).toBe('optimized');
      expect(result.metadata.originalCodeId).toBe(codeId);

      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalledWith(
        semanticFeedback,
        'code optimization',
      );
      expect(semanticMediatorService.resolveSemanticConflicts).toHaveBeenCalledWith(
        'expectation',
        expect.any(Object),
        'code',
        expect.any(Object),
      );
      expect(semanticMediatorService.evaluateSemanticTransformation).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        'Optimize code based on semantic feedback',
      );
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalledWith(
        'code',
        'optimized_code',
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          trackDifferences: true,
          analyzeTransformation: true,
          saveToMemory: true,
        }),
      );

      expect(llmRouterService.generateContent).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should throw an error if code is not found', async () => {
      jest
        .spyOn(service, 'getCodeById')
        .mockRejectedValueOnce(new Error('Code with id non-existent-id not found'));
      const codeId = 'non-existent-id';
      const semanticFeedback = { suggestions: ['Improve performance'] };

      await expect(service.optimizeCode(codeId, semanticFeedback)).rejects.toThrow(
        'Code with id non-existent-id not found',
      );
    });
  });

  describe('validateCodeSemantics', () => {
    it('should validate code semantics using semantic mediator', async () => {
      const codeId = 'test-code-id';

      const result = await service.validateCodeSemantics(codeId);

      expect(result).toBeDefined();
      expect(result.codeId).toBe(codeId);
      expect(result.expectationId).toBe('test-expectation-id');
      expect(result.validationContext).toBeDefined();
      expect(result.semanticInsights).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);

      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalledWith(
        'test-expectation-id',
        codeId,
      );
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalledWith(
        expect.any(Object),
        'code validation',
      );
    });

    it('should throw an error if code is not found', async () => {
      jest
        .spyOn(service, 'getCodeById')
        .mockRejectedValueOnce(new Error('Code with id non-existent-id not found'));
      const codeId = 'non-existent-id';

      await expect(service.validateCodeSemantics(codeId)).rejects.toThrow(
        'Code with id non-existent-id not found',
      );
    });
  });
});
