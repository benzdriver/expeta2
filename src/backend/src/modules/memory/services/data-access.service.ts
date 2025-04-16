import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory, MemoryType } from '../schemas/memory.schema';

/**
 * 数据访问服务
 * 处理所有与数据库的直接交互
 * 作为MemoryService和SemanticMediatorService之间的中间层
 */
@Injectable()
export class DataAccessService {
  private readonly logger = new Logger(DataAccessService.name);

  constructor(
    @InjectModel(Memory.name) private memoryModel: Model<Memory>,
  ) {
    this.logger.log('Data access service initialized');
  }

  /**
   * 根据ID查找记忆
   * @param id 记忆ID
   * @returns 记忆实体
   */
  async findById(id: string): Promise<Memory | null> {
    try {
      return await this.memoryModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding memory by ID: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 根据查询条件查找记忆
   * @param query 查询条件
   * @param options 查询选项（排序、限制等）
   * @returns 记忆实体数组
   */
  async find(query: any, options: any = {}): Promise<Memory[]> {
    try {
      let queryBuilder = this.memoryModel.find(query);
      
      if (options.sort) {
        queryBuilder = queryBuilder.sort(options.sort);
      }
      
      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }
      
      if (options.skip) {
        queryBuilder = queryBuilder.skip(options.skip);
      }
      
      return await queryBuilder.exec();
    } catch (error) {
      this.logger.error(`Error finding memories: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 根据类型查找记忆
   * @param type 记忆类型
   * @param limit 结果限制
   * @returns 记忆实体数组
   */
  async findByType(type: MemoryType, limit: number = 10): Promise<Memory[]> {
    try {
      return await this.memoryModel
        .find({ type })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Error finding memories by type: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 保存新记忆
   * @param data 记忆数据
   * @returns 保存的记忆实体
   */
  async save(data: Partial<Memory>): Promise<Memory> {
    try {
      const model = new this.memoryModel(data);
      return await model.save();
    } catch (error) {
      this.logger.error(`Error saving memory: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新记忆
   * @param id 记忆ID
   * @param data 更新数据
   * @returns 更新后的记忆实体
   */
  async update(id: string, data: Partial<Memory>): Promise<Memory | null> {
    try {
      return await this.memoryModel
        .findByIdAndUpdate(id, { $set: data }, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Error updating memory: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 根据自定义条件更新记忆
   * @param query 查询条件
   * @param data 更新数据
   * @returns 更新后的记忆实体
   */
  async updateOne(query: any, data: Partial<Memory>): Promise<Memory | null> {
    try {
      return await this.memoryModel
        .findOneAndUpdate(query, { $set: data }, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Error updating memory with query: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 删除记忆
   * @param id 记忆ID
   * @returns 是否成功删除
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.memoryModel.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      this.logger.error(`Error deleting memory: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 根据查询条件删除记忆
   * @param query 查询条件
   * @returns 删除的条目数量
   */
  async deleteMany(query: any): Promise<number> {
    try {
      const result = await this.memoryModel.deleteMany(query).exec();
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error(`Error deleting memories: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 根据文本进行搜索
   * @param searchText 搜索文本
   * @param options 搜索选项
   * @returns 匹配的记忆实体数组
   */
  async textSearch(searchText: string, options: any = {}): Promise<Memory[]> {
    try {
      const searchCriteria = {
        $or: [
          { 'metadata.title': { $regex: searchText, $options: 'i' } },
          { 'content.text': { $regex: searchText, $options: 'i' } },
          { 'content.description': { $regex: searchText, $options: 'i' } },
          { 'semanticMetadata.description': { $regex: searchText, $options: 'i' } },
        ],
      };

      let query = this.memoryModel.find(searchCriteria);
      
      if (options.sort) {
        query = query.sort(options.sort);
      } else {
        query = query.sort({ 'semanticMetadata.relevanceScore': -1, updatedAt: -1 });
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }

      return await query.exec();
    } catch (error) {
      this.logger.error(`Error performing text search: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 获取记忆总数
   * @param query 查询条件
   * @returns 记忆数量
   */
  async count(query: any = {}): Promise<number> {
    try {
      return await this.memoryModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(`Error counting memories: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 根据条件查找单个记忆
   * @param query 查询条件
   * @returns 单个记忆实体或null
   */
  async findOne(query: any): Promise<Memory | null> {
    try {
      return await this.memoryModel.findOne(query).exec();
    } catch (error) {
      this.logger.error(`Error finding single memory: ${error.message}`, error.stack);
      return null;
    }
  }
} 