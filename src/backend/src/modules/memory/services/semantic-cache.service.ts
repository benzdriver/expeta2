import { Injectable, Logger } from '@nestjs/common';
import { CacheEntry, CacheConfig } from '../interfaces/semantic-memory.interfaces';

/**
 * 语义缓存服务
 * 提供智能缓存功能，基于语义相关性和使用模式优化缓存
 */
@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig = {
    defaultTTL: 30 * 60 * 1000, // 30分钟
    maxEntries: 1000,
    minSemanticRelevance: 0.5,
    adaptiveCache: true
  };

  constructor() {
    this.logger.log('Semantic cache service initialized');
    setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 设置缓存配置
   * @param config 缓存配置
   */
  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log(`Cache config updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存数据或undefined
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    if (entry.expiresAt < new Date()) {
      this.logger.debug(`Cache entry expired: ${key}`);
      this.cache.delete(key);
      return undefined;
    }
    
    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    this.logger.debug(`Cache hit: ${key}, access count: ${entry.accessCount}`);
    return entry.data as T;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param data 缓存数据
   * @param semanticRelevance 语义相关性分数
   * @param ttl 过期时间（毫秒）
   */
  set<T>(key: string, data: T, semanticRelevance: number = 1.0, ttl?: number): void {
    if (semanticRelevance < this.config.minSemanticRelevance) {
      this.logger.debug(`Skipping cache for low relevance item: ${key}, relevance: ${semanticRelevance}`);
      return;
    }
    
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLeastValuableEntry();
    }
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.config.defaultTTL));
    
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
      semanticRelevance
    };
    
    this.cache.set(key, entry);
    this.logger.debug(`Cache set: ${key}, expires: ${expiresAt.toISOString()}`);
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getStats(): Record<string, any> {
    const now = new Date();
    const entries = Array.from(this.cache.entries());
    
    const activeEntries = entries.filter(([_, entry]) => entry.expiresAt > now);
    const expiredEntries = entries.filter(([_, entry]) => entry.expiresAt <= now);
    
    const avgRelevance = activeEntries.reduce((sum, [_, entry]) => sum + entry.semanticRelevance, 0) / 
                         (activeEntries.length || 1);
    
    const avgAccessCount = activeEntries.reduce((sum, [_, entry]) => sum + entry.accessCount, 0) / 
                           (activeEntries.length || 1);
    
    return {
      totalEntries: this.cache.size,
      activeEntries: activeEntries.length,
      expiredEntries: expiredEntries.length,
      avgRelevance,
      avgAccessCount,
      oldestEntry: Math.min(...activeEntries.map(([_, e]) => e.timestamp.getTime())),
      newestEntry: Math.max(...activeEntries.map(([_, e]) => e.timestamp.getTime())),
    };
  }

  /**
   * 清理过期缓存
   * @private
   */
  private cleanExpiredCache(): void {
    const now = new Date();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.logger.debug(`Cleaned ${expiredCount} expired cache entries`);
    }
  }

  /**
   * 驱逐最不有价值的缓存项
   * @private
   */
  private evictLeastValuableEntry(): void {
    let leastValuableKey: string | null = null;
    let leastValue = Number.MAX_VALUE;
    
    for (const [key, entry] of this.cache.entries()) {
      const recency = (new Date().getTime() - entry.lastAccessed.getTime()) / 1000 / 3600; // 小时
      const value = entry.semanticRelevance * (entry.accessCount + 1) / (recency + 1);
      
      if (value < leastValue) {
        leastValue = value;
        leastValuableKey = key;
      }
    }
    
    if (leastValuableKey) {
      this.cache.delete(leastValuableKey);
      this.logger.debug(`Evicted least valuable cache entry: ${leastValuableKey}`);
    }
  }
}
