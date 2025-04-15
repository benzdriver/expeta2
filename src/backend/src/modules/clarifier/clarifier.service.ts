import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Requirement } from './schemas/requirement.schema';
import { Expectation } from './schemas/expectation.schema';
import { CreateRequirementDto, UpdateRequirementDto } from './dto';
import { LlmRouterService } from '../../services/llm-router.service';
import { MemoryService } from '../memory/memory.service';
import { SemanticMediatorService } from '../semantic-mediator/semantic-mediator.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClarifierService {
  private readonly logger = new Logger(ClarifierService.name);

  constructor(
    @InjectModel(Requirement.name) private requirementModel: Model<Requirement>,
    @InjectModel(Expectation.name) private expectationModel: Model<Expectation>,
    private readonly llmRouterService: LlmRouterService,
    private readonly memoryService: MemoryService,
    private readonly semanticMediatorService: SemanticMediatorService,
  ) {
    this.logger.log('ClarifierService initialized');
  }

  async createRequirement(createRequirementDto: CreateRequirementDto): Promise<Requirement> {
    this.logger.log(`Creating new requirement: ${createRequirementDto.title || 'Untitled'}`);

    try {
      const _requirementId = 
      this.logger.debug(`Generated requirement ID: ${requirementId}`);

      const _createdRequirement = 
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
      const _savedRequirement = 

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
    const _updatedRequirement = 
      .findByIdAndUpdate(id, { ...updateRequirementDto, updatedAt: new Date() }, { new: true })
      .exec();

    await this.memoryService.updateRequirement(updatedRequirement);

    return updatedRequirement;
  }

  async deleteRequirement(id: string): Promise<Requirement> {
    const _deletedRequirement = 

    await this.memoryService.deleteRequirement(id);

    return deletedRequirement;
  }

  async generateClarificationQuestions(requirementText: string): Promise<any> {
    this.logger.log('Generating clarification questions for requirement');
    this.logger.debug(`Requirement text length: ${requirementText.length} characters`);

    try {
      const _sessionId = 
      this.logger.debug(`Generated session ID for clarification: ${sessionId}`);

      const _requirementData = 
        text: requirementText,
        sessionId,
        timestamp: new Date().toISOString(),
      };

      const _clarificationQuery = 
        生成5个关键澄清问题，以帮助更好地理解需求。
        每个问题应该：
        1. 针对需求中的不确定性或模糊点
        2. 帮助理解用户的真实意图
        3. 探索相似行业的设计模式
        4. 明确功能边界和优先级
        5. 确认非功能性需求（如性能、安全性等）
        
        返回JSON格式的问题列表，每个问题包含id、text、category和priority字段。
        每个问题的priority应该是high、medium或low，表示该问题对理解需求的重要性。
      `;

      this.logger.debug('Extracting semantic insights for clarification questions', {
        sessionId,
        timestamp: new Date().toISOString(),
        requirementTextLength: requirementText.length,
        operation: 'extract_semantic_insights_for_clarification',
      });

      const _questions = 
        requirementData,
        clarificationQuery,
      );

      if (Array.isArray(questions)) {
        const _categories = 
        const _priorities = 

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

        this.logger.log(`Successfully generated ${questions.length} clarification questions`);
      } else {
        this.logger.warn('Unexpected response format from semantic mediator', {
          responseType: typeof questions,
          isArray: Array.isArray(questions),
        });
      }

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
      const _sessionId = 
      this.logger.debug(`Generated session ID for clarification answer: ${sessionId}`);

      const _requirement = 

      if (!requirement) {
        this.logger.error(`Requirement not found: ${requirementId}`);
        throw new Error('Requirement not found');
      }

      this.logger.debug(`Found requirement: ${requirement.title || 'Untitled'}`);

      if (!requirement.clarifications) {
        this.logger.debug('Initializing clarifications array for requirement');
        requirement.clarifications = [];
      }

      const _existingClarificationIndex = 
        (c) => c.questionId === questionId,
      );

      const _timestamp = 

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

      const _clarificationRound = 
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
      const _updatedRequirement = 

      this.logger.debug('Updating requirement in memory service');
      await this.memoryService.updateRequirement(updatedRequirement);

      await this.logDialogue(requirementId, {
        type: 'clarification_answer',
        questionId,
        answer,
        round: clarificationRound,
        sessionId,
      });

      const _requirementData = 
        text: requirement.text,
        clarifications: requirement.clarifications,
        metadata: requirement.metadata,
        status: requirement.status,
        sessionId,
        timestamp: timestamp.toISOString(),
      };

      const _contextQuery = 
        判断是否需要更多澄清：
        1. 当前澄清是否足够生成期望模型？
        2. 如果不够，还需要哪些方面的澄清？
        3. 如果足够，请总结关键理解点。
        4. 当前对话的有效性评分（1-100）
        
        返回JSON格式，包含needMoreClarification(布尔值)、summary(字符串)、missingAspects(数组)和dialogueEffectiveness(对象)字段。
      `;

      this.logger.debug('Enriching clarification data with context');

      const _analysis = 
        'clarifier',
        requirementData,
        contextQuery,
      );

      this.logger.debug('Successfully received enriched clarification analysis', {
        needMoreClarification: analysis.needMoreClarification,
        dialogueEffectiveness: analysis.dialogueEffectiveness,
      });

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
    const _requirement = 

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    const _sourceData = 
      requirementId,
      text: requirement.text,
      clarifications: requirement.clarifications,
      status: requirement.status,
      metadata: requirement.metadata || {},
      translationQuery: `
        生成结构化的纯语义期望模型，包含：
        1. 顶层期望：描述系统整体目标和价值
        2. 功能期望：描述系统应该做什么，而非如何做
        3. 非功能期望：描述系统的质量属性（性能、安全性、可用性等）
        4. 约束条件：描述系统必须遵守的限制
        
        返回JSON格式，包含id、name、description和children字段，其中children是子期望的数组。
      `,
    };

    const _parsedExpectations = 
      'clarifier',
      'expectation_generator',
      sourceData,
    );

    const _createdExpectation = 
      requirementId,
      model: parsedExpectations,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const _savedExpectation = 

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
    const _requirement = 

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

    const _clarificationHistory = 
      .map((c) => `问题ID: ${c.questionId}, 答案: ${c.answer}, 时间: ${c.timestamp}`)
      .join('\n');

    const _analysisPrompt = 
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

    const _analysisText = 
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
      const _sessionId = 
      this.logger.debug(`Generated session ID for multi-round dialogue analysis: ${sessionId}`);

      const _requirement = 

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

      const _clarificationRounds = 
      const _totalDialogueMessages = 
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

      const _requirementData = 
        id: requirementId,
        title: requirement.title,
        text: requirement.text,
        domain: requirement.domain || '未指定',
        priority: requirement.priority || '未指定',
        clarifications: requirement.clarifications,
        dialogueLog: requirement.dialogueLog || [],
        metadata: requirement.metadata || {},
        sessionId,
      };

      const _analysisData = 
        analysisType: 'multi_round_dialogue',
        criteria: [
          '对话的有效性评分及评分理由',
          '每轮对话的关键信息提取和语义标签',
          '对话中的转折点和重要发现',
          '用户关注点的变化趋势',
          '需求理解的演进过程',
          '对话中可能被忽略的重要方面',
          '改进对话效率的建议',
          '对话的语义连贯性分析',
          '需求的完整性评估',
          '建议的后续澄清问题',
        ],
        expectedFormat: {
          effectivenessScore: '数字(1-100)',
          scoreRationale: '字符串',
          keyInsights:
            '对象数组，每个对象包含roundNumber、insights(字符串数组)和semanticTags(字符串数组)',
          pivotalMoments: '对象数组，每个对象包含roundNumber、description和impact',
          focusShifts: '对象数组，每个对象包含from、to和roundNumber',
          requirementEvolution: '对象，包含initial、intermediate和current字段',
          missedAspects: '字符串数组',
          improvementSuggestions: '字符串数组',
          semanticCoherence: '对象，包含score和analysis',
          completenessAssessment: '对象，包含score、missingElements和recommendations',
          followUpQuestions: '对象数组，每个对象包含question、priority和rationale',
        },
      };

      this.logger.debug('Resolving semantic conflicts in multi-round dialogue');

      const _analysis = 
        'requirement',
        requirementData,
        'dialogue_analysis',
        analysisData,
      );

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
      const _sessionId = 
      this.logger.debug(`Generated session ID for expectation summary: ${sessionId}`);

      const _expectation = 

      if (!expectation) {
        this.logger.error(`Expectation not found: ${expectationId}`);
        throw new Error('Expectation not found');
      }

      this.logger.debug(`Found expectation: ${expectation.title || 'Untitled'}`);

      const _modelSize = 

      this.logger.debug('Expectation metrics', {
        expectationId,
        modelSize,
        createdAt: expectation.createdAt,
        updatedAt: expectation.updatedAt,
      });

      this.logger.debug('Preparing expectation data for semantic transformation');

      const _sourceData = 
        expectationId,
        model: expectation.model,
        requirementId: expectation.requirementId,
        createdAt: expectation.createdAt,
        updatedAt: expectation.updatedAt,
        metadata: expectation.metadata || {},
      };

      const _transformationParams = 
        transformationType: 'expectation_summary',
        outputFormat: {
          mainGoal: '字符串，表示系统的主要目标和价值',
          coreFunctions: '字符串数组，表示核心功能概述',
          nonFunctionalFeatures: '字符串数组，表示关键非功能特性',
          constraints: '字符串数组，表示主要约束条件',
          userImportance: '字符串，表示对用户最重要的方面',
          semanticCoherence: '对象，包含score和analysis',
          completenessScore: '数字(1-100)',
          summary: '字符串，包含整体摘要',
        },
        transformationRules: [
          '使用非技术语言，便于所有利益相关者理解',
          '突出最重要的期望',
          '清晰表达系统的价值主张',
          '长度适中（200-300字）',
          '关注语义连贯性、需求完整性和实现可行性',
        ],
      };

      const _summaryObject = 
        mainGoal: `Summary of ${expectation.title || 'expectation'}`,
        coreFunctions: ['Function 1', 'Function 2'],
        nonFunctionalFeatures: ['Feature 1', 'Feature 2'],
        constraints: ['Constraint 1'],
        userImportance: 'Key user value proposition',
        semanticCoherence: { score: 85, analysis: 'Good coherence' },
        completenessScore: 90,
        summary: `Comprehensive summary of the expectation model for ${expectation.title || 'the system'}`,
      };

      this.logger.debug('Tracking semantic transformation for expectation summary');
      const _transformationResult = 
        'expectation',
        'summary',
        sourceData,
        summaryObject,
      );

      const _summary = 

      this.logger.debug('Successfully received expectation summary', {
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

      if (expectation.requirementId && process.env.NODE_ENV !== 'test') {
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
  async logDialogue(requirementId: string, message: unknown): Promise<void> {
    this.logger.log(`Logging dialogue message for requirement: ${requirementId}`);

    try {
      const _sessionId = 
      const _timestamp = 

      this.logger.debug(`Dialogue log session ID: ${sessionId}`);

      const _requirement = 

      if (!requirement) {
        this.logger.error(`Requirement not found: ${requirementId}`);
        throw new Error('Requirement not found');
      }

      if (!requirement.dialogueLog) {
        this.logger.debug('Initializing dialogue log array for requirement');
        requirement.dialogueLog = [];
      }

      const _enhancedMessage = 
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
