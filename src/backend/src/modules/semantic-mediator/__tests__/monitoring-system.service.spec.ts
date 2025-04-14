import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringSystemService } from '../components/monitoring-system/monitoring-system.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { Logger } from '@nestjs/common';

describe('MonitoringSystemService', () => {
  let service: MonitoringSystemService;
  let memoryService: MemoryService;

  beforeEach(async () => {
    const mockMemoryService = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.SYSTEM) {
          return Promise.resolve([
            {
              content: {
                type: 'transformation_event',
                id: 'event-1',
                sourceModule: 'clarifier',
                targetModule: 'generator',
                timestamp: '2023-01-01T00:00:00.000Z',
                duration: 100,
                status: 'success'
              },
              tags: ['monitoring', 'transformation', 'success']
            },
            {
              content: {
                type: 'error_event',
                id: 'error-1',
                module: 'validator',
                timestamp: '2023-01-01T01:00:00.000Z',
                errorType: 'validation_error',
                message: 'Failed to validate code',
                stackTrace: 'Error: Failed to validate code\n    at ValidatorService.validate'
              },
              tags: ['monitoring', 'error', 'validator']
            },
            {
              content: {
                type: 'performance_metric',
                id: 'metric-1',
                module: 'semantic-mediator',
                operation: 'translateBetweenModules',
                timestamp: '2023-01-01T02:00:00.000Z',
                duration: 150,
                resourceUsage: { cpu: 0.5, memory: 100 }
              },
              tags: ['monitoring', 'performance', 'semantic-mediator']
            }
          ]);
        }
        return Promise.resolve([]);
      }),
      getRelatedMemories: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringSystemService,
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() } }
      ],
    }).compile();

    service = module.get<MonitoringSystemService>(MonitoringSystemService);
    memoryService = module.get<MemoryService>(MemoryService);
  });

  describe('logTransformationEvent', () => {
    it('should log a transformation event to memory', async () => {
      const event = {
        sourceModule: 'clarifier',
        targetModule: 'generator',
        data: { key: 'value' },
        result: { transformed: true },
        duration: 100,
        status: 'success'
      };
      
      const eventId = await service.logTransformationEvent(event);
      
      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'transformation_event',
            event
          }),
          tags: expect.arrayContaining(['monitoring', 'transformation_event'])
        })
      );
    });

    it('should handle transformation events with errors', async () => {
      const event = {
        sourceModule: 'clarifier',
        targetModule: 'generator',
        data: { key: 'value' },
        error: new Error('Transformation failed'),
        duration: 100,
        status: 'error'
      };
      
      const eventId = await service.logTransformationEvent(event);
      
      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            type: 'transformation_event',
            event: expect.objectContaining({
              error: expect.any(Error)
            })
          })
        })
      );
    });
  });

  describe('logError', () => {
    it('should log an error event to memory', async () => {
      const error = new Error('Test error');
      const context = { operation: 'test-operation' };
      
      const errorId = await service.logError(error, context);
      
      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'error',
            error: expect.objectContaining({
              message: error.message
            }),
            context
          }),
          tags: expect.arrayContaining(['monitoring', 'error'])
        })
      );
    });

    it('should handle errors with stack traces', async () => {
      const error = new Error('Test error with stack');
      error.stack = 'Error: Test error with stack\n    at MonitoringSystemService.test';
      
      const errorId = await service.logError(error);
      
      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            error: expect.objectContaining({
              stack: error.stack
            })
          })
        })
      );
    });
  });

  describe('recordPerformanceMetrics', () => {
    it('should record performance metrics to memory', async () => {
      const metrics = {
        module: 'test-module',
        operation: 'test-operation',
        duration: 150,
        resourceUsage: { cpu: 0.5, memory: 100 }
      };
      
      const result = await service.recordPerformanceMetrics(metrics);
      
      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'performance_metrics',
            metrics
          }),
          tags: expect.arrayContaining(['monitoring', 'performance_metrics'])
        })
      );
    });

    it('should handle metrics without resource usage', async () => {
      const metrics = {
        module: 'test-module',
        operation: 'test-operation',
        duration: 150
      };
      
      const result = await service.recordPerformanceMetrics(metrics);
      
      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });
  });

  describe('getTransformationHistory', () => {
    it('should retrieve transformation events from memory', async () => {
      const filters = { sourceModule: 'clarifier' };
      const limit = 10;
      
      const result = await service.getTransformationHistory(filters, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(MemoryType.SYSTEM, limit);
    });

    it('should filter events based on provided filters', async () => {
      const filters = { status: 'error' };
      
      const result = await service.getTransformationHistory(filters);
      
      expect(result).toBeInstanceOf(Array);
    });

    it('should limit the number of results', async () => {
      const limit = 1;
      
      const result = await service.getTransformationHistory({}, limit);
      
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getErrorHistory', () => {
    it('should retrieve error events from memory', async () => {
      const filters = { module: 'validator' };
      const limit = 10;
      
      const result = await service.getErrorHistory(filters, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(MemoryType.SYSTEM, limit);
    });

    it('should filter events based on provided filters', async () => {
      const filters = { 'error.message': 'Failed to validate code' };
      
      const result = await service.getErrorHistory(filters);
      
      expect(result).toBeInstanceOf(Array);
    });

    it('should limit the number of results', async () => {
      const limit = 1;
      
      const result = await service.getErrorHistory({}, limit);
      
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getPerformanceReport', () => {
    it('should generate a performance report', async () => {
      const timeRange = { 
        start: new Date('2023-01-01T00:00:00.000Z'), 
        end: new Date('2023-01-02T00:00:00.000Z') 
      };
      
      const result = await service.getPerformanceReport(timeRange);
      
      expect(result).toBeDefined();
      expect(result.timeRange).toBe(timeRange);
      expect(result.metrics).toBeDefined();
      expect(result.rawData).toBeInstanceOf(Array);
    });

    it('should handle empty metrics', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      
      const result = await service.getPerformanceReport();
      
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.count).toBe(0);
    });
  });

  describe('createDebugSession', () => {
    it('should create a debug session', async () => {
      const context = { source: 'unit test' };
      
      const sessionId = await service.createDebugSession(context);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'debug_session',
            context,
            status: 'active'
          }),
          tags: expect.arrayContaining(['monitoring', 'debug_session'])
        })
      );
    });
  });

  describe('endDebugSession', () => {
    it('should end a debug session', async () => {
      const context = { source: 'unit test' };
      const sessionId = await service.createDebugSession(context);
      
      const result = await service.endDebugSession(sessionId);
      
      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            type: 'debug_session',
            status: 'completed',
            endTime: expect.any(String)
          })
        })
      );
    });

    it('should return false if session is not found', async () => {
      const result = await service.endDebugSession('non-existent-id');
      
      expect(result).toBe(false);
    });
  });

  describe('logDebugData', () => {
    it('should log debug data to a session', async () => {
      const context = { source: 'unit test' };
      const sessionId = await service.createDebugSession(context);
      const data = { key: 'value', testData: true };
      
      const result = await service.logDebugData(sessionId, data);
      
      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            type: 'debug_data',
            sessionId,
            entry: expect.objectContaining({
              data
            })
          })
        })
      );
    });

    it('should return false if session is not found', async () => {
      const result = await service.logDebugData('non-existent-id', { key: 'value' });
      
      expect(result).toBe(false);
    });
  });

  describe('getDebugSessionData', () => {
    it('should retrieve debug session data', async () => {
      const context = { source: 'unit test' };
      const sessionId = await service.createDebugSession(context);
      
      const result = await service.getDebugSessionData(sessionId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(sessionId);
      expect(result.status).toBe('active');
      expect(result.context).toEqual(context);
    });

    it('should retrieve session data from memory if not in local cache', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockImplementation((type) => {
        if (type === MemoryType.SYSTEM) {
          return Promise.resolve([
            {
              content: {
                type: 'debug_session',
                id: 'test-session-id',
                status: 'active',
                context: {}
              },
              tags: ['monitoring', 'debug_session']
            }
          ]);
        }
        return Promise.resolve([]);
      });
      
      const result = await service.getDebugSessionData('test-session-id');
      
      expect(result).toBeDefined();
    });
  });

  describe('aggregateMetrics', () => {
    it('should aggregate numeric metrics correctly', () => {
      const metrics = [
        { duration: 100, cpu: 0.5, memory: 200 },
        { duration: 150, cpu: 0.7, memory: 300 },
        { duration: 200, cpu: 0.3, memory: 250 }
      ];
      
      const result = (service as any).aggregateMetrics(metrics);
      
      expect(result).toBeDefined();
      expect(result.count).toBe(3);
      expect(result.averages.duration).toBe((100 + 150 + 200) / 3);
      expect(result.min.duration).toBe(100);
      expect(result.max.duration).toBe(200);
    });

    it('should handle empty metrics array', () => {
      const result = (service as any).aggregateMetrics([]);
      
      expect(result).toBeDefined();
      expect(result.count).toBe(0);
    });

    it('should handle null metrics', () => {
      const result = (service as any).aggregateMetrics(null);
      
      expect(result).toBeDefined();
      expect(result.count).toBe(0);
    });
  });
});
