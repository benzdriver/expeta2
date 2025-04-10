import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Code } from './schemas/code.schema';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';

@Injectable()
export class GeneratorService {
  constructor(
    @InjectModel(Code.name) private codeModel: Model<Code>,
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  async generateCode(expectationId: string): Promise<Code> {
    const expectationMemory = await this.memoryService.getMemoryByType('expectation');
    const expectation = expectationMemory.find(
      (memory) => memory.content._id.toString() === expectationId,
    );

    if (!expectation) {
      throw new Error('Expectation not found');
    }

    const codeGenerationPrompt = `
      基于以下期望模型，生成相应的代码实现：
      
      期望模型：${JSON.stringify(expectation.content.model, null, 2)}
      
      请生成以下文件的代码：
      1. 主要功能实现文件
      2. 接口定义文件
      3. 测试文件
      
      返回JSON格式，包含files数组，每个文件包含path、content和language字段。
    `;

    const generatedCodeText = await this.llmService.generateContent(codeGenerationPrompt);
    const generatedCode = JSON.parse(generatedCodeText);

    const createdCode = new this.codeModel({
      expectationId,
      files: generatedCode.files,
      metadata: {
        expectationId,
        version: 1,
        status: 'generated',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedCode = await createdCode.save();

    await this.memoryService.storeMemory({
      type: 'code',
      content: savedCode,
      metadata: {
        expectationId,
        status: 'generated',
      },
    });

    return savedCode;
  }

  async getCodeByExpectationId(expectationId: string): Promise<Code[]> {
    return this.codeModel.find({ expectationId }).sort({ 'metadata.version': -1 }).exec();
  }

  async getCodeFiles(id: string): Promise<any> {
    const code = await this.codeModel.findById(id).exec();
    
    if (!code) {
      throw new Error('Code not found');
    }
    
    return code.files;
  }

  async approveCode(id: string): Promise<Code> {
    const code = await this.codeModel.findById(id).exec();
    
    if (!code) {
      throw new Error('Code not found');
    }
    
    code.metadata.status = 'approved';
    code.updatedAt = new Date();
    
    const updatedCode = await code.save();
    
    await this.memoryService.updateMemory('code', updatedCode._id.toString(), {
      content: updatedCode,
      metadata: {
        ...updatedCode.metadata,
        status: 'approved',
      },
    });
    
    return updatedCode;
  }
}
