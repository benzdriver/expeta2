import { Test, TestingModule } from '@nestjs/testing';
import { SemanticCacheService } from '../services/semantic-cache.service';
import { CacheConfig } from '../interfaces/semantic-memory.interfaces';
import * as jest from 'jest';

describe('SemanticCacheService', () => {
  let service: SemanticCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SemanticCacheService],
    }).compile();

    service = module.get<SemanticCacheService>(SemanticCacheService);
    
    service.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  describe('cache operations', () => {
    it('should store and retrieve data from cache', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test Data' };
      
      service.set(key, data);
      const cachedData = service.get(key);
      
      expect(cachedData).toEqual(data);
    });
    
    it('should return undefined for non-existent keys', () => {
      const result = service.get('non-existent-key');
      expect(result).toBeUndefined();
    });
    
    it('should delete specific cache entries', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test Data' };
      
      service.set(key, data);
      expect(service.get(key)).toEqual(data);
      
      service.delete(key);
      expect(service.get(key)).toBeUndefined();
    });
    
    it('should clear all cache entries', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      
      service.clear();
      
      expect(service.get('key1')).toBeUndefined();
      expect(service.get('key2')).toBeUndefined();
    });
  });
  
  describe('semantic relevance filtering', () => {
    it('should not cache items with low semantic relevance', () => {
      const key = 'low-relevance-key';
      const data = { id: 1, name: 'Low Relevance Data' };
      const lowRelevance = 0.2;
      
      service.setConfig({ minSemanticRelevance: 0.5 });
      
      service.set(key, data, lowRelevance);
      expect(service.get(key)).toBeUndefined();
    });
    
    it('should cache items with high semantic relevance', () => {
      const key = 'high-relevance-key';
      const data = { id: 1, name: 'High Relevance Data' };
      const highRelevance = 0.8;
      
      service.set(key, data, highRelevance);
      expect(service.get(key)).toEqual(data);
    });
  });
  
  describe('cache configuration', () => {
    it('should update cache configuration', () => {
      const newConfig: Partial<CacheConfig> = {
        defaultTTL: 60000,
        maxEntries: 500,
        minSemanticRelevance: 0.7
      };
      
      service.setConfig(newConfig);
      
      const stats = service.getStats();
      expect(stats).toBeDefined();
    });
  });
  
  describe('cache statistics', () => {
    it('should return cache statistics', () => {
      service.set('key1', 'value1', 0.9);
      service.set('key2', 'value2', 0.8);
      
      const stats = service.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBe(2);
      expect(stats.activeEntries).toBe(2);
    });
  });
});
