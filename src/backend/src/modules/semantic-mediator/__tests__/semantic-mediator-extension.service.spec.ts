import { Test, TestingModule } from '@nestjs/testing';
import { SemanticMediatorExtensionService } from '../services/semantic-mediator-extension.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticMediatorService } from '../semantic-mediator.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { DataAccessService } from '../../memory/services/data-access.service';
import { CacheAccessService } from '../../memory/services/cache-access.service';
import { LlmRouterService } from '../../../services/llm-router.service';

// 创建模拟服务
const createMockMemoryService = () => ({
  storeMemory: jest.fn().mockResolvedValue({ _id: 'mock-id', content: {} }),
  updateMemory: jest.fn().mockResolvedValue({ _id: 'mock-id', content: {} }),
  searchMemories: jest.fn().mockResolvedValue([]),
  getMemoryByType: jest.fn().mockResolvedValue([]),
  getBySemanticIntent: jest.fn().mockResolvedValue([]),
});

const createMockSemanticMediatorService = () => ({
  translateToSchema: jest.fn().mockResolvedValue({}),
  registerSemanticDataSource: jest.fn().mockResolvedValue({}),
  evaluateSemanticTransformation: jest.fn().mockResolvedValue({ semanticPreservation: 80 }),
});

describe('SemanticMediatorExtensionService', () => {
  let service: SemanticMediatorExtensionService;
  let memoryService: MemoryService;
  let semanticMediatorService: SemanticMediatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticMediatorExtensionService,
        {
          provide: MemoryService,
          useFactory: createMockMemoryService,
        },
        {
          provide: SemanticMediatorService,
          useFactory: createMockSemanticMediatorService,
        },
      ],
    }).compile();

    service = module.get<SemanticMediatorExtensionService>(SemanticMediatorExtensionService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticMediatorService = module.get<SemanticMediatorService>(SemanticMediatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeWithSemanticTransformation', () => {
    it('should transform data and store it', async () => {
      const mockData = { type: 'test', value: 'data' };
      const mockSchema = { id: 'schema-id', properties: {} };
      const mockTransformed = { transformed: true };
      
      (semanticMediatorService.translateToSchema as jest.Mock).mockResolvedValue(mockTransformed);
      
      const result = await service.storeWithSemanticTransformation(mockData, mockSchema);
      
      expect(semanticMediatorService.translateToSchema).toHaveBeenCalledWith(mockData, mockSchema);
      expect(memoryService.storeMemory).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('registerAsDataSource', () => {
    it('should register memory type as a data source', async () => {
      const memoryType = MemoryType.REQUIREMENT;
      const description = 'Test description';
      
      await service.registerAsDataSource(memoryType, description);
      
      expect(semanticMediatorService.registerSemanticDataSource).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });
  });

  describe('recordTransformationFeedback', () => {
    it('should record feedback for a transformation', async () => {
      const transformationId = 'test-id';
      const feedback = { 
        rating: 4, 
        comments: 'Good job', 
        providedBy: 'user',
        transformationId: 'test-id',
        timestamp: new Date(),
        severity: 'low'
      };
      const mockTransformation = { _id: 'mock-id', content: { data: 'test' } };
      
      (memoryService.searchMemories as jest.Mock).mockResolvedValue([mockTransformation]);
      
      await service.recordTransformationFeedback(transformationId, feedback);
      
      expect(memoryService.searchMemories).toHaveBeenCalledWith(`transformationId:${transformationId}`, 1);
      expect(memoryService.storeMemory).toHaveBeenCalled();
      expect(memoryService.updateMemory).toHaveBeenCalled();
    });
    
    it('should throw an error when transformation is not found', async () => {
      const transformationId = 'non-existent-id';
      const feedback = { 
        rating: 4, 
        comments: 'Good job', 
        providedBy: 'user',
        transformationId: 'non-existent-id',
        timestamp: new Date(),
        severity: 'low'
      };
      
      (memoryService.searchMemories as jest.Mock).mockResolvedValue([]);
      
      await expect(service.recordTransformationFeedback(transformationId, feedback))
        .rejects.toThrow(`Transformation with ID ${transformationId} not found`);
    });
  });

  describe('validateSemanticConsistency', () => {
    it('should validate data against constraints', async () => {
      const data = { title: 'Test Title', status: 'active' };
      
      const result = await service.validateSemanticConsistency(data, MemoryType.REQUIREMENT);
      
      expect(result.isValid).toBe(true);
    });
    
    it('should return invalid result for data not meeting constraints', async () => {
      const data = { title: 'Te', status: 'invalid_status' };
      
      const result = await service.validateSemanticConsistency(data, MemoryType.REQUIREMENT);
      
      expect(result.isValid).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });
}); 