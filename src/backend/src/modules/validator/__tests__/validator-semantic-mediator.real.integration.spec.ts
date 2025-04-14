import { Test, TestingModule } from '@nestjs/testing';
import { ValidatorService } from '../validator.service';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';
import { Validation } from '../schemas/validation.schema';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../../memory/memory.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { Logger } from '@nestjs/common';

import { SemanticRegistryService } from '../../semantic-mediator/components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from '../../semantic-mediator/components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from '../../semantic-mediator/components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from '../../semantic-mediator/components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from '../../semantic-mediator/components/human-in-the-loop/human-in-the-loop.service';

describe('ValidatorService and SemanticMediatorService Real Integration', () => {
  let validatorService: ValidatorService;
  let semanticMediatorService: SemanticMediatorService;
  let _memoryService: MemoryService;
  let _llmRouterService: LlmRouterService;
  let moduleRef: TestingModule;

  const expectationId = 'test-expectation-id';
  const codeId = 'test-code-id';

  beforeEach(async () => {
    const semanticRegistryService = {
      registerEntity: jest.fn().mockResolvedValue({}),
      findEntity: jest.fn().mockResolvedValue({}),
    };

    const transformationEngineService = {
      generateTransformationPath: jest.fn().mockResolvedValue({}),
      executeTransformation: jest.fn().mockResolvedValue({}),
      validateTransformation: jest.fn().mockResolvedValue({ valid: true }),
    };

    const intelligentCacheService = {
      retrieveTransformationPath: jest.fn().mockResolvedValue(null),
      storeTransformationPath: jest.fn().mockResolvedValue({}),
      updateUsageStatistics: jest.fn().mockResolvedValue({}),
    };

    const monitoringSystemService = {
      logTransformationEvent: jest.fn().mockResolvedValue({}),
      logError: jest.fn().mockResolvedValue({}),
    };

    const humanInTheLoopService = {
      requestReview: jest.fn().mockResolvedValue({}),
      submitFeedback: jest.fn().mockResolvedValue({}),
    };

    const ValidationModelMock = function () {
      return {
        save: jest.fn().mockResolvedValue({}),
      };
    };

    ValidationModelMock.create = jest.fn().mockReturnValue({
      save: jest.fn().mockResolvedValue({}),
    });
    ValidationModelMock.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });
    ValidationModelMock.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const mockMemoryService = {
      getMemoryByType: jest.fn().mockImplementation((type: MemoryType) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([
            {
              content: {
                _id: { toString: () => expectationId },
                model: 'Create a function that adds two numbers and returns the result',
              },
            },
          ]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([
            {
              content: {
                _id: { toString: () => codeId },
                files: [
                  {
                    path: 'add.js',
                    content: 'function add(a, b) { return a + b; }',
                  },
                ],
              },
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      getRelatedMemories: jest.fn().mockResolvedValue([
        {
          content: {
            _id: 'related-memory-id',
            type: 'test-memory',
            data: 'Test related memory data',
          },
        },
      ]),
      storeMemory: jest.fn().mockResolvedValue({
        content: {
          _id: { toString: () => 'test-memory-id' },
        },
      }),
    };
    
    const mockLlmRouterService = {
      generateContent: jest.fn().mockResolvedValue('{"status":"passed","score":90,"details":[]}'),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        ValidatorService,
        SemanticMediatorService,
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: SemanticRegistryService, useValue: semanticRegistryService },
        { provide: TransformationEngineService, useValue: transformationEngineService },
        { provide: IntelligentCacheService, useValue: intelligentCacheService },
        { provide: MonitoringSystemService, useValue: monitoringSystemService },
        { provide: HumanInTheLoopService, useValue: humanInTheLoopService },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), debug: jest.fn() } },
        { provide: getModelToken(Validation.name), useValue: ValidationModelMock },
      ],
    }).compile();

    validatorService = moduleRef.get<ValidatorService>(ValidatorService);
    semanticMediatorService = moduleRef.get<SemanticMediatorService>(SemanticMediatorService);
    _memoryService = moduleRef.get<MemoryService>(MemoryService);
    _llmRouterService = moduleRef.get<LlmRouterService>(LlmRouterService);
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    jest.clearAllMocks();
  });

  describe('Real Integration between ValidatorService and SemanticMediatorService', () => {
    it('should use semantic mediator to generate validation context', async () => {
      const generateValidationContextSpy = jest
        .spyOn(semanticMediatorService, 'generateValidationContext')
        .mockResolvedValue({
          semanticContext: {
            codeFeatures: { complexity: 'low' },
            semanticRelationship: { alignment: 'high' },
          },
        });

      const translateBetweenModulesSpy = jest
        .spyOn(semanticMediatorService, 'translateBetweenModules')
        .mockResolvedValue('test prompt');

      const result = await validatorService.validateCodeWithSemanticInput(expectationId, codeId, {
        semanticContext: 'Test semantic context',
        focusAreas: ['functionality'],
      });

      expect(generateValidationContextSpy).toHaveBeenCalled();
      expect(translateBetweenModulesSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should use semantic mediator for adaptive context validation', async () => {
      const generateValidationContextSpy = jest
        .spyOn(semanticMediatorService, 'generateValidationContext')
        .mockResolvedValue({
          semanticContext: {
            codeFeatures: { complexity: 'low' },
            semanticRelationship: { alignment: 'high' },
          },
        });

      const translateBetweenModulesSpy = jest
        .spyOn(semanticMediatorService, 'translateBetweenModules')
        .mockResolvedValue('test prompt');

      const result = await validatorService.validateWithAdaptiveContext(expectationId, codeId, {
        strategy: 'balanced',
        focusAreas: ['functionality', 'performance'],
      });

      expect(generateValidationContextSpy).toHaveBeenCalled();
      expect(translateBetweenModulesSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should use semantic mediator for full semantic mediation validation', async () => {
      const generateValidationContextSpy = jest
        .spyOn(semanticMediatorService, 'generateValidationContext')
        .mockResolvedValue({
          semanticContext: {
            codeFeatures: { complexity: 'low' },
            semanticRelationship: { alignment: 'high' },
          },
        });

      const translateBetweenModulesSpy = jest
        .spyOn(semanticMediatorService, 'translateBetweenModules')
        .mockResolvedValue('test prompt');

      const trackSemanticTransformationSpy = jest
        .spyOn(semanticMediatorService, 'trackSemanticTransformation')
        .mockResolvedValue({});

      const result = await validatorService.validateWithSemanticMediation(expectationId, codeId, {
        strategy: 'balanced',
        focusAreas: ['functionality', 'performance', 'security'],
        iterative: true,
      });

      expect(generateValidationContextSpy).toHaveBeenCalled();
      expect(translateBetweenModulesSpy).toHaveBeenCalled();
      expect(trackSemanticTransformationSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
