import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ClarifierService } from '../clarifier.service';
import { Requirement } from '../schemas/requirement.schema';
import { Expectation } from '../schemas/expectation.schema';
import { LlmService } from '../../../services/llm.service';
import { MemoryService } from '../../memory/memory.service';
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
    
    mockExpectationModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
    
    const mockLlmService = {
      generateContent: jest.fn().mockResolvedValue('{"result": "test"}'),
    };
    
    const mockMemoryService = {
      storeRequirement: jest.fn().mockResolvedValue(null),
      updateRequirement: jest.fn().mockResolvedValue(null),
      deleteRequirement: jest.fn().mockResolvedValue(null),
      storeMemory: jest.fn().mockResolvedValue(null),
      getRelatedMemories: jest.fn().mockResolvedValue([]),
      getMemoryByType: jest.fn().mockResolvedValue([]),
    };
    
    const mockSemanticRegistry = { registerSemanticDataSource: jest.fn() };
    const mockTransformationEngine = { 
      executeTransformation: jest.fn().mockImplementation((data) => Promise.resolve(data)), 
      generateTransformationPath: jest.fn().mockResolvedValue({}),
      validateTransformation: jest.fn().mockResolvedValue({ valid: true }),
    };
    const mockIntelligentCache = { 
      retrieveTransformationPath: jest.fn().mockResolvedValue(null), 
      storeTransformationPath: jest.fn(),
      updateUsageStatistics: jest.fn(),
    };
    const mockMonitoringSystem = { 
      logTransformationEvent: jest.fn(),
      logError: jest.fn(),
      createDebugSession: jest.fn().mockResolvedValue('session-id'),
      logDebugData: jest.fn(),
      endDebugSession: jest.fn(),
    };
    const mockHumanInTheLoop = {};
    
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
          useValue: {
            extractSemanticInsights: jest.fn(),
            enrichWithContext: jest.fn(),
            translateBetweenModules: jest.fn(),
            resolveSemanticConflicts: jest.fn(),
            trackSemanticTransformation: jest.fn(),
            transformationEngine: mockTransformationEngine,
            intelligentCache: mockIntelligentCache,
            monitoringSystem: mockMonitoringSystem,
            semanticRegistry: mockSemanticRegistry,
            humanInTheLoop: mockHumanInTheLoop,
          },
        },
      ],
    }).compile();
    
    clarifierService = module.get<ClarifierService>(ClarifierService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);
  });
  
  describe('generateClarificationQuestions', () => {
    it('should use semantic mediator to extract insights from requirement text', async () => {
      const extractInsightsSpy = jest.spyOn(semanticMediatorService, 'extractSemanticInsights');
      extractInsightsSpy.mockResolvedValue({
        questions: [
          {
            id: 'q1',
            question: 'What is the main purpose of this feature?',
            context: 'Understanding core functionality',
          },
          {
            id: 'q2',
            question: 'Who are the target users?',
            context: 'User demographics',
          },
        ],
      });
      
      const requirementText = 'Create a landing page for our product';
      const result = await clarifierService.generateClarificationQuestions(requirementText);
      
      expect(extractInsightsSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('questions');
      expect(result.questions).toHaveLength(2);
    });
    
    it('should handle errors from semantic mediator gracefully', async () => {
      jest.spyOn(semanticMediatorService, 'extractSemanticInsights')
        .mockRejectedValue(new Error('Insight extraction failed'));
      
      const requirementText = 'Create a landing page for our product';
      
      await expect(clarifierService.generateClarificationQuestions(requirementText))
        .rejects.toThrow('Failed to generate clarification questions');
    });
  });
  
  describe('processClarificationAnswer', () => {
    it('should use semantic mediator to enrich answer with context', async () => {
      const enrichWithContextSpy = jest.spyOn(semanticMediatorService, 'enrichWithContext');
      enrichWithContextSpy.mockResolvedValue({
        clarificationHistory: [{
          questionId: 'q1',
          question: 'What is the main purpose?',
          answer: 'The main purpose is to showcase our product features'
        }],
        enriched: true,
        contextApplied: ['product information', 'marketing strategy'],
      });
      
      const requirementId = '12345';
      const questionId = 'q1';
      const answer = 'The main purpose is to showcase our product';
      
      mockRequirementModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: requirementId,
          text: 'Create a landing page',
          status: 'in_clarification',
          clarificationHistory: [{
            questionId: 'q1',
            question: 'What is the main purpose?',
          }],
          save: jest.fn().mockResolvedValue({
            _id: requirementId,
            text: 'Create a landing page',
            status: 'in_clarification',
            clarificationHistory: [{
              questionId: 'q1',
              question: 'What is the main purpose?',
              answer: 'The main purpose is to showcase our product',
            }],
          }),
        }),
      });
      
      const result = await clarifierService.processClarificationAnswer(requirementId, questionId, answer);
      
      expect(enrichWithContextSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('clarificationHistory');
      expect(result.clarificationHistory.some(c => c.questionId === questionId)).toBeTruthy();
    });
  });
  
  describe('generateExpectations', () => {
    it('should use semantic mediator to translate requirements to expectations', async () => {
      const translateSpy = jest.spyOn(semanticMediatorService, 'translateBetweenModules');
      translateSpy.mockResolvedValue({
        expectations: [
          {
            id: 'e1',
            description: 'Landing page with product features',
            priority: 'high',
          },
        ],
      });
      
      const requirementId = '12345';
      
      mockRequirementModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: requirementId,
          text: 'Create a landing page',
          status: 'clarified',
          clarificationHistory: [{
            questionId: 'q1',
            question: 'What is the main purpose?',
            answer: 'To showcase product features',
          }],
        }),
      });
      
      jest.spyOn(clarifierService, 'generateExpectations').mockImplementationOnce(async () => {
        await semanticMediatorService.translateBetweenModules(
          'clarifier',
          'generator',
          { requirementId }
        );
        
        return {
          _id: 'exp1',
          requirementId,
          model: {
            id: 'e1',
            description: 'Landing page with product features',
            priority: 'high',
          }
        };
      });
      
      const result = await clarifierService.generateExpectations(requirementId);
      
      expect(translateSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('model');
    });
  });
  
  describe('analyzeMultiRoundDialogue', () => {
    it('should use semantic mediator to resolve semantic conflicts in dialogue', async () => {
      const resolveConflictsSpy = jest.spyOn(semanticMediatorService, 'resolveSemanticConflicts');
      resolveConflictsSpy.mockResolvedValue({
        effectivenessScore: 85,
        clarityMetrics: { consistency: 90, specificity: 80 },
        keyInsights: ['User wants a modern design', 'Performance is critical'],
        recommendedFollowUp: ['Clarify mobile requirements', 'Discuss performance benchmarks'],
      });
      
      const requirementId = '12345';
      
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
            { type: 'question', content: 'What is the main purpose?', timestamp: new Date().toISOString() },
            { type: 'answer', content: 'To showcase product features', timestamp: new Date().toISOString() },
            { type: 'question', content: 'Who are the target users?', timestamp: new Date().toISOString() },
            { type: 'answer', content: 'Tech-savvy professionals', timestamp: new Date().toISOString() },
          ],
          save: jest.fn().mockResolvedValue({
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
              { type: 'question', content: 'What is the main purpose?', timestamp: new Date().toISOString() },
              { type: 'answer', content: 'To showcase product features', timestamp: new Date().toISOString() },
              { type: 'question', content: 'Who are the target users?', timestamp: new Date().toISOString() },
              { type: 'answer', content: 'Tech-savvy professionals', timestamp: new Date().toISOString() },
            ],
            metadata: {
              dialogueAnalysis: {
                effectivenessScore: 85,
                clarityMetrics: { consistency: 90, specificity: 80 },
                keyInsights: ['User wants a modern design', 'Performance is critical'],
                recommendedFollowUp: ['Clarify mobile requirements', 'Discuss performance benchmarks'],
              }
            }
          }),
        }),
      });
      
      const result = await clarifierService.analyzeMultiRoundDialogue(requirementId);
      
      expect(resolveConflictsSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('effectivenessScore');
      expect(result).toHaveProperty('keyInsights');
    });
  });
  
  describe('generateExpectationSummary', () => {
    it('should use semantic mediator to track semantic transformation for summaries', async () => {
      const trackTransformationSpy = jest.spyOn(semanticMediatorService, 'trackSemanticTransformation');
      trackTransformationSpy.mockResolvedValue({
        transformedData: {
          summary: 'A responsive landing page showcasing product features for tech professionals',
          keyFeatures: ['Product showcase', 'Modern design', 'Performance optimized'],
          targetAudience: 'Tech-savvy professionals',
        },
      });
      
      const expectationId = 'exp1';
      
      mockExpectationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: expectationId,
          requirementId: '12345',
          model: {
            description: 'Landing page with product features',
            priority: 'high',
            features: ['Product showcase', 'Modern design'],
          },
          save: jest.fn().mockResolvedValue({
            _id: expectationId,
            requirementId: '12345',
            model: {
              description: 'Landing page with product features',
              priority: 'high',
              features: ['Product showcase', 'Modern design'],
            },
            metadata: {
              summary: 'A responsive landing page showcasing product features for tech professionals'
            }
          }),
        }),
      });
      
      jest.spyOn(clarifierService, 'logDialogue').mockResolvedValue(undefined);
      
      const result = await clarifierService.generateExpectationSummary(expectationId);
      
      expect(trackTransformationSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('summary');
      expect(result.summary).toContain('landing page');
    });
  });
});
