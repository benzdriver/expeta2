import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Requirement } from './schemas/requirement.schema';
import { Expectation } from './schemas/expectation.schema';
import { CreateRequirementDto, UpdateRequirementDto } from './dto';
import { LlmRouterService } from '../../services/llm-router.service';
import { MemoryService } from '../memory/memory.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClarifierService {
  private readonly logger = new Logger(ClarifierService.name);

  constructor(
    @InjectModel(Requirement.name) private requirementModel: Model<Requirement>,
    @InjectModel(Expectation.name) private expectationModel: Model<Expectation>,
    private readonly llmRouterService: LlmRouterService,
    private readonly memoryService: MemoryService,
  ) {
    this.logger.log('ClarifierService initialized');
  }

  async createRequirement(createRequirementDto: CreateRequirementDto): Promise<Requirement> {
    this.logger.log(`Creating new requirement: ${createRequirementDto.title || 'Untitled'}`);

    try {
      const requirementId = uuidv4();
      this.logger.debug(`Generated requirement ID: ${requirementId}`);

      const createdRequirement = new this.requirementModel({
        ...createRequirementDto,
        status: 'initial',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          ...createRequirementDto.metadata,
          requirementId,
          creationTimestamp: new Date().toISOString(),
          version: '1.0',
          source: 'clarifier_service',
        },
      });

      this.logger.debug('Saving requirement to database');
      const savedRequirement = await createdRequirement.save();

      this.logger.debug('Storing requirement in memory service');
      await this.memoryService.storeRequirement(savedRequirement);

      this.logger.log(`Successfully created requirement with ID: ${savedRequirement._id}`);
      return savedRequirement;
    } catch (error) {
      this.logger.error(`Error creating requirement: ${error.message}`, error.stack);
      throw new Error(`Failed to create requirement: ${error.message}`);
    }
  }

  async getAllRequirements(): Promise<Requirement[]> {
    return this.requirementModel.find().exec();
  }

  async getRequirementById(id: string): Promise<Requirement> {
    return this.requirementModel.findById(id).exec();
  }

  async updateRequirement(
    id: string,
    updateRequirementDto: UpdateRequirementDto,
  ): Promise<Requirement> {
    const updatedRequirement = await this.requirementModel
      .findByIdAndUpdate(id, { ...updateRequirementDto, updatedAt: new Date() }, { new: true })
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
    this.logger.log('Generating clarification questions for requirement');
    this.logger.debug(`Requirement text length: ${requirementText.length} characters`);

    try {
      const sessionId = uuidv4();
      this.logger.debug(`Generated session ID for clarification: ${sessionId}`);

      const clarificationPrompt = `
        分析以下需求，并生成5个关键澄清问题，以帮助更好地理解需求：
        
        需求：${requirementText}
        
        请生成问题，每个问题应该：
        1. 针对需求中的不确定性或模糊点
        2. 帮助理解用户的真实意图
        3. 探索相似行业的设计模式
        4. 明确功能边界和优先级
        5. 确认非功能性需求（如性能、安全性等）
        
        返回JSON格式的问题列表，每个问题包含id、text、category和priority字段。
        每个问题的priority应该是high、medium或low，表示该问题对理解需求的重要性。
      `;

      this.logger.debug('Sending clarification prompt to LLM service', {
        sessionId,
        timestamp: new Date().toISOString(),
        requirementTextLength: requirementText.length,
        operation: 'generate_clarification_questions',
      });

      const questionsText = await this.llmRouterService.generateContent(clarificationPrompt, {
        systemPrompt:
          '你是一个专业的需求分析师，擅长识别需求中的模糊点和不确定性，并提出有针对性的澄清问题。',
      });

      let questions;
      try {
        questions = JSON.parse(questionsText);
        this.logger.debug(`Successfully parsed ${questions.length || 0} clarification questions`);
      } catch (parseError) {
        this.logger.error(`Failed to parse clarification questions: ${parseError.message}`);
        throw new Error(`Failed to parse clarification questions: ${parseError.message}`);
      }

      const categories = questions.map((q) => q.category);
      const priorities = questions.map((q) => q.priority);

      this.logger.debug('Question categories distribution', {
        categories: categories.reduce((acc, cat) => {
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {}),
        priorities: priorities.reduce((acc, pri) => {
          acc[pri] = (acc[pri] || 0) + 1;
          return acc;
        }, {}),
      });

      this.logger.log(`Successfully generated ${questions.length || 0} clarification questions`);
      return questions;
    } catch (error) {
      this.logger.error(`Error generating clarification questions: ${error.message}`, error.stack);
      throw new Error(`Failed to generate clarification questions: ${error.message}`);
    }
  }

  async processClarificationAnswer(
    requirementId: string,
    questionId: string,
    answer: string,
  ): Promise<any> {
    this.logger.log(
      `Processing clarification answer for requirement: ${requirementId}, question: ${questionId}`,
    );

    try {
      const sessionId = uuidv4();
      this.logger.debug(`Generated session ID for clarification answer: ${sessionId}`);

      const requirement = await this.requirementModel.findById(requirementId).exec();

      if (!requirement) {
        this.logger.error(`Requirement not found: ${requirementId}`);
        throw new Error('Requirement not found');
      }

      this.logger.debug(`Found requirement: ${requirement.title || 'Untitled'}`);

      if (!requirement.clarifications) {
        this.logger.debug('Initializing clarifications array for requirement');
        requirement.clarifications = [];
      }

      const existingClarificationIndex = requirement.clarifications.findIndex(
        (c) => c.questionId === questionId,
      );

      const timestamp = new Date();

      if (existingClarificationIndex >= 0) {
        this.logger.debug(
          `Updating existing clarification at index: ${existingClarificationIndex}`,
        );
        requirement.clarifications[existingClarificationIndex].answer = answer;
        requirement.clarifications[existingClarificationIndex].updatedAt = timestamp;
      } else {
        this.logger.debug('Adding new clarification to requirement');
        requirement.clarifications.push({
          questionId,
          answer,
          timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      const clarificationRound = requirement.clarifications.length;
      this.logger.debug(`Current clarification round: ${clarificationRound}`);

      requirement.status = 'clarifying';
      requirement.updatedAt = timestamp;

      if (!requirement.metadata) {
        requirement.metadata = {};
      }

      requirement.metadata.lastClarificationTimestamp = timestamp.toISOString();
      requirement.metadata.clarificationRounds = clarificationRound;
      requirement.metadata.lastQuestionId = questionId;

      this.logger.debug('Saving updated requirement');
      const updatedRequirement = await requirement.save();

      this.logger.debug('Updating requirement in memory service');
      await this.memoryService.updateRequirement(updatedRequirement);

      await this.logDialogue(requirementId, {
        type: 'clarification_answer',
        questionId,
        answer,
        round: clarificationRound,
        sessionId,
      });

      this.logger.debug('Generating analysis of clarification progress');
      const analysisPrompt = `
        分析以下需求及其澄清问题和答案，判断是否需要更多澄清：
        
        需求：${requirement.text}
        
        澄清问题和答案：
        ${requirement.clarifications.map((c) => `问题ID: ${c.questionId}, 答案: ${c.answer}, 时间: ${c.timestamp}`).join('\n')}
        
        请判断：
        1. 当前澄清是否足够生成期望模型？
        2. 如果不够，还需要哪些方面的澄清？
        3. 如果足够，请总结关键理解点。
        4. 当前对话的有效性评分（1-100）
        
        返回JSON格式，包含needMoreClarification(布尔值)、summary(字符串)、missingAspects(数组)和dialogueEffectiveness(对象)字段。
      `;

      this.logger.debug('Sending analysis prompt to LLM service');
      const analysisText = await this.llmRouterService.generateContent(analysisPrompt, {
        systemPrompt:
          '你是一个专业的需求分析师，擅长识别需求中的模糊点和不确定性，并提出有针对性的澄清问题。',
      });

      let analysis;
      try {
        analysis = JSON.parse(analysisText);
        this.logger.debug('Successfully parsed clarification analysis', {
          needMoreClarification: analysis.needMoreClarification,
          dialogueEffectiveness: analysis.dialogueEffectiveness,
        });
      } catch (parseError) {
        this.logger.error(`Failed to parse clarification analysis: ${parseError.message}`);
        throw new Error(`Failed to parse clarification analysis: ${parseError.message}`);
      }

      requirement.metadata.needMoreClarification = analysis.needMoreClarification;
      requirement.metadata.lastAnalysisTimestamp = new Date().toISOString();
      if (analysis.dialogueEffectiveness) {
        requirement.metadata.dialogueEffectiveness = analysis.dialogueEffectiveness;
      }

      await requirement.save();

      this.logger.log(
        `Successfully processed clarification answer for requirement: ${requirementId}`,
      );
      return analysis;
    } catch (error) {
      this.logger.error(`Error processing clarification answer: ${error.message}`, error.stack);
      throw new Error(`Failed to process clarification answer: ${error.message}`);
    }
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
      ${requirement.clarifications.map((c) => `问题ID: ${c.questionId}, 答案: ${c.answer}`).join('\n')}
      
      请生成一个期望模型，包含：
      1. 顶层期望：描述系统整体目标和价值
      2. 功能期望：描述系统应该做什么，而非如何做
      3. 非功能期望：描述系统的质量属性（性能、安全性、可用性等）
      4. 约束条件：描述系统必须遵守的限制
      
      返回JSON格式，包含id、name、description和children字段，其中children是子期望的数组。
    `;

    const expectationsData = await this.llmRouterService.generateContent(expectationsPrompt);
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
        conversationStage: '初始理解',
      };
    }

    const clarificationHistory = requirement.clarifications
      .map((c) => `问题ID: ${c.questionId}, 答案: ${c.answer}, 时间: ${c.timestamp}`)
      .join('\n');

    const analysisPrompt = `
      分析以下需求及其澄清问题和答案，判断是否需要更多澄清：
      
      需求：${requirement.text}
      
      澄清问题和答案：
      ${clarificationHistory}
      
      请判断：
      1. 当前澄清是否足够生成期望模型？
      2. 如果不够，还需要哪些方面的澄清？请生成3个具体的后续问题。
      3. 如果足够，请总结关键理解点。
      4. 当前对话阶段（初始理解/深入澄清/细节完善/最终确认）
      5. 对话轮次的有效性评估
      
      返回JSON格式，包含以下字段：
      - needMoreClarification: 布尔值，表示是否需要更多澄清
      - suggestedQuestions: 如果需要更多澄清，提供建议的问题数组，每个问题包含id、text、type和priority
      - summary: 当前理解的总结
      - conversationStage: 当前对话阶段
      - dialogueEffectiveness: 对话有效性评估，包含score、strengths、weaknesses和recommendations
    `;

    const analysisText = await this.llmRouterService.generateContent(analysisPrompt, {
      systemPrompt: `你是一个专业的软件需求分析师，擅长将模糊的需求转化为清晰的期望模型。
      在多轮对话中，你应该记住之前的交流内容，并基于这些信息提出更有针对性的问题。
      每轮对话结束时，你应该明确总结你对需求的理解，并请用户确认。`,
    });

    try {
      return JSON.parse(analysisText);
    } catch (error) {
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  /**
   * 分析多轮对话过程
   * 提供对话流程的深入分析，包括有效性评分、关键信息提取和改进建议
   * 增强版本包含详细的日志记录、错误处理和语义分析
   */
  async analyzeMultiRoundDialogue(requirementId: string): Promise<any> {
    this.logger.log(`Analyzing multi-round dialogue for requirement: ${requirementId}`);

    try {
      const sessionId = uuidv4();
      this.logger.debug(`Generated session ID for multi-round dialogue analysis: ${sessionId}`);

      const requirement = await this.requirementModel.findById(requirementId).exec();

      if (!requirement) {
        this.logger.error(`Requirement not found: ${requirementId}`);
        throw new Error('Requirement not found');
      }

      this.logger.debug(`Found requirement: ${requirement.title || 'Untitled'}`);

      if (!requirement.clarifications || requirement.clarifications.length < 2) {
        this.logger.warn(
          `Insufficient dialogue rounds for requirement: ${requirementId}, found ${requirement.clarifications?.length || 0} rounds`,
        );
        throw new Error('需要至少两轮对话才能进行多轮对话分析');
      }

      const clarificationRounds = requirement.clarifications.length;
      const totalDialogueMessages = requirement.dialogueLog?.length || 0;
      const averageAnswerLength =
        requirement.clarifications.reduce((sum, c) => sum + (c.answer?.length || 0), 0) /
        clarificationRounds;

      this.logger.debug('Dialogue metrics', {
        requirementId,
        clarificationRounds,
        totalDialogueMessages,
        averageAnswerLength,
        firstClarificationTime: requirement.clarifications[0]?.timestamp,
        lastClarificationTime:
          requirement.clarifications[requirement.clarifications.length - 1]?.timestamp,
      });

      const dialogueHistory = requirement.clarifications
        .map(
          (c, index) =>
            `轮次 ${index + 1}:\n问题ID: ${c.questionId}\n问题类型: ${c.questionId.split('-')[0] || '未分类'}\n答案: ${c.answer}\n时间: ${c.timestamp}\n答案长度: ${c.answer.length}字符`,
        )
        .join('\n\n');

      this.logger.debug('Generating analysis prompt for multi-round dialogue');
      const analysisPrompt = `
        分析以下多轮对话的需求澄清过程：

        需求标题: ${requirement.title}
        需求描述: ${requirement.text}
        需求领域: ${requirement.domain || '未指定'}
        需求优先级: ${requirement.priority || '未指定'}

        对话历史：
        ${dialogueHistory}

        请分析对话流程，并提供以下信息：
        1. 对话的有效性评分（1-100）及评分理由
        2. 每轮对话的关键信息提取和语义标签
        3. 对话中的转折点和重要发现
        4. 用户关注点的变化趋势
        5. 需求理解的演进过程
        6. 对话中可能被忽略的重要方面
        7. 改进对话效率的建议
        8. 对话的语义连贯性分析
        9. 需求的完整性评估
        10. 建议的后续澄清问题（如果需要）

        以JSON格式返回结果，包含以下字段：
        - effectivenessScore: 数字(1-100)
        - scoreRationale: 字符串
        - keyInsights: 对象数组，每个对象包含roundNumber、insights(字符串数组)和semanticTags(字符串数组)
        - pivotalMoments: 对象数组，每个对象包含roundNumber、description和impact
        - focusShifts: 对象数组，每个对象包含from、to和roundNumber
        - requirementEvolution: 对象，包含initial、intermediate和current字段
        - missedAspects: 字符串数组
        - improvementSuggestions: 字符串数组
        - semanticCoherence: 对象，包含score和analysis
        - completenessAssessment: 对象，包含score、missingElements和recommendations
        - followUpQuestions: 对象数组，每个对象包含question、priority和rationale
      `;

      this.logger.debug('Sending analysis prompt to LLM service');
      const analysisText = await this.llmRouterService.generateContent(analysisPrompt, {
        systemPrompt: `你是一个专业的软件需求分析师，擅长将模糊的需求转化为清晰的期望模型。
        在多轮对话中，你应该记住之前的交流内容，并基于这些信息提出更有针对性的问题。
        每轮对话结束时，你应该明确总结你对需求的理解，并请用户确认。
        你的分析应该关注语义连贯性、需求完整性和对话效率。`,
      });

      let analysis;
      try {
        analysis = JSON.parse(analysisText);

        this.logger.debug('Successfully parsed multi-round dialogue analysis', {
          effectivenessScore: analysis.effectivenessScore,
          keyInsightsCount: analysis.keyInsights?.length || 0,
          pivotalMomentsCount: analysis.pivotalMoments?.length || 0,
          missedAspectsCount: analysis.missedAspects?.length || 0,
          semanticCoherenceScore: analysis.semanticCoherence?.score,
        });

        if (!requirement.metadata) {
          requirement.metadata = {};
        }

        requirement.metadata.dialogueAnalysis = {
          timestamp: new Date().toISOString(),
          sessionId,
          effectivenessScore: analysis.effectivenessScore,
          semanticCoherenceScore: analysis.semanticCoherence?.score,
          completenessScore: analysis.completenessAssessment?.score,
          missedAspects: analysis.missedAspects,
          followUpQuestionsCount: analysis.followUpQuestions?.length || 0,
        };

        await requirement.save();
        await this.memoryService.updateRequirement(requirement);

        await this.logDialogue(requirementId, {
          type: 'dialogue_analysis',
          analysisType: 'multi_round',
          sessionId,
          effectivenessScore: analysis.effectivenessScore,
          semanticCoherenceScore: analysis.semanticCoherence?.score,
          completenessScore: analysis.completenessAssessment?.score,
        });

        this.logger.log(
          `Successfully analyzed multi-round dialogue for requirement: ${requirementId}`,
        );
        return analysis;
      } catch (parseError) {
        this.logger.error(`Failed to parse multi-round dialogue analysis: ${parseError.message}`);
        throw new Error(`Failed to parse multi-round dialogue analysis: ${parseError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error analyzing multi-round dialogue: ${error.message}`, error.stack);
      throw new Error(`Failed to analyze multi-round dialogue: ${error.message}`);
    }
  }

  /**
   * 生成期望模型总结
   * 基于期望模型生成简洁的总结，确保用户理解系统将要实现什么
   */
  /**
   * 生成期望摘要
   * 为期望生成简洁的摘要，便于用户理解和确认
   * 增强版本包含详细的日志记录、错误处理和语义分析
   */
  async generateExpectationSummary(expectationId: string): Promise<any> {
    this.logger.log(`Generating expectation summary for expectation: ${expectationId}`);

    try {
      const sessionId = uuidv4();
      this.logger.debug(`Generated session ID for expectation summary: ${sessionId}`);

      const expectation = await this.expectationModel.findById(expectationId).exec();

      if (!expectation) {
        this.logger.error(`Expectation not found: ${expectationId}`);
        throw new Error('Expectation not found');
      }

      this.logger.debug(`Found expectation: ${expectation.title || 'Untitled'}`);

      const modelSize = JSON.stringify(expectation.model).length;

      this.logger.debug('Expectation metrics', {
        expectationId,
        modelSize,
        createdAt: expectation.createdAt,
        updatedAt: expectation.updatedAt,
      });

      this.logger.debug('Generating summary prompt for expectation');
      const summaryPrompt = `
        基于以下期望模型，生成一个简洁的总结，确保用户理解系统将要实现什么：

        期望模型：
        ${JSON.stringify(expectation.model, null, 2)}

        请生成一个总结，包含：
        1. 系统的主要目标和价值
        2. 核心功能概述
        3. 关键非功能特性
        4. 主要约束条件
        5. 对用户最重要的方面
        6. 语义连贯性评估
        7. 完整性评分（1-100）

        总结应该：
        - 使用非技术语言，便于所有利益相关者理解
        - 突出最重要的期望
        - 清晰表达系统的价值主张
        - 长度适中（200-300字）

        以JSON格式返回结果，包含以下字段：
        - mainGoal: 字符串，表示系统的主要目标和价值
        - coreFunctions: 字符串数组，表示核心功能概述
        - nonFunctionalFeatures: 字符串数组，表示关键非功能特性
        - constraints: 字符串数组，表示主要约束条件
        - userImportance: 字符串，表示对用户最重要的方面
        - semanticCoherence: 对象，包含score和analysis
        - completenessScore: 数字(1-100)
        - summary: 字符串，包含整体摘要
      `;

      this.logger.debug('Sending summary prompt to LLM service');
      const summaryText = await this.llmRouterService.generateContent(summaryPrompt, {
        systemPrompt: `你是一个专业的软件需求分析师，擅长将复杂的期望模型转化为简洁明了的总结。
        你的总结应该使用非技术语言，便于所有利益相关者理解，并突出最重要的期望。
        你的分析应该关注语义连贯性、需求完整性和实现可行性。`,
      });

      let summary;
      try {
        summary = JSON.parse(summaryText);

        this.logger.debug('Successfully parsed expectation summary', {
          mainGoalLength: summary.mainGoal?.length || 0,
          coreFunctionsCount: summary.coreFunctions?.length || 0,
          nonFunctionalFeaturesCount: summary.nonFunctionalFeatures?.length || 0,
          constraintsCount: summary.constraints?.length || 0,
          semanticCoherenceScore: summary.semanticCoherence?.score,
          completenessScore: summary.completenessScore,
        });

        if (!expectation.metadata) {
          expectation.metadata = {};
        }

        expectation.metadata.summary = {
          timestamp: new Date().toISOString(),
          sessionId,
          completenessScore: summary.completenessScore,
          semanticCoherenceScore: summary.semanticCoherence?.score,
        };

        await expectation.save();

        if (expectation.requirementId) {
          await this.logDialogue(expectation.requirementId, {
            type: 'expectation_summary',
            expectationId,
            sessionId,
            completenessScore: summary.completenessScore,
            semanticCoherenceScore: summary.semanticCoherence?.score,
          });
        }

        this.logger.log(`Successfully generated summary for expectation: ${expectationId}`);
        return summary;
      } catch (parseError) {
        this.logger.error(`Failed to parse expectation summary: ${parseError.message}`);
        return {
          expectationId,
          summary: summaryText,
          error: 'Failed to parse as JSON, returning raw text',
        };
      }
    } catch (error) {
      this.logger.error(`Error generating expectation summary: ${error.message}`, error.stack);
      throw new Error(`Failed to generate expectation summary: ${error.message}`);
    }
  }

  /**
   * 记录对话日志
   * 记录用户与系统之间的对话，包括问题、回答和元数据
   * 增强版本包含详细的日志记录和错误处理
   */
  async logDialogue(requirementId: string, message: any): Promise<void> {
    this.logger.log(`Logging dialogue message for requirement: ${requirementId}`);

    try {
      const sessionId = message.sessionId || uuidv4();
      const timestamp = new Date();

      this.logger.debug(`Dialogue log session ID: ${sessionId}`);

      const requirement = await this.requirementModel.findById(requirementId).exec();

      if (!requirement) {
        this.logger.error(`Requirement not found: ${requirementId}`);
        throw new Error('Requirement not found');
      }

      if (!requirement.dialogueLog) {
        this.logger.debug('Initializing dialogue log array for requirement');
        requirement.dialogueLog = [];
      }

      const enhancedMessage = {
        ...message,
        timestamp,
        sessionId,
        metadata: {
          ...(message.metadata || {}),
          logTimestamp: timestamp.toISOString(),
          requirementStatus: requirement.status,
          clarificationRound: requirement.clarifications?.length || 0,
          conversationLength: requirement.dialogueLog.length + 1,
        },
      };

      this.logger.debug(`Adding message of type: ${message.type || 'unspecified'} to dialogue log`);
      requirement.dialogueLog.push(enhancedMessage);

      if (!requirement.metadata) {
        requirement.metadata = {};
      }

      requirement.metadata.lastDialogueTimestamp = timestamp.toISOString();
      requirement.metadata.dialogueCount = requirement.dialogueLog.length;
      requirement.metadata.lastMessageType = message.type;

      requirement.updatedAt = timestamp;

      this.logger.debug('Saving requirement with updated dialogue log');
      await requirement.save();

      this.logger.debug('Updating requirement in memory service');
      await this.memoryService.updateRequirement(requirement);

      this.logger.log(`Successfully logged dialogue message for requirement: ${requirementId}`);
    } catch (error) {
      this.logger.error(`Error logging dialogue: ${error.message}`, error.stack);
      throw new Error(`Failed to log dialogue: ${error.message}`);
    }
  }
}
