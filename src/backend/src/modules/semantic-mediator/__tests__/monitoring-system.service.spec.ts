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
      
      const result = await service.logTransformationEvent(event);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'transformation_event',
            sourceModule: event.sourceModule,
            targetModule: event.targetModule,
            status: event.status
          }),
          tags: ['monitoring', 'transformation', 'success']
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
      
      const result = await service.logTransformationEvent(event);
      
      expect(result).toBeDefined();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            type: 'transformation_event',
            status: 'error',
            error: expect.objectContaining({
              message: 'Transformation failed'
            })
          }),
          tags: ['monitoring', 'transformation', 'error']
        })
      );
    });
  });

  describe('logError', () => {
    it('should log an error event to memory', async () => {
      const error = new Error('Test error');
      const module = 'test-module';
      const context = { operation: 'test-operation' };
      
      const result = await service.logError(error, module, context);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'error_event',
            module,
            message: error.message,
            context
          }),
          tags: ['monitoring', 'error', module]
        })
      );
    });

    it('should handle errors with stack traces', async () => {
      const error = new Error('Test error with stack');
      error.stack = 'Error: Test error with stack\n    at MonitoringSystemService.test';
      const module = 'test-module';
      
      const result = await service.logError(error, module);
      
      expect(result).toBeDefined();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            stackTrace: error.stack
          })
        })
      );
    });
  });

  describe('logPerformanceMetric', () => {
    it('should log a performance metric to memory', async () => {
      const metric = {
        module: 'test-module',
        operation: 'test-operation',
        duration: 150,
        resourceUsage: { cpu: 0.5, memory: 100 }
      };
      
      const result = await service.logPerformanceMetric(metric);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'performance_metric',
            module: metric.module,
            operation: metric.operation,
            duration: metric.duration,
            resourceUsage: metric.resourceUsage
          }),
          tags: ['monitoring', 'performance', metric.module]
        })
      );
    });

    it('should handle metrics without resource usage', async () => {
      const metric = {
        module: 'test-module',
        operation: 'test-operation',
        duration: 150
      };
      
      const result = await service.logPerformanceMetric(metric);
      
      expect(result).toBeDefined();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            resourceUsage: expect.any(Object)
          })
        })
      );
    });
  });

  describe('getTransformationEvents', () => {
    it('should retrieve transformation events from memory', async () => {
      const filters = { sourceModule: 'clarifier' };
      const limit = 10;
      
      const result = await service.getTransformationEvents(filters, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('transformation_event');
    });

    it('should filter events based on provided filters', async () => {
      const filters = { status: 'error' };
      
      const result = await service.getTransformationEvents(filters);
      
      expect(result).toBeInstanceOf(Array);
    });

    it('should limit the number of results', async () => {
      const limit = 1;
      
      const result = await service.getTransformationEvents({}, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getErrorEvents', () => {
    it('should retrieve error events from memory', async () => {
      const filters = { module: 'validator' };
      const limit = 10;
      
      const result = await service.getErrorEvents(filters, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('error_event');
    });

    it('should filter events based on provided filters', async () => {
      const filters = { errorType: 'validation_error' };
      
      const result = await service.getErrorEvents(filters);
      
      expect(result).toBeInstanceOf(Array);
    });

    it('should limit the number of results', async () => {
      const limit = 1;
      
      const result = await service.getErrorEvents({}, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should retrieve performance metrics from memory', async () => {
      const filters = { module: 'semantic-mediator' };
      const limit = 10;
      
      const result = await service.getPerformanceMetrics(filters, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('performance_metric');
    });

    it('should filter metrics based on provided filters', async () => {
      const filters = { operation: 'translateBetweenModules' };
      
      const result = await service.getPerformanceMetrics(filters);
      
      expect(result).toBeInstanceOf(Array);
    });

    it('should limit the number of results', async () => {
      const limit = 1;
      
      const result = await service.getPerformanceMetrics({}, limit);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate a performance report for a module', async () => {
      const module = 'semantic-mediator';
      const timeframe = { start: '2023-01-01T00:00:00.000Z', end: '2023-01-02T00:00:00.000Z' };
      
      const result = await service.generatePerformanceReport(module, timeframe);
      
      expect(result).toBeDefined();
      expect(result.module).toBe(module);
      expect(result.metrics).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
    });

    it('should handle empty metrics', async () => {
      jest.spyOn(service, 'getPerformanceMetrics').mockResolvedValueOnce([]);
      
      const module = 'empty-module';
      
      const result = await service.generatePerformanceReport(module);
      
      expect(result).toBeDefined();
      expect(result.module).toBe(module);
      expect(result.metrics).toEqual([]);
      expect(result.summary).toBeDefined();
    });
  });

  describe('generateErrorReport', () => {
    it('should generate an error report for a module', async () => {
      const module = 'validator';
      const timeframe = { start: '2023-01-01T00:00:00.000Z', end: '2023-01-02T00:00:00.000Z' };
      
      const result = await service.generateErrorReport(module, timeframe);
      
      expect(result).toBeDefined();
      expect(result.module).toBe(module);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
    });

    it('should handle empty errors', async () => {
      jest.spyOn(service, 'getErrorEvents').mockResolvedValueOnce([]);
      
      const module = 'empty-module';
      
      const result = await service.generateErrorReport(module);
      
      expect(result).toBeDefined();
      expect(result.module).toBe(module);
      expect(result.errors).toEqual([]);
      expect(result.summary).toBeDefined();
    });
  });

  describe('getSystemHealth', () => {
    it('should return the current system health status', async () => {
      const result = await service.getSystemHealth();
      
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.modules).toBeInstanceOf(Array);
      expect(result.lastUpdated).toBeDefined();
    });
  });

  describe('setAlertThreshold', () => {
    it('should set an alert threshold for a metric', async () => {
      const metric = 'error_rate';
      const module = 'semantic-mediator';
      const threshold = 0.05;
      const action = 'notify';
      
      const result = await service.setAlertThreshold(metric, module, threshold, action);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            type: 'alert_threshold',
            metric,
            module,
            threshold,
            action
          }),
          tags: ['monitoring', 'alert', 'threshold', module]
        })
      );
    });
  });

  describe('getAlertThresholds', () => {
    it('should retrieve alert thresholds for a module', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([
        {
          content: {
            type: 'alert_threshold',
            id: 'threshold-1',
            metric: 'error_rate',
            module: 'semantic-mediator',
            threshold: 0.05,
            action: 'notify'
          },
          tags: ['monitoring', 'alert', 'threshold', 'semantic-mediator']
        }
      ]);
      
      const module = 'semantic-mediator';
      
      const result = await service.getAlertThresholds(module);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].metric).toBe('error_rate');
    });
  });
});
