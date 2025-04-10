import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory, MemoryType } from './schemas/memory.schema';

@Injectable()
export class MemoryService {
  constructor(
    @InjectModel(Memory.name) private memoryModel: Model<Memory>,
  ) {}

  async storeRequirement(requirement: any): Promise<Memory> {
    const memoryEntry = new this.memoryModel({
      type: MemoryType.REQUIREMENT,
      content: requirement,
      metadata: {
        title: requirement.title,
        status: requirement.status,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return memoryEntry.save();
  }

  async updateRequirement(requirement: any): Promise<Memory> {
    const memoryEntry = await this.memoryModel.findOne({
      type: MemoryType.REQUIREMENT,
      'content._id': requirement._id,
    });

    if (!memoryEntry) {
      return this.storeRequirement(requirement);
    }

    memoryEntry.content = requirement;
    memoryEntry.metadata = {
      ...memoryEntry.metadata,
      title: requirement.title,
      status: requirement.status,
    };
    memoryEntry.updatedAt = new Date();

    return memoryEntry.save();
  }

  async deleteRequirement(requirementId: string): Promise<void> {
    await this.memoryModel.deleteOne({
      type: MemoryType.REQUIREMENT,
      'content._id': requirementId,
    });
  }

  async storeExpectation(expectation: any): Promise<Memory> {
    const memoryEntry = new this.memoryModel({
      type: MemoryType.EXPECTATION,
      content: expectation,
      metadata: {
        requirementId: expectation.requirementId,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return memoryEntry.save();
  }

  async getRelatedMemories(query: string, limit: number = 5): Promise<Memory[]> {
    return this.memoryModel
      .find({
        $or: [
          { 'metadata.title': { $regex: query, $options: 'i' } },
          { 'content.text': { $regex: query, $options: 'i' } },
          { 'content.description': { $regex: query, $options: 'i' } },
        ],
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();
  }

  async getMemoryByType(type: MemoryType, limit: number = 10): Promise<Memory[]> {
    return this.memoryModel
      .find({ type })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();
  }

  async storeMemory(data: { type: string; content: any; metadata: any }): Promise<Memory> {
    const memoryEntry = new this.memoryModel({
      type: data.type as MemoryType,
      content: data.content,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return memoryEntry.save();
  }

  async updateMemory(type: string, contentId: string, data: { content: any; metadata: any }): Promise<Memory> {
    const memoryEntry = await this.memoryModel.findOne({
      type: type as MemoryType,
      'content._id': contentId,
    });

    if (!memoryEntry) {
      return this.storeMemory({
        type,
        content: data.content,
        metadata: data.metadata,
      });
    }

    memoryEntry.content = data.content;
    memoryEntry.metadata = data.metadata;
    memoryEntry.updatedAt = new Date();

    return memoryEntry.save();
  }
}
