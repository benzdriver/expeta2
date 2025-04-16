import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ClarifierService } from '../clarifier.service';
import { Requirement } from '../schemas/requirement.schema';
import { Expectation } from '../schemas/expectation.schema';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticMediatorModule } from '../../semantic-mediator/semantic-mediator.module';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';

describe('ClarifierService - Semantic Mediator Integration', () => {
  let clarifierService: ClarifierService;
  let memoryService: MemoryService;
  let semanticMediatorService: SemanticMediatorService;
  let mockRequirementModel: any;
  let mockExpectationModel: any;

  beforeEach(async () => {
    mockRequirementModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      findByIdAndDelete: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };

    mockExpectationModel = function () {
      this.find = jest.fn().mockReturnThis();
      this.findById = jest.fn().mockReturnThis();
      this.findByIdAndUpdate = jest.fn().mockReturnThis();
      this.exec = jest.fn().mockResolvedValue([]);
      this.save = jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      });
      return this;
    };

    mockExpectationModel.find = jest.fn().mockReturnThis();
    mockExpectationModel.findById = jest.fn().mockReturnThis();
    mockExpectationModel.findByIdAndUpdate = jest.fn().mockReturnThis();
    mockExpectationModel.exec = jest.fn().mockResolvedValue([]);

    const mockLlmRouterService = {
      generateContent: jest.fn().mockResolvedValue('{"result": "test"}'),
    };

    const mockMemoryService = {
      storeRequirement: jest.fn().mockResolvedValue(null),
      updateRequirement: jest.fn().mockResolvedValue(null),
      deleteRequirement: jest.fn().mockResolvedValue(null),
      storeMemory: jest.fn().mockResolvedValue(null),
      getRelatedMemories: jest.fn().mockResolvedValue([]),
      getMemoryByType: jest.fn().mockResolvedValue([]),
      storeExpectation: jest.fn().mockResolvedValue({
        _id: 'stored-expectation-id',
        requirementId: '12345',
        model: {
          description: 'Landing page with product features',
          priority: 'high',
          features: ['Product showcase', 'Modern design'],
          mainGoal: 'Showcase product features',
        },
      }),
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
          provide: LlmRouterService,
          useValue: mockLlmRouterService,
        },
        {
          provide: MemoryService,
          useValue: mockMemoryService,
        },
        {
          provide: SemanticMediatorService,
          useValue: {
            extractSemanticInsights: jest.fn().mockResolvedValue({
              insights: ['Insight 1', 'Insight 2'],
            }),
            enrichWithContext: jest.fn().mockResolvedValue({
              enriched: true,
              context: 'test context',
            }),
            translateBetweenModules: jest.fn().mockResolvedValue({
              translated: true,
            }),
            resolveSemanticConflicts: jest.fn().mockResolvedValue({
              resolved: true,
              conflicts: [],
            }),
            trackSemanticTransformation: jest.fn().mockResolvedValue({
              transformationId: 'test-transformation-id',
              transformedData: {
                mainGoal: 'Showcase product features',
                coreFunctions: ['Function 1', 'Function 2'],
                nonFunctionalFeatures: ['Feature 1', 'Feature 2'],
                constraints: ['Constraint 1'],
                userImportance: 'Key user value proposition',
                semanticCoherence: { score: 85, analysis: 'Good coherence' },
                completenessScore: 90,
                summary: 'Comprehensive summary of the expectation model',
              },
            }),
          },
        },
      ],
    }).compile();

    clarifierService = module.get<ClarifierService>(ClarifierService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);

    expect(semanticMediatorService).toBeDefined();
    expect(semanticMediatorService.extractSemanticInsights).toBeDefined();
    expect(semanticMediatorService.enrichWithContext).toBeDefined();
    expect(semanticMediatorService.translateBetweenModules).toBeDefined();
    expect(semanticMediatorService.resolveSemanticConflicts).toBeDefined();
    expect(semanticMediatorService.trackSemanticTransformation).toBeDefined();
  });

  describe('generateClarificationQuestions', () => {
    it('should use semantic mediator to extract insights from requirement text', async () => {
      const extractInsightsSpy = jest.spyOn(semanticMediatorService, 'extractSemanticInsights');

      const requirementText = 'Create a modern landing page with user authentication.';
      const result = await clarifierService.generateClarificationQuestions(requirementText);

      expect(extractInsightsSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle errors from semantic mediator gracefully', async () => {
      jest
        .spyOn(semanticMediatorService, 'extractSemanticInsights')
        .mockRejectedValueOnce(new Error('Insight extraction failed'));

      const requirementText = 'Create a modern landing page with user authentication.';

      await expect(
        clarifierService.generateClarificationQuestions(requirementText),
      ).rejects.toThrow();
    });
  });

  describe('processClarificationAnswer', () => {
    it('should use semantic mediator to enrich answer with context', async () => {
      const enrichWithContextSpy = jest.spyOn(semanticMediatorService, 'enrichWithContext');

      const requirementId = 'test-req-123';
      const questionId = 'question-123';
      const answer = 'The landing page should focus on product features.';

      mockRequirementModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: requirementId,
          text: 'Create a landing page',
          status: 'in_clarification',
          clarificationHistory: [
            {
              questionId: 'q1',
              question: 'What is the main purpose?',
            },
          ],
          save: jest.fn().mockResolvedValue({
            _id: requirementId,
            text: 'Create a landing page',
            status: 'in_clarification',
            clarificationHistory: [
              {
                questionId: 'q1',
                question: 'What is the main purpose?',
                answer: 'The main purpose is to showcase our product',
              },
            ],
          }),
        }),
      });

      const result = await clarifierService.processClarificationAnswer(
        requirementId,
        questionId,
        answer,
      );

      expect(enrichWithContextSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('generateExpectations', () => {
    it('should use semantic mediator to translate requirements to expectations', async () => {
      const translateSpy = jest.spyOn(semanticMediatorService, 'translateBetweenModules');

      const requirementId = 'test-req-123';

      mockRequirementModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: requirementId,
          text: 'Create a landing page',
          status: 'clarified',
          clarificationHistory: [
            {
              questionId: 'q1',
              question: 'What is the main purpose?',
              answer: 'To showcase product features',
            },
          ],
          save: jest.fn().mockResolvedValue({
            _id: requirementId,
            text: 'Create a landing page',
            status: 'expectations_generated',
            clarificationHistory: [
              {
                questionId: 'q1',
                question: 'What is the main purpose?',
                answer: 'To showcase product features',
              },
            ],
          }),
        }),
      });

      const result = await clarifierService.generateExpectations(requirementId);

      expect(translateSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('analyzeMultiRoundDialogue', () => {
    it('should use semantic mediator to resolve semantic conflicts in dialogue', async () => {
      const resolveConflictsSpy = jest.spyOn(semanticMediatorService, 'resolveSemanticConflicts');

      const requirementId = 'test-req-123';

      mockRequirementModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: requirementId,
          text: 'Create a landing page',
          status: 'clarified',
          clarifications: [
            {
              questionId: 'q1',
              question: 'What is the main purpose?',
              answer: 'To showcase product features',
              timestamp: new Date().toISOString(),
            },
            {
              questionId: 'q2',
              question: 'Who are the target users?',
              answer: 'Tech-savvy professionals',
              timestamp: new Date().toISOString(),
            },
          ],
          dialogueLog: [
            {
              type: 'question',
              content: 'What is the main purpose?',
              timestamp: new Date().toISOString(),
            },
            {
              type: 'answer',
              content: 'To showcase product features',
              timestamp: new Date().toISOString(),
            },
            {
              type: 'question',
              content: 'Who are the target users?',
              timestamp: new Date().toISOString(),
            },
            {
              type: 'answer',
              content: 'Tech-savvy professionals',
              timestamp: new Date().toISOString(),
            },
          ],
          save: jest.fn().mockImplementation(function () {
            return Promise.resolve(this);
          }),
        }),
      });

      const result = await clarifierService.analyzeMultiRoundDialogue(requirementId);

      expect(resolveConflictsSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('generateExpectationSummary', () => {
    it('should use semantic mediator to track semantic transformation for summaries', async () => {
      const trackTransformationSpy = jest.spyOn(
        semanticMediatorService,
        'trackSemanticTransformation',
      );

      const expectationId = 'test-exp-123';

      mockExpectationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: expectationId,
          requirementId: '12345',
          model: {
            description: 'Landing page with product features',
            priority: 'high',
            features: ['Product showcase', 'Modern design'],
            mainGoal: 'Showcase product features',
          },
          save: jest.fn().mockImplementation(function () {
            return Promise.resolve(this);
          }),
        }),
      });

      const result = await clarifierService.generateExpectationSummary(expectationId);

      expect(trackTransformationSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
