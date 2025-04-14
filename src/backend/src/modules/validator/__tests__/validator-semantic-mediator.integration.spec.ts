import { Test, TestingModule } from '@nestjs/testing';
import { ValidatorService } from '../validator.service';
import { SemanticMediatorService } from '../../semantic-mediator/semantic-mediator.service';
import { ValidatorModule } from '../validator.module';
import { SemanticMediatorModule } from '../../semantic-mediator/semantic-mediator.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Validation, ValidationSchema } from '../schemas/validation.schema';
import { LlmModule } from '../../../services/llm.module';
import { MemoryModule } from '../../memory/memory.module';
import { MemoryType } from '../../memory/schemas/memory.schema';

describe('ValidatorService and SemanticMediatorService Integration', () => {
  let validatorService: ValidatorService;
  let semanticMediatorService: SemanticMediatorService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost/expeta-test'),
        MongooseModule.forFeature([
          { name: Validation.name, schema: ValidationSchema },
        ]),
        LlmModule,
        MemoryModule,
        SemanticMediatorModule,
        ValidatorModule,
      ],
    }).compile();

    validatorService = moduleRef.get<ValidatorService>(ValidatorService);
    semanticMediatorService = moduleRef.get<SemanticMediatorService>(SemanticMediatorService);
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe('Integration between ValidatorService and SemanticMediatorService', () => {
    it('should use semantic mediator to generate validation context', async () => {
      const generateValidationContextSpy = jest.spyOn(
        semanticMediatorService,
        'generateValidationContext',
      );

      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const expectationMemory = {
        content: {
          _id: expectationId,
          model: 'Create a function that adds two numbers',
        },
      };
      const codeMemory = {
        content: {
          _id: codeId,
          files: [{ path: 'test.js', content: 'function add(a, b) { return a + b; }' }],
        },
      };

      jest.spyOn(validatorService['memoryService'], 'getMemoryByType')
        .mockImplementation((type: MemoryType) => {
          if (type === MemoryType.EXPECTATION) {
            return Promise.resolve([expectationMemory] as any);
          } else if (type === MemoryType.CODE) {
            return Promise.resolve([codeMemory] as any);
          }
          return Promise.resolve([]);
        });

      jest.spyOn(validatorService['validationModel'], 'create').mockReturnValue({
        id: 'test-validation-id',
        expectationId,
        codeId,
        result: { passed: true, feedback: 'Good job!' },
        metadata: {},
        save: jest.fn().mockResolvedValue({}),
      } as any);

      await validatorService.validateCodeWithSemanticInput(expectationId, codeId, {
        semanticContext: 'Test semantic context',
        focusAreas: ['functionality'],
      });

      expect(generateValidationContextSpy).toHaveBeenCalled();
    });

    it('should use semantic mediator for adaptive context validation', async () => {
      const generateValidationContextSpy = jest.spyOn(
        semanticMediatorService,
        'generateValidationContext',
      );
      const translateBetweenModulesSpy = jest.spyOn(
        semanticMediatorService,
        'translateBetweenModules',
      );

      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const expectationMemory = {
        content: {
          _id: expectationId,
          model: 'Create a function that adds two numbers',
        },
      };
      const codeMemory = {
        content: {
          _id: codeId,
          files: [{ path: 'test.js', content: 'function add(a, b) { return a + b; }' }],
        },
      };

      jest.spyOn(validatorService['memoryService'], 'getMemoryByType')
        .mockImplementation((type: MemoryType) => {
          if (type === MemoryType.EXPECTATION) {
            return Promise.resolve([expectationMemory] as any);
          } else if (type === MemoryType.CODE) {
            return Promise.resolve([codeMemory] as any);
          }
          return Promise.resolve([]);
        });

      jest.spyOn(validatorService['validationModel'], 'create').mockReturnValue({
        id: 'test-validation-id',
        expectationId,
        codeId,
        result: { passed: true, feedback: 'Good job!' },
        metadata: {},
        save: jest.fn().mockResolvedValue({}),
      } as any);

      await validatorService.validateWithAdaptiveContext(expectationId, codeId, {
        strategy: 'balanced',
        focusAreas: ['functionality', 'performance'],
      });

      expect(generateValidationContextSpy).toHaveBeenCalled();
      expect(translateBetweenModulesSpy).toHaveBeenCalled();
    });

    it('should use semantic mediator for full semantic mediation validation', async () => {
      const generateValidationContextSpy = jest.spyOn(
        semanticMediatorService,
        'generateValidationContext',
      );
      const translateBetweenModulesSpy = jest.spyOn(
        semanticMediatorService,
        'translateBetweenModules',
      );
      const trackSemanticTransformationSpy = jest.spyOn(
        semanticMediatorService,
        'trackSemanticTransformation',
      );

      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const expectationMemory = {
        content: {
          _id: expectationId,
          model: 'Create a function that adds two numbers',
        },
      };
      const codeMemory = {
        content: {
          _id: codeId,
          files: [{ path: 'test.js', content: 'function add(a, b) { return a + b; }' }],
        },
      };

      jest.spyOn(validatorService['memoryService'], 'getMemoryByType')
        .mockImplementation((type: MemoryType) => {
          if (type === MemoryType.EXPECTATION) {
            return Promise.resolve([expectationMemory] as any);
          } else if (type === MemoryType.CODE) {
            return Promise.resolve([codeMemory] as any);
          }
          return Promise.resolve([]);
        });

      jest.spyOn(validatorService['validationModel'], 'create').mockReturnValue({
        id: 'test-validation-id',
        expectationId,
        codeId,
        result: { passed: true, feedback: 'Good job!' },
        metadata: {},
        save: jest.fn().mockResolvedValue({}),
      } as any);

      await validatorService.validateWithSemanticMediation(expectationId, codeId, {
        strategy: 'balanced',
        focusAreas: ['functionality', 'performance', 'security'],
        iterative: true,
      });

      expect(generateValidationContextSpy).toHaveBeenCalled();
      expect(translateBetweenModulesSpy).toHaveBeenCalled();
      expect(trackSemanticTransformationSpy).toHaveBeenCalled();
    });
  });
});
