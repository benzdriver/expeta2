import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Requirement } from './schemas/requirement.schema';
import { Expectation } from './schemas/expectation.schema';
import { CreateRequirementDto, UpdateRequirementDto } from './dto';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';

@Injectable()
export class ClarifierService {
  constructor(
    @InjectModel(Requirement.name) private requirementModel: Model<Requirement>,
    @InjectModel(Expectation.name) private expectationModel: Model<Expectation>,
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  async createRequirement(createRequirementDto: CreateRequirementDto): Promise<Requirement> {
    const createdRequirement = new this.requirementModel({
      ...createRequirementDto,
      status: 'initial',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const savedRequirement = await createdRequirement.save();
    
    await this.memoryService.storeRequirement(savedRequirement);
    
    return savedRequirement;
  }

  async getAllRequirements(): Promise<Requirement[]> {
    return this.requirementModel.find().exec();
  }

  async getRequirementById(id: string): Promise<Requirement> {
    return this.requirementModel.findById(id).exec();
  }

  async updateRequirement(id: string, updateRequirementDto: UpdateRequirementDto): Promise<Requirement> {
    const updatedRequirement = await this.requirementModel
      .findByIdAndUpdate(
        id,
        { ...updateRequirementDto, updatedAt: new Date() },
        { new: true },
      )
      .exec();
    
    await this.memoryService.updateRequirement(updatedRequirement);
    
    return updatedRequirement;
  }

  async deleteRequirement(id: string): Promise<Requirement> {
    const deletedRequirement = await this.requirementModel.findByIdAndDelete(id).exec();
    
    await this.memoryService.deleteRequirement(id);
    
    return deletedRequirement;
  }

  async generateClarificationQuestions(requirementText: string): Promise<any> {
    const clarificationPrompt = `
      分析以下需求，并生成5个关键澄清问题，以帮助更好地理解需求：
      
      需求：${requirementText}
      
      请生成问题，每个问题应该：
      1. 针对需求中的不确定性或模糊点
      2. 帮助理解用户的真实意图
      3. 探索相似行业的设计模式
      4. 明确功能边界和优先级
      5. 确认非功能性需求（如性能、安全性等）
      
      返回JSON格式的问题列表，每个问题包含id、text和category字段。
    `;
    
    const questions = await this.llmService.generateContent(clarificationPrompt);
    return JSON.parse(questions);
  }

  async processClarificationAnswer(requirementId: string, questionId: string, answer: string): Promise<any> {
    const requirement = await this.requirementModel.findById(requirementId).exec();
    
    if (!requirement) {
      throw new Error('Requirement not found');
    }
    
    if (!requirement.clarifications) {
      requirement.clarifications = [];
    }
    
    const existingClarificationIndex = requirement.clarifications.findIndex(
      c => c.questionId === questionId,
    );
    
    if (existingClarificationIndex >= 0) {
      requirement.clarifications[existingClarificationIndex].answer = answer;
    } else {
      requirement.clarifications.push({
        questionId,
        answer,
        timestamp: new Date(),
      });
    }
    
    requirement.status = 'clarifying';
    requirement.updatedAt = new Date();
    
    const updatedRequirement = await requirement.save();
    
    await this.memoryService.updateRequirement(updatedRequirement);
    
    const analysisPrompt = `
      分析以下需求及其澄清问题和答案，判断是否需要更多澄清：
      
      需求：${requirement.text}
      
      澄清问题和答案：
      ${requirement.clarifications.map(c => `问题ID: ${c.questionId}, 答案: ${c.answer}`).join('\n')}
      
      请判断：
      1. 当前澄清是否足够生成期望模型？
      2. 如果不够，还需要哪些方面的澄清？
      3. 如果足够，请总结关键理解点。
      
      返回JSON格式，包含needMoreClarification(布尔值)和summary(字符串)字段。
    `;
    
    const analysis = await this.llmService.generateContent(analysisPrompt);
    return JSON.parse(analysis);
  }

  async generateExpectations(requirementId: string): Promise<any> {
    const requirement = await this.requirementModel.findById(requirementId).exec();
    
    if (!requirement) {
      throw new Error('Requirement not found');
    }
    
    const expectationsPrompt = `
      基于以下需求及其澄清信息，生成结构化的纯语义期望模型：
      
      需求：${requirement.text}
      
      澄清信息：
      ${requirement.clarifications.map(c => `问题ID: ${c.questionId}, 答案: ${c.answer}`).join('\n')}
      
      请生成一个期望模型，包含：
      1. 顶层期望：描述系统整体目标和价值
      2. 功能期望：描述系统应该做什么，而非如何做
      3. 非功能期望：描述系统的质量属性（性能、安全性、可用性等）
      4. 约束条件：描述系统必须遵守的限制
      
      返回JSON格式，包含id、name、description和children字段，其中children是子期望的数组。
    `;
    
    const expectationsData = await this.llmService.generateContent(expectationsPrompt);
    const parsedExpectations = JSON.parse(expectationsData);
    
    const createdExpectation = new this.expectationModel({
      requirementId,
      model: parsedExpectations,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const savedExpectation = await createdExpectation.save();
    
    requirement.status = 'expectations_generated';
    requirement.updatedAt = new Date();
    await requirement.save();
    
    await this.memoryService.storeExpectation(savedExpectation);
    
    return savedExpectation;
  }

  async getExpectations(requirementId: string): Promise<any> {
    return this.expectationModel.findOne({ requirementId }).exec();
  }
  
  /**
   * 根据ID获取期望模型
   */
  async getExpectationById(id: string): Promise<any> {
    return this.expectationModel.findById(id).exec();
  }

  async analyzeClarificationProgress(requirementId: string): Promise<any> {
    const requirement = await this.requirementModel.findById(requirementId).exec();
    
    if (!requirement) {
      throw new Error('Requirement not found');
    }
    
    if (!requirement.clarifications || requirement.clarifications.length === 0) {
      return {
        needMoreClarification: true,
        suggestedQuestions: await this.generateClarificationQuestions(requirement.text),
        summary: '尚未进行任何澄清，需要开始澄清过程。',
      };
    }
    
    const analysisPrompt = `
      分析以下需求及其澄清问题和答案，判断是否需要更多澄清：
      
      需求：${requirement.text}
      
      澄清问题和答案：
      ${requirement.clarifications.map(c => `问题ID: ${c.questionId}, 答案: ${c.answer}`).join('\n')}
      
      请判断：
      1. 当前澄清是否足够生成期望模型？
      2. 如果不够，还需要哪些方面的澄清？请生成3个具体的后续问题。
      3. 如果足够，请总结关键理解点。
      
      返回JSON格式，包含以下字段：
      - needMoreClarification: 布尔值，表示是否需要更多澄清
      - suggestedQuestions: 如果需要更多澄清，提供建议的问题数组，每个问题包含id、text和category
      - summary: 当前理解的总结
    `;
    
    const analysisText = await this.llmService.generateContent(analysisPrompt);
    return JSON.parse(analysisText);
  }
}
