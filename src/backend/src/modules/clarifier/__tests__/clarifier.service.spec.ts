import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClarifierService } from '../clarifier.service';
import { Requirement } from '../schemas/requirement.schema';
import { Expectation } from '../schemas/expectation.schema';
import { LlmService } from '../../../services/llm.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';
import { CreateRequirementDto } from '../dto';

describe('ClarifierService', () => {
  let service: ClarifierService;
  let requirementModel: Model<Requirement>;
  let expectationModel: Model<Expectation>;
  let llmService: LlmService;
  let memoryService: MemoryService;
  let semanticMediatorService: SemanticMediatorService;

  beforeEach(async () => {
    const mockRequirementModel = {
      new: jest.fn().mockResolvedValue({
        save: jest.fn().mockResolvedValue({
          _id: 'test-id',
          title: 'Test Requirement',
          text: 'Test requirement text',
          status: 'initial',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            requirementId: 'test-uuid',
            creationTimestamp: expect.any(String),
            version: '1.0',
            source: 'clarifier_service'
          }
        }),
      }),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: 'test-id',
            title: 'Test Requirement',
            text: 'Test requirement text',
            status: 'initial',
          },
        ]),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'test-id',
          title: 'Test Requirement',
          text: 'Test requirement text',
          status: 'initial',
          clarifications: [],
          save: jest.fn().mockResolvedValue({
            _id: 'test-id',
            title: 'Test Requirement',
            text: 'Test requirement text',
            status: 'clarifying',
            clarifications: [
              {
                questionId: 'test-question-id',
                answer: 'Test answer',
                timestamp: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            metadata: {
              lastClarificationTimestamp: expect.any(String),
              clarificationRounds: 1,
              lastQuestionId: 'test-question-id',
            },
          }),
        }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'test-id',
          title: 'Updated Requirement',
          text: 'Updated requirement text',
          status: 'updated',
        }),
      }),
      findByIdAndDelete: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'test-id',
          title: 'Deleted Requirement',
          text: 'Deleted requirement text',
        }),
      }),
    };

    const mockExpectationModel = {
      new: jest.fn().mockResolvedValue({
        save: jest.fn().mockResolvedValue({
          _id: 'test-expectation-id',
          requirementId: 'test-id',
          model: {
            id: 'root',
            name: 'Root Expectation',
            description: 'Root expectation description',
            children: [],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'test-expectation-id',
          requirementId: 'test-id',
          model: {
            id: 'root',
            name: 'Root Expectation',
            description: 'Root expectation description',
            children: [],
          },
        }),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'test-expectation-id',
          requirementId: 'test-id',
          model: {
            id: 'root',
            name: 'Root Expectation',
            description: 'Root expectation description',
            children: [],
          },
        }),
      }),
    };

    const mockLlmService = {
      generateContent: jest.fn().mockImplementation((prompt, options) => {
        if (prompt.includes('生成5个关键澄清问题')) {
          return Promise.resolve(JSON.stringify([
            {
              id: 'functional-1',
              text: 'What are the primary features you need?',
              category: 'functional',
              priority: 'high',
            },
            {
              id: 'non-functional-1',
              text: 'What performance requirements do you have?',
              category: 'non-functional',
              priority: 'medium',
            },
          ]));
        } else if (prompt.includes('判断是否需要更多澄清')) {
          return Promise.resolve(JSON.stringify({
            needMoreClarification: true,
            summary: 'Need more clarification on performance requirements',
            missingAspects: ['performance', 'security'],
            dialogueEffectiveness: {
              score: 70,
              strengths: ['Good initial understanding'],
              weaknesses: ['Missing technical details'],
            },
          }));
        } else if (prompt.includes('生成结构化的纯语义期望模型')) {
          return Promise.resolve(JSON.stringify({
            id: 'root',
            name: 'Root Expectation',
            description: 'Root expectation description',
            children: [],
          }));
        } else if (prompt.includes('分析多轮对话的需求澄清过程')) {
          return Promise.resolve(JSON.stringify({
            dialogueEffectiveness: {
              score: 85,
              strengths: ['Progressive clarification', 'Good follow-up questions'],
              weaknesses: ['Some redundant questions'],
              recommendations: ['Focus more on technical requirements'],
            },
            keyInsights: ['User needs a responsive UI', 'Security is a priority'],
            conversationFlow: {
              quality: 'good',
              improvements: ['More focused questions'],
            },
            requirementCompleteness: {
              score: 75,
              missingAspects: ['Deployment details'],
            },
          }));
        } else if (prompt.includes('生成期望模型的简洁总结')) {
          return Promise.resolve(JSON.stringify({
            title: 'Expectation Summary',
            summary: 'A system that provides X functionality with Y performance',
            keyPoints: ['Feature X', 'Performance Y'],
            technicalConsiderations: ['Consider Z architecture'],
          }));
        } else {
          return Promise.resolve('{}');
        }
      }),
    };

    const mockMemoryService = {
      storeRequirement: jest.fn().mockResolvedValue({
        _id: 'memory-id',
        type: 'requirement',
        content: {
          _id: 'test-id',
          title: 'Test Requirement',
          text: 'Test requirement text',
        },
      }),
      updateRequirement: jest.fn().mockResolvedValue({
        _id: 'memory-id',
        type: 'requirement',
        content: {
          _id: 'test-id',
          title: 'Updated Requirement',
          text: 'Updated requirement text',
        },
      }),
      deleteRequirement: jest.fn().mockResolvedValue(undefined),
      storeExpectation: jest.fn().mockResolvedValue({
        _id: 'memory-id',
        type: 'expectation',
        content: {
          _id: 'test-expectation-id',
          requirementId: 'test-id',
          model: {
            id: 'root',
            name: 'Root Expectation',
            description: 'Root expectation description',
            children: [],
          },
        },
      }),
    };

    const mockSemanticMediatorService = {
      translateBetweenModules: jest.fn().mockImplementation((sourceModule, targetModule, data) => {
        if (sourceModule === 'clarifier' && targetModule === 'expectation_generator' && data.translationQuery) {
          return Promise.resolve({
            id: 'root',
            name: 'Root Expectation',
            description: 'Root expectation description',
            children: [],
          });
        }
        return Promise.resolve({});
      }),
      enrichWithContext: jest.fn().mockImplementation((module, data, query) => {
        if (module === 'clarifier' && query.includes('判断是否需要更多澄清')) {
          return Promise.resolve({
            needMoreClarification: true,
            summary: 'Need more clarification on performance requirements',
            missingAspects: ['performance', 'security'],
            dialogueEffectiveness: {
              score: 70,
              strengths: ['Good initial understanding'],
              weaknesses: ['Missing technical details'],
            },
          });
        }
        return Promise.resolve({});
      }),
      resolveSemanticConflicts: jest.fn().mockResolvedValue({}),
      extractSemanticInsights: jest.fn().mockImplementation((data, query) => {
        if (query.includes('生成5个关键澄清问题')) {
          return Promise.resolve([
            {
              id: 'functional-1',
              text: 'What are the primary features you need?',
              category: 'functional',
              priority: 'high',
            },
            {
              id: 'non-functional-1',
              text: 'What performance requirements do you have?',
              category: 'non-functional',
              priority: 'medium',
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      trackSemanticTransformation: jest.fn().mockImplementation((sourceModule, targetModule, sourceData, transformedData) => {
        if (sourceModule === 'expectation' && targetModule === 'summary') {
          return Promise.resolve({
            transformedData: {
              mainGoal: 'Create a responsive web application',
              coreFunctions: ['User authentication', 'Data visualization'],
              nonFunctionalFeatures: ['Fast loading times', 'Intuitive UI'],
              constraints: ['Must work on mobile devices'],
              userImportance: 'Critical for business operations',
              semanticCoherence: { score: 85, analysis: 'Good coherence between components' },
              completenessScore: 90,
              summary: 'A responsive web application with authentication and data visualization'
            },
            transformationMetadata: {
              transformationId: 'transform-123',
              timestamp: new Date().toISOString(),
              transformationType: 'expectation_summary'
            }
          });
        }
        return Promise.resolve({});
      }),
      evaluateSemanticTransformation: jest.fn().mockResolvedValue({}),
      generateValidationContext: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarifierService,
        {
          provide: getModelToken(Requirement.name),
          useValue: mockRequirementModel,
        },
        {
          provide: getModelToken(Expectation.name),
          useValue: mockExpectationModel,
        },
        {
          provide: LlmService,
          useValue: mockLlmService,
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

    service = module.get<ClarifierService>(ClarifierService);
    requirementModel = module.get<Model<Requirement>>(getModelToken(Requirement.name));
    expectationModel = module.get<Model<Expectation>>(getModelToken(Expectation.name));
    llmService = module.get<LlmService>(LlmService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRequirement', () => {
    it('should create a new requirement', async () => {
      const createRequirementDto: CreateRequirementDto = {
        title: 'Test Requirement',
        text: 'Test requirement text',
        domain: 'test-domain',
      };

      const result = await service.createRequirement(createRequirementDto);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Requirement');
      expect(result.status).toBe('initial');
      expect(memoryService.storeRequirement).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('getAllRequirements', () => {
    it('should return all requirements', async () => {
      const result = await service.getAllRequirements();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Test Requirement');
    });
  });

  describe('getRequirementById', () => {
    it('should return a requirement by id', async () => {
      const result = await service.getRequirementById('test-id');

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Requirement');
    });
  });

  describe('updateRequirement', () => {
    it('should update a requirement', async () => {
      const updateRequirementDto = {
        title: 'Updated Requirement',
        text: 'Updated requirement text',
        status: 'clarifying' as 'initial' | 'clarifying' | 'expectations_generated' | 'completed',
      };

      const result = await service.updateRequirement('test-id', updateRequirementDto);

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Requirement');
      expect(memoryService.updateRequirement).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('deleteRequirement', () => {
    it('should delete a requirement', async () => {
      const result = await service.deleteRequirement('test-id');

      expect(result).toBeDefined();
      expect(result.title).toBe('Deleted Requirement');
      expect(memoryService.deleteRequirement).toHaveBeenCalledWith('test-id');
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate clarification questions using semantic mediator', async () => {
      const requirementText = 'Test requirement text';

      const result = await service.generateClarificationQuestions(requirementText);

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('functional-1');
      expect(result[0].category).toBe('functional');
      
      expect(semanticMediatorService.extractSemanticInsights).toHaveBeenCalledWith(
        expect.objectContaining({
          text: requirementText,
          sessionId: expect.any(String),
          timestamp: expect.any(String)
        }),
        expect.stringContaining('生成5个关键澄清问题')
      );
      
      expect(llmService.generateContent).not.toHaveBeenCalledWith(
        expect.stringContaining('分析以下需求，并生成5个关键澄清问题'),
        expect.any(Object)
      );
    });
  });

  describe('processClarificationAnswer', () => {
    it('should process a clarification answer using semantic mediator', async () => {
      const requirementId = 'test-id';
      const questionId = 'test-question-id';
      const answer = 'Test answer';

      const result = await service.processClarificationAnswer(requirementId, questionId, answer);

      expect(result).toBeDefined();
      expect(result.needMoreClarification).toBe(true);
      expect(result.summary).toBe('Need more clarification on performance requirements');
      
      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalledWith(
        'clarifier',
        expect.objectContaining({
          text: expect.any(String),
          clarifications: expect.any(Array),
          metadata: expect.any(Object),
          status: 'clarifying',
          sessionId: expect.any(String),
          timestamp: expect.any(String)
        }),
        expect.stringContaining('判断是否需要更多澄清')
      );
      
      expect(llmService.generateContent).not.toHaveBeenCalledWith(
        expect.stringContaining('分析以下需求及其澄清问题和答案'),
        expect.any(Object)
      );
      
      expect(memoryService.updateRequirement).toHaveBeenCalled();
    });
  });

  describe('generateExpectations', () => {
    it('should generate expectations using semantic mediator', async () => {
      const requirementId = 'test-id';

      const result = await service.generateExpectations(requirementId);

      expect(result).toBeDefined();
      expect(result._id).toBe('test-expectation-id');
      expect(result.requirementId).toBe('test-id');
      
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalledWith(
        'clarifier',
        'expectation_generator',
        expect.objectContaining({
          requirementId,
          text: expect.any(String),
          clarifications: expect.any(Array),
          status: expect.any(String),
          metadata: expect.any(Object),
          translationQuery: expect.stringContaining('生成结构化的纯语义期望模型')
        })
      );
      
      expect(llmService.generateContent).not.toHaveBeenCalledWith(
        expect.stringContaining('基于以下需求及其澄清信息，生成结构化的纯语义期望模型')
      );
      
      expect(memoryService.storeExpectation).toHaveBeenCalled();
    });
  });

  describe('getExpectations', () => {
    it('should get expectations for a requirement', async () => {
      const requirementId = 'test-id';

      const result = await service.getExpectations(requirementId);

      expect(result).toBeDefined();
      expect(result._id).toBe('test-expectation-id');
      expect(result.requirementId).toBe('test-id');
    });
  });

  describe('getExpectationById', () => {
    it('should get an expectation by id', async () => {
      const expectationId = 'test-expectation-id';

      const result = await service.getExpectationById(expectationId);

      expect(result).toBeDefined();
      expect(result._id).toBe('test-expectation-id');
      expect(result.requirementId).toBe('test-id');
    });
  });

  describe('analyzeClarificationProgress', () => {
    it('should analyze clarification progress', async () => {
      const requirementId = 'test-id';

      const result = await service.analyzeClarificationProgress(requirementId);

      expect(result).toBeDefined();
      expect(llmService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('分析以下需求及其澄清问题和答案'),
        expect.any(Object)
      );
    });
  });

  describe('analyzeMultiRoundDialogue', () => {
    it('should analyze multi-round dialogue using semantic mediator', async () => {
      jest.spyOn(requirementModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: 'test-id',
          title: 'Test Requirement',
          text: 'Test requirement text',
          status: 'clarifying',
          clarifications: [
            {
              questionId: 'question-1',
              answer: 'Answer 1',
              timestamp: new Date(),
            },
            {
              questionId: 'question-2',
              answer: 'Answer 2',
              timestamp: new Date(),
            },
          ],
          dialogueLog: [
            { type: 'question', content: 'Question 1' },
            { type: 'answer', content: 'Answer 1' },
            { type: 'question', content: 'Question 2' },
            { type: 'answer', content: 'Answer 2' },
          ],
          save: jest.fn().mockResolvedValue({
            _id: 'test-id',
            metadata: {
              dialogueAnalysis: {
                score: 85,
                strengths: ['Progressive clarification'],
                weaknesses: ['Some redundant questions'],
              },
            },
          }),
        }),
      } as any);

      const requirementId = 'test-id';

      const result = await service.analyzeMultiRoundDialogue(requirementId);

      expect(result).toBeDefined();
      expect(result.dialogueEffectiveness).toBeDefined();
      expect(result.dialogueEffectiveness.score).toBe(85);
      
      expect(semanticMediatorService.resolveSemanticConflicts).toHaveBeenCalledWith(
        'requirement',
        expect.objectContaining({
          id: requirementId,
          title: 'Test Requirement',
          text: 'Test requirement text',
          clarifications: expect.any(Array),
          dialogueLog: expect.any(Array),
          sessionId: expect.any(String)
        }),
        'dialogue_analysis',
        expect.objectContaining({
          analysisType: 'multi_round_dialogue',
          criteria: expect.any(Array),
          expectedFormat: expect.any(Object)
        })
      );
      
      expect(llmService.generateContent).not.toHaveBeenCalledWith(
        expect.stringContaining('分析以下多轮对话的需求澄清过程'),
        expect.any(Object)
      );
    });
  it('should generate expectation summary using semantic mediator', async () => {
    const expectationId = 'test-expectation-id';
    
    const mockExpectation = {
      _id: expectationId,
      title: 'Test Expectation',
      model: {
        id: 'root',
        name: 'Root Expectation',
        description: 'Root expectation description',
        children: []
      },
      requirementId: 'test-requirement-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      toObject: jest.fn().mockReturnValue({
        _id: expectationId,
        title: 'Test Expectation',
        model: {
          id: 'root',
          name: 'Root Expectation',
          description: 'Root expectation description',
          children: []
        },
        requirementId: 'test-requirement-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      })
    };
    
    jest.spyOn(expectationModel, 'findById').mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(mockExpectation)
    } as any);
    
    const result = await service.generateExpectationSummary(expectationId);
    
    expect(result).toBeDefined();
    expect(result.mainGoal).toBe('Create a responsive web application');
    expect(result.coreFunctions).toHaveLength(2);
    expect(result.nonFunctionalFeatures).toHaveLength(2);
    
    expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalledWith(
      'expectation',
      'summary',
      expect.objectContaining({
        expectationId: expectationId,
        model: expect.any(Object),
        requirementId: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        metadata: expect.any(Object)
      }),
      expect.any(Object)
    );
    
    expect(llmService.generateContent).not.toHaveBeenCalledWith(
      expect.stringContaining('生成期望模型摘要'),
      expect.any(Object)
    );
  });



    it('should throw an error if there are not enough dialogue rounds', async () => {
      jest.spyOn(requirementModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: 'test-id',
          title: 'Test Requirement',
          text: 'Test requirement text',
          status: 'initial',
          clarifications: [
            {
              questionId: 'question-1',
              answer: 'Answer 1',
              timestamp: new Date(),
            },
          ],
        }),
      } as any);

      const requirementId = 'test-id';

      await expect(service.analyzeMultiRoundDialogue(requirementId)).rejects.toThrow(
        '需要至少两轮对话才能进行多轮对话分析'
      );
    });
  });
});
