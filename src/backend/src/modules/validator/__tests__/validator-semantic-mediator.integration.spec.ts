import { Test } from '@nestjs/testing';
import { ValidatorService } from '../validator.service';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';
import { Model } from 'mongoose';
import { Validation } from '../schemas/validation.schema';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../../memory/memory.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { Logger } from '@nestjs/common';

describe('ValidatorService and SemanticMediatorService Integration', () => {
  let validatorService: ValidatorService;
  let semanticMediatorService: SemanticMediatorService;
  let memoryService: MemoryService;
  let llmRouterService: LlmRouterService;
  let validationModel: Model<Validation>;

  beforeEach(async () => {
    // Create mock services
    memoryService = {
      getMemoryByType: jest.fn(),
      storeMemory: jest.fn().mockResolvedValue({}),
    } as any;

    llmRouterService = {
      generateContent: jest.fn().mockResolvedValue('{"status":"passed","score":90,"details":[]}'),
    } as any;

    semanticMediatorService = {
      generateValidationContext: jest.fn().mockResolvedValue({
        semanticContext: {
          codeFeatures: { complexity: 'low' },
          semanticRelationship: { alignment: 'high' },
        },
      }),
      enrichWithContext: jest.fn().mockImplementation((_, data) => Promise.resolve(data)),
      translateBetweenModules: jest.fn().mockResolvedValue('test prompt'),
      trackSemanticTransformation: jest.fn().mockResolvedValue({}),
    } as any;

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

    validationModel = ValidationModelMock as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ValidatorService,
        { provide: SemanticMediatorService, useValue: semanticMediatorService },
        { provide: MemoryService, useValue: memoryService },
        { provide: LlmRouterService, useValue: llmRouterService },
        { provide: getModelToken(Validation.name), useValue: validationModel },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    validatorService = moduleRef.get<ValidatorService>(ValidatorService);
  });

  describe('Integration between ValidatorService and SemanticMediatorService', () => {
    it('should use semantic mediator to generate validation context', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const expectationMemory = {
        content: {
          _id: { toString: () => expectationId },
          model: 'Create a function that adds two numbers',
        },
      };
      const codeMemory = {
        content: {
          _id: { toString: () => codeId },
          files: [{ path: 'test.js', content: 'function add(a, b) { return a + b; }' }],
        },
      };

      // Mock memory service methods that are called by the validator service
      (memoryService.getMemoryByType as jest.Mock).mockImplementation((type: MemoryType) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([expectationMemory]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([codeMemory]);
        }
        return Promise.resolve([]);
      });

      // Call the validator service method that should use the semantic mediator
      await validatorService.validateCodeWithSemanticInput(expectationId, codeId, {
        semanticContext: 'Test semantic context',
        focusAreas: ['functionality'],
      });

      // Verify that the semantic mediator's method was called
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalled();
      expect(semanticMediatorService.enrichWithContext).toHaveBeenCalled();
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalled();
    });

    it('should use semantic mediator for adaptive context validation', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const expectationMemory = {
        content: {
          _id: { toString: () => expectationId },
          model: 'Create a function that adds two numbers',
        },
      };
      const codeMemory = {
        content: {
          _id: { toString: () => codeId },
          files: [{ path: 'test.js', content: 'function add(a, b) { return a + b; }' }],
        },
      };

      // Mock memory service methods
      (memoryService.getMemoryByType as jest.Mock).mockImplementation((type: MemoryType) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([expectationMemory]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([codeMemory]);
        }
        return Promise.resolve([]);
      });

      // Call the validator service method that should use the semantic mediator
      await validatorService.validateWithAdaptiveContext(expectationId, codeId, {
        strategy: 'balanced',
        focusAreas: ['functionality', 'performance'],
      });

      // Verify that the semantic mediator's methods were called
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalled();
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalled();
    });

    it('should use semantic mediator for full semantic mediation validation', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const expectationMemory = {
        content: {
          _id: { toString: () => expectationId },
          model: 'Create a function that adds two numbers',
        },
      };
      const codeMemory = {
        content: {
          _id: { toString: () => codeId },
          files: [{ path: 'test.js', content: 'function add(a, b) { return a + b; }' }],
        },
      };

      // Mock memory service methods
      (memoryService.getMemoryByType as jest.Mock).mockImplementation((type: MemoryType) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([expectationMemory]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([codeMemory]);
        }
        return Promise.resolve([]);
      });

      // Call the validator service method that should use the semantic mediator
      await validatorService.validateWithSemanticMediation(expectationId, codeId, {
        strategy: 'balanced',
        focusAreas: ['functionality', 'performance', 'security'],
        iterative: true,
      });

      // Verify that the semantic mediator's methods were called
      expect(semanticMediatorService.generateValidationContext).toHaveBeenCalled();
      expect(semanticMediatorService.translateBetweenModules).toHaveBeenCalled();
      expect(semanticMediatorService.trackSemanticTransformation).toHaveBeenCalled();
    });
  });
});
