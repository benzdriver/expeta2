import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Validation } from './schemas/validation.schema';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';

@Injectable()
export class ValidatorService {
  constructor(
    @InjectModel(Validation.name) private validationModel: Model<Validation>,
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  async validateCode(expectationId: string, codeId: string): Promise<Validation> {
    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const code = codeMemories.find(
      (memory) => memory.content._id.toString() === codeId,
    )?.content;

    if (!expectation || !code) {
      throw new Error('Expectation or Code not found');
    }

    const validationPrompt = `
      基于以下期望模型和生成的代码，评估代码是否满足期望要求：
      
      期望模型：${JSON.stringify(expectation.model, null, 2)}
      
      生成的代码：
      ${code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n')}
      
      请评估代码对每个期望的满足程度，并提供以下格式的JSON结果：
      {
        "status": "passed|failed|partial",
        "score": 0-100,
        "details": [
          {
            "expectationId": "期望ID",
            "status": "passed|failed|partial",
            "score": 0-100,
            "message": "评估说明"
          }
        ]
      }
    `;

    const validationResultText = await this.llmService.generateContent(validationPrompt);
    const validationResult = JSON.parse(validationResultText);

    const validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedValidation = await validation.save();

    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: validationResult.status,
        score: validationResult.score,
      },
    });

    return savedValidation;
  }

  async getValidationsByExpectationId(expectationId: string): Promise<Validation[]> {
    return this.validationModel.find({ expectationId }).sort({ createdAt: -1 }).exec();
  }

  async getValidationsByCodeId(codeId: string): Promise<Validation[]> {
    return this.validationModel.find({ codeId }).sort({ createdAt: -1 }).exec();
  }

  async getValidationById(id: string): Promise<Validation> {
    return this.validationModel.findById(id).exec();
  }
  
  /**
   * 使用语义输入验证代码
   * 这个方法接收语义中介器提供的额外语义信息来增强验证过程
   */
  async validateCodeWithSemanticInput(
    expectationId: string, 
    codeId: string, 
    semanticInput: any
  ): Promise<Validation> {
    const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
    const expectation = expectationMemories.find(
      (memory) => memory.content._id.toString() === expectationId,
    )?.content;

    const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
    const code = codeMemories.find(
      (memory) => memory.content._id.toString() === codeId,
    )?.content;

    if (!expectation || !code) {
      throw new Error('Expectation or Code not found');
    }

    const validationPrompt = `
      基于以下期望模型、生成的代码和语义解析结果，评估代码是否满足期望要求：
      
      期望模型：${JSON.stringify(expectation.model, null, 2)}
      
      生成的代码：
      ${code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n')}
      
      语义解析结果：
      ${JSON.stringify(semanticInput, null, 2)}
      
      请评估代码对每个期望的满足程度，并提供以下格式的JSON结果：
      {
        "status": "passed|failed|partial",
        "score": 0-100,
        "details": [
          {
            "expectationId": "期望ID",
            "status": "passed|failed|partial",
            "score": 0-100,
            "message": "评估说明",
            "semanticInsights": "基于语义解析的额外洞察"
          }
        ],
        "semanticAnalysis": "对语义解析结果的总体分析"
      }
    `;

    const validationResultText = await this.llmService.generateContent(validationPrompt);
    const validationResult = JSON.parse(validationResultText);

    const validation = new this.validationModel({
      expectationId,
      codeId,
      status: validationResult.status,
      score: validationResult.score,
      details: validationResult.details,
      metadata: {
        semanticAnalysis: validationResult.semanticAnalysis,
        usedSemanticInput: true
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedValidation = await validation.save();

    await this.memoryService.storeMemory({
      type: MemoryType.VALIDATION,
      content: savedValidation,
      metadata: {
        expectationId,
        codeId,
        status: validationResult.status,
        score: validationResult.score,
        usedSemanticInput: true
      },
      tags: ['validation', 'semantic_validation', expectationId, codeId]
    });

    return savedValidation;
  }
}
