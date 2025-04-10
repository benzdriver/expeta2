import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../services/llm.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../memory/schemas/memory.schema';

@Injectable()
export class SemanticMediatorService {
  private readonly logger = new Logger(SemanticMediatorService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  /**
   * 在不同模块之间转换数据，保持语义一致性
   */
  async translateBetweenModules(sourceModule: string, targetModule: string, data: any): Promise<any> {
    try {
      const sourceData = JSON.stringify(data, null, 2);
      return await this.llmService.translateBetweenModules(sourceModule, targetModule, sourceData);
    } catch (error) {
      this.logger.error(`Error translating between modules: ${error.message}`, error.stack);
      throw new Error(`Failed to translate data from ${sourceModule} to ${targetModule}: ${error.message}`);
    }
  }

  /**
   * 使用上下文信息丰富模块数据
   */
  async enrichWithContext(module: string, data: any, contextQuery: string): Promise<any> {
    try {
      const relatedMemories = await this.memoryService.getRelatedMemories(contextQuery);
      
      if (!relatedMemories || relatedMemories.length === 0) {
        this.logger.debug(`No related memories found for query: ${contextQuery}`);
        return data;
      }
      
      const originalData = JSON.stringify({
        ...data,
        _relatedMemories: relatedMemories.map(m => m.content)
      }, null, 2);
      
      return await this.llmService.enrichWithContext(module, originalData, contextQuery);
    } catch (error) {
      this.logger.error(`Error enriching with context: ${error.message}`, error.stack);
      throw new Error(`Failed to enrich data with context: ${error.message}`);
    }
  }

  /**
   * 解决不同模块之间的语义冲突
   */
  async resolveSemanticConflicts(moduleA: string, dataA: any, moduleB: string, dataB: any): Promise<any> {
    try {
      const dataAString = JSON.stringify(dataA, null, 2);
      const dataBString = JSON.stringify(dataB, null, 2);
      
      return await this.llmService.resolveSemanticConflicts(moduleA, dataAString, moduleB, dataBString);
    } catch (error) {
      this.logger.error(`Error resolving semantic conflicts: ${error.message}`, error.stack);
      throw new Error(`Failed to resolve semantic conflicts between ${moduleA} and ${moduleB}: ${error.message}`);
    }
  }

  /**
   * 从数据中提取语义洞察
   */
  async extractSemanticInsights(data: any, query: string): Promise<any> {
    try {
      const dataString = JSON.stringify(data, null, 2);
      return await this.llmService.extractSemanticInsights(dataString, query);
    } catch (error) {
      this.logger.error(`Error extracting semantic insights: ${error.message}`, error.stack);
      throw new Error(`Failed to extract semantic insights: ${error.message}`);
    }
  }

  /**
   * 跟踪和记录模块间的语义转换
   * 增强版本：添加了详细的转换分析和差异检测
   */
  async trackSemanticTransformation(
    sourceModule: string, 
    targetModule: string, 
    sourceData: any, 
    transformedData: any,
    options?: {
      trackDifferences?: boolean;
      analyzeTransformation?: boolean;
      saveToMemory?: boolean;
    }
  ): Promise<any> {
    const trackOptions = {
      trackDifferences: true,
      analyzeTransformation: true,
      saveToMemory: true,
      ...options
    };
    
    try {
      const transformationRecord = {
        sourceModule,
        targetModule,
        sourceData,
        transformedData,
        timestamp: new Date(),
        transformationId: `${sourceModule}_to_${targetModule}_${Date.now()}`
      };
      
      if (trackOptions.trackDifferences) {
        this.logger.debug('Analyzing semantic differences between source and transformed data');
        
        const differenceAnalysis = await this.analyzeSemanticDifferences(
          sourceData, 
          transformedData,
          sourceModule,
          targetModule
        );
        
        transformationRecord['differences'] = differenceAnalysis;
      }
      
      if (trackOptions.analyzeTransformation) {
        this.logger.debug('Generating transformation analysis report');
        
        const transformationAnalysis = await this.generateTransformationAnalysis(
          sourceModule,
          targetModule,
          sourceData,
          transformedData
        );
        
        transformationRecord['analysis'] = transformationAnalysis;
      }
      
      if (trackOptions.saveToMemory) {
        this.logger.debug(`Storing semantic transformation from ${sourceModule} to ${targetModule} in memory`);
        
        await this.memoryService.storeMemory({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: transformationRecord,
          metadata: {
            sourceModule,
            targetModule,
            timestamp: new Date(),
            hasAnalysis: trackOptions.analyzeTransformation,
            hasDifferences: trackOptions.trackDifferences,
            transformationId: transformationRecord.transformationId
          },
          tags: [
            'semantic_transformation', 
            sourceModule, 
            targetModule, 
            `${sourceModule}_to_${targetModule}`,
            transformationRecord.transformationId
          ]
        });
      }
      
      this.logger.log(`Successfully tracked semantic transformation from ${sourceModule} to ${targetModule}`);
      return transformationRecord;
    } catch (error) {
      this.logger.error(`Error tracking semantic transformation: ${error.message}`, error.stack);
      throw new Error(`Failed to track semantic transformation: ${error.message}`);
    }
  }
  
  /**
   * 分析源数据和转换后数据之间的语义差异
   * 私有方法，用于支持trackSemanticTransformation
   */
  private async analyzeSemanticDifferences(
    sourceData: any, 
    transformedData: any,
    sourceModule: string,
    targetModule: string
  ): Promise<any> {
    try {
      const differencePrompt = `
        分析以下两组数据之间的语义差异：
        
        源模块 (${sourceModule}) 数据：
        ${JSON.stringify(sourceData, null, 2)}
        
        目标模块 (${targetModule}) 数据：
        ${JSON.stringify(transformedData, null, 2)}
        
        请详细分析：
        1. 语义保留情况：哪些关键语义被保留，哪些被改变或丢失
        2. 结构变化：数据结构如何变化，以及这些变化的目的
        3. 信息增减：哪些信息被添加或删除，为什么
        4. 潜在问题：转换过程中可能存在的问题或风险
        
        以JSON格式返回分析结果，包含以下字段：
        - semanticPreservation: 对象，包含保留的关键语义和变化/丢失的语义
        - structuralChanges: 数组，每个元素描述一个结构变化及其目的
        - informationChanges: 对象，包含添加的信息和删除的信息及原因
        - potentialIssues: 数组，每个元素描述一个潜在问题或风险
        - overallAssessment: 字符串，总体评估
      `;
      
      const analysisText = await this.llmService.generateContent(differencePrompt, {
        systemPrompt: '你是一个专业的语义分析专家，擅长分析数据转换过程中的语义变化。',
      });
      
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error analyzing semantic differences: ${error.message}`, error.stack);
      return {
        error: `Failed to analyze semantic differences: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * 生成转换分析报告
   * 私有方法，用于支持trackSemanticTransformation
   */
  private async generateTransformationAnalysis(
    sourceModule: string,
    targetModule: string,
    sourceData: any,
    transformedData: any
  ): Promise<any> {
    try {
      const analysisPrompt = `
        生成以下语义转换的分析报告：
        
        源模块：${sourceModule}
        目标模块：${targetModule}
        
        源数据：
        ${JSON.stringify(sourceData, null, 2)}
        
        转换后的数据：
        ${JSON.stringify(transformedData, null, 2)}
        
        请分析：
        1. 转换的主要目的和意图
        2. 转换过程中应用的主要语义转换规则
        3. 转换的完整性和准确性
        4. 转换后数据对目标模块的适用性
        5. 转换过程中的创新点或特殊处理
        
        以JSON格式返回分析报告，包含以下字段：
        - purpose: 字符串，转换的主要目的
        - transformationRules: 数组，应用的主要转换规则
        - completeness: 数字(0-100)，转换的完整性评分
        - accuracy: 数字(0-100)，转换的准确性评分
        - applicability: 数字(0-100)，转换后数据对目标模块的适用性评分
        - innovations: 数组，转换过程中的创新点
        - recommendations: 数组，改进建议
      `;
      
      const analysisText = await this.llmService.generateContent(analysisPrompt, {
        systemPrompt: '你是一个专业的语义转换分析专家，擅长评估模块间数据转换的质量和特点。',
      });
      
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error generating transformation analysis: ${error.message}`, error.stack);
      return {
        error: `Failed to generate transformation analysis: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * 评估语义转换的质量
   */
  async evaluateSemanticTransformation(sourceData: any, transformedData: any, 
                                      expectedOutcome: string): Promise<any> {
    try {
      const evaluationPrompt = `
        评估以下语义转换的质量：
        
        源数据：
        ${JSON.stringify(sourceData, null, 2)}
        
        转换后的数据：
        ${JSON.stringify(transformedData, null, 2)}
        
        期望的结果描述：
        ${expectedOutcome}
        
        请评估转换的质量，包括：
        1. 语义保留度（0-100）
        2. 结构适应性（0-100）
        3. 信息完整性（0-100）
        4. 总体质量（0-100）
        5. 改进建议
        
        以JSON格式返回评估结果。
      `;
      
      const evaluationText = await this.llmService.generateContent(evaluationPrompt, {
        systemPrompt: '你是一个专业的语义转换评估专家，擅长评估数据转换的质量和准确性。',
      });
      
      return JSON.parse(evaluationText);
    } catch (error) {
      this.logger.error(`Error evaluating semantic transformation: ${error.message}`, error.stack);
      throw new Error(`Failed to evaluate semantic transformation: ${error.message}`);
    }
  }
  
  /**
   * 生成自适应验证上下文
   * 基于语义分析为验证过程提供上下文信息
   */
  async generateValidationContext(
    expectationId: string,
    codeId: string,
    previousValidations: string[] = [],
    options: {
      focusAreas?: string[];
      strategy?: 'balanced' | 'strict' | 'lenient' | 'performance' | 'security' | 'custom';
      customWeights?: Record<string, number>;
    } = {}
  ): Promise<any> {
    this.logger.log(`Generating validation context for expectation: ${expectationId}, code: ${codeId}`);
    
    try {
      const expectationMemories = await this.memoryService.getMemoryByType(MemoryType.EXPECTATION);
      const expectation = expectationMemories.find(
        (memory) => memory.content._id.toString() === expectationId,
      )?.content;
      
      const codeMemories = await this.memoryService.getMemoryByType(MemoryType.CODE);
      const code = codeMemories.find(
        (memory) => memory.content._id.toString() === codeId,
      )?.content;
      
      if (!expectation || !code) {
        this.logger.error(`Expectation or Code not found for generating validation context`);
        throw new Error('Expectation or Code not found');
      }
      
      let previousValidationsData = [];
      if (previousValidations && previousValidations.length > 0) {
        const validationMemories = await this.memoryService.getMemoryByType(MemoryType.VALIDATION);
        previousValidationsData = validationMemories
          .filter(memory => previousValidations.includes(memory.content._id.toString()))
          .map(memory => memory.content);
      }
      
      const codeFeatures = await this.extractCodeFeatures(code);
      
      const semanticRelationship = await this.analyzeSemanticRelationship(expectation, code);
      
      const strategy = options.strategy || 'balanced';
      let weights = this.getStrategyWeights(strategy);
      
      if (options.customWeights) {
        weights = { ...weights, ...options.customWeights };
      }
      
      if (previousValidationsData.length > 0) {
        weights = this.adjustWeightsBasedOnPreviousValidations(weights, previousValidationsData);
      }
      
      let focusAreas = options.focusAreas || [];
      
      if (focusAreas.length === 0 && previousValidationsData.length > 0) {
        focusAreas = this.suggestFocusAreasFromPreviousValidations(previousValidationsData);
      }
      
      const validationContext = {
        strategy,
        weights,
        focusAreas,
        previousValidations,
        semanticContext: {
          codeFeatures,
          semanticRelationship,
          expectationSummary: this.summarizeExpectation(expectation),
          validationHistory: this.summarizeValidationHistory(previousValidationsData)
        }
      };
      
      this.logger.debug(`Generated validation context with strategy: ${strategy}, focusAreas: ${focusAreas.join(', ')}`);
      return validationContext;
    } catch (error) {
      this.logger.error(`Error generating validation context: ${error.message}`, error.stack);
      throw new Error(`Failed to generate validation context: ${error.message}`);
    }
  }
  
  /**
   * 提取代码特征
   * 私有方法，用于支持generateValidationContext
   */
  private async extractCodeFeatures(code: any): Promise<any> {
    try {
      const codeContent = code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n');
      
      const featuresPrompt = `
        分析以下代码，提取其主要特征：
        
        ${codeContent}
        
        请提取以下特征：
        1. 代码复杂度
        2. 主要功能模块
        3. 使用的设计模式
        4. 潜在的性能瓶颈
        5. 安全性考虑
        6. 可维护性特征
        
        以JSON格式返回分析结果。
      `;
      
      const featuresText = await this.llmService.generateContent(featuresPrompt, {
        systemPrompt: '你是一个专业的代码分析专家，擅长分析代码的结构和特征。',
      });
      
      return JSON.parse(featuresText);
    } catch (error) {
      this.logger.error(`Error extracting code features: ${error.message}`, error.stack);
      return {
        error: `Failed to extract code features: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * 分析期望和代码之间的语义关系
   * 私有方法，用于支持generateValidationContext
   */
  private async analyzeSemanticRelationship(expectation: any, code: any): Promise<any> {
    try {
      const codeContent = code.files.map(file => `文件路径: ${file.path}\n内容:\n${file.content}`).join('\n\n');
      
      const relationshipPrompt = `
        分析以下期望模型和代码之间的语义关系：
        
        期望模型：
        ${JSON.stringify(expectation.model, null, 2)}
        
        代码：
        ${codeContent}
        
        请分析：
        1. 代码与期望的匹配度
        2. 代码实现了哪些期望的功能
        3. 代码未实现的期望功能
        4. 代码超出期望的功能
        5. 代码与期望在语义上的差异
        
        以JSON格式返回分析结果。
      `;
      
      const relationshipText = await this.llmService.generateContent(relationshipPrompt, {
        systemPrompt: '你是一个专业的语义分析专家，擅长分析代码与需求之间的关系。',
      });
      
      return JSON.parse(relationshipText);
    } catch (error) {
      this.logger.error(`Error analyzing semantic relationship: ${error.message}`, error.stack);
      return {
        error: `Failed to analyze semantic relationship: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * 根据验证策略获取权重
   * 私有方法，用于支持generateValidationContext
   */
  private getStrategyWeights(strategy: string): Record<string, number> {
    switch (strategy) {
      case 'strict':
        return {
          functionality: 1.5,
          performance: 1.0,
          security: 1.2,
          maintainability: 1.0,
          testability: 1.0
        };
      case 'lenient':
        return {
          functionality: 1.2,
          performance: 0.8,
          security: 0.8,
          maintainability: 0.8,
          testability: 0.7
        };
      case 'performance':
        return {
          functionality: 1.0,
          performance: 2.0,
          security: 0.8,
          maintainability: 0.7,
          testability: 0.6
        };
      case 'security':
        return {
          functionality: 1.0,
          performance: 0.8,
          security: 2.0,
          maintainability: 0.8,
          testability: 0.7
        };
      case 'balanced':
      default:
        return {
          functionality: 1.0,
          performance: 1.0,
          security: 1.0,
          maintainability: 1.0,
          testability: 1.0
        };
    }
  }
  
  /**
   * 基于先前验证结果调整权重
   * 私有方法，用于支持generateValidationContext
   */
  private adjustWeightsBasedOnPreviousValidations(
    weights: Record<string, number>,
    previousValidations: any[]
  ): Record<string, number> {
    const adjustedWeights = { ...weights };
    
    if (!previousValidations || previousValidations.length === 0) {
      return adjustedWeights;
    }
    
    const latestValidation = previousValidations[previousValidations.length - 1];
    
    if (latestValidation.details && latestValidation.details.length > 0) {
      const failureCount = {
        functionality: 0,
        performance: 0,
        security: 0,
        maintainability: 0,
        testability: 0
      };
      
      for (const detail of latestValidation.details) {
        const message = detail.message.toLowerCase();
        
        if (detail.status === 'failed' || detail.status === 'partial') {
          if (message.includes('功能') || message.includes('function')) {
            failureCount.functionality++;
          }
          if (message.includes('性能') || message.includes('performance')) {
            failureCount.performance++;
          }
          if (message.includes('安全') || message.includes('security')) {
            failureCount.security++;
          }
          if (message.includes('可维护') || message.includes('maintainability')) {
            failureCount.maintainability++;
          }
          if (message.includes('可测试') || message.includes('testability')) {
            failureCount.testability++;
          }
        }
      }
      
      for (const [aspect, count] of Object.entries(failureCount)) {
        if (count > 0 && adjustedWeights[aspect]) {
          adjustedWeights[aspect] = Math.min(adjustedWeights[aspect] * (1 + 0.2 * count), 2.0);
        }
      }
    }
    
    return adjustedWeights;
  }
  
  /**
   * 从先前验证结果中推荐重点关注领域
   * 私有方法，用于支持generateValidationContext
   */
  private suggestFocusAreasFromPreviousValidations(previousValidations: any[]): string[] {
    const focusAreas = [];
    
    if (!previousValidations || previousValidations.length === 0) {
      return focusAreas;
    }
    
    const latestValidation = previousValidations[previousValidations.length - 1];
    
    if (latestValidation.details && latestValidation.details.length > 0) {
      for (const detail of latestValidation.details) {
        if (detail.status === 'failed' || detail.status === 'partial') {
          const message = detail.message.toLowerCase();
          
          if (message.includes('功能') || message.includes('function')) {
            focusAreas.push('functionality');
          }
          if (message.includes('性能') || message.includes('performance')) {
            focusAreas.push('performance');
          }
          if (message.includes('安全') || message.includes('security')) {
            focusAreas.push('security');
          }
          if (message.includes('可维护') || message.includes('maintainability')) {
            focusAreas.push('maintainability');
          }
          if (message.includes('可测试') || message.includes('testability')) {
            focusAreas.push('testability');
          }
          
          if (detail.semanticInsights) {
            const insights = detail.semanticInsights.toLowerCase();
            const specificAreas = this.extractSpecificFocusAreas(insights);
            focusAreas.push(...specificAreas);
          }
        }
      }
    }
    
    return [...new Set(focusAreas)];
  }
  
  /**
   * 从语义洞察中提取具体的关注领域
   * 私有方法，用于支持suggestFocusAreasFromPreviousValidations
   */
  private extractSpecificFocusAreas(insights: string): string[] {
    const specificAreas = [];
    
    const keywordMap = {
      '错误处理': 'error_handling',
      'error handling': 'error_handling',
      '异常处理': 'exception_handling',
      'exception handling': 'exception_handling',
      '输入验证': 'input_validation',
      'input validation': 'input_validation',
      '并发': 'concurrency',
      'concurrency': 'concurrency',
      '内存泄漏': 'memory_leaks',
      'memory leak': 'memory_leaks',
      '代码重复': 'code_duplication',
      'code duplication': 'code_duplication',
      '命名': 'naming',
      'naming': 'naming',
      '注释': 'comments',
      'comments': 'comments',
      '文档': 'documentation',
      'documentation': 'documentation',
      '测试覆盖': 'test_coverage',
      'test coverage': 'test_coverage',
      '边界条件': 'boundary_conditions',
      'boundary conditions': 'boundary_conditions',
      '算法效率': 'algorithm_efficiency',
      'algorithm efficiency': 'algorithm_efficiency',
      '数据结构': 'data_structures',
      'data structures': 'data_structures',
      '设计模式': 'design_patterns',
      'design patterns': 'design_patterns',
      '接口设计': 'interface_design',
      'interface design': 'interface_design',
      '模块化': 'modularity',
      'modularity': 'modularity',
      '可扩展性': 'scalability',
      'scalability': 'scalability',
      '安全漏洞': 'security_vulnerabilities',
      'security vulnerabilities': 'security_vulnerabilities',
      '认证': 'authentication',
      'authentication': 'authentication',
      '授权': 'authorization',
      'authorization': 'authorization',
      '加密': 'encryption',
      'encryption': 'encryption',
      '日志': 'logging',
      'logging': 'logging',
      '监控': 'monitoring',
      'monitoring': 'monitoring',
      '性能优化': 'performance_optimization',
      'performance optimization': 'performance_optimization',
      '响应时间': 'response_time',
      'response time': 'response_time',
      '资源利用': 'resource_utilization',
      'resource utilization': 'resource_utilization',
      '用户体验': 'user_experience',
      'user experience': 'user_experience',
      '可访问性': 'accessibility',
      'accessibility': 'accessibility',
      '国际化': 'internationalization',
      'internationalization': 'internationalization',
      '本地化': 'localization',
      'localization': 'localization'
    };
    
    for (const [keyword, area] of Object.entries(keywordMap)) {
      if (insights.includes(keyword)) {
        specificAreas.push(area);
      }
    }
    
    return specificAreas;
  }
  
  /**
   * 总结期望
   * 私有方法，用于支持generateValidationContext
   */
  private summarizeExpectation(expectation: any): any {
    return {
      id: expectation._id.toString(),
      title: expectation.title || '未命名期望',
      description: expectation.description || '无描述',
      type: expectation.type || 'unknown',
      priority: expectation.priority || 'medium',
      createdAt: expectation.createdAt,
      modelSummary: this.summarizeExpectationModel(expectation.model)
    };
  }
  
  /**
   * 总结期望模型
   * 私有方法，用于支持summarizeExpectation
   */
  private summarizeExpectationModel(model: any): any {
    if (!model) {
      return { summary: '无模型数据' };
    }
    
    return {
      mainFeatures: model.features || model.mainFeatures || [],
      constraints: model.constraints || [],
      dependencies: model.dependencies || [],
      technicalRequirements: model.technicalRequirements || model.technical || []
    };
  }
  
  /**
   * 总结验证历史
   * 私有方法，用于支持generateValidationContext
   */
  private summarizeValidationHistory(validations: any[]): any {
    if (!validations || validations.length === 0) {
      return { summary: '无验证历史' };
    }
    
    const scores = validations.map(v => v.score);
    const trend = this.calculateTrend(scores);
    
    const commonIssues = this.extractCommonIssues(validations);
    
    const improvementAreas = this.extractImprovementAreas(validations);
    
    return {
      validationCount: validations.length,
      latestScore: scores[scores.length - 1],
      scoreTrend: trend,
      commonIssues,
      improvementAreas,
      validationDates: validations.map(v => v.createdAt)
    };
  }
  
  /**
   * 计算趋势
   * 私有方法，用于支持summarizeValidationHistory
   */
  private calculateTrend(scores: number[]): string {
    if (scores.length < 2) {
      return 'stable';
    }
    
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const diff = lastScore - firstScore;
    
    if (diff > 5) {
      return 'improving';
    } else if (diff < -5) {
      return 'declining';
    } else {
      return 'stable';
    }
  }
  
  /**
   * 提取常见问题
   * 私有方法，用于支持summarizeValidationHistory
   */
  private extractCommonIssues(validations: any[]): string[] {
    const issueCount = {};
    
    for (const validation of validations) {
      if (validation.details && validation.details.length > 0) {
        for (const detail of validation.details) {
          if (detail.status === 'failed' || detail.status === 'partial') {
            const message = detail.message;
            
            if (issueCount[message]) {
              issueCount[message]++;
            } else {
              issueCount[message] = 1;
            }
          }
        }
      }
    }
    
    const sortedIssues = Object.entries(issueCount)
      .sort((a: [string, any], b: [string, any]) => b[1] - a[1])
      .map(([issue]) => issue);
    
    return sortedIssues.slice(0, 5);
  }
  
  /**
   * 提取改进领域
   * 私有方法，用于支持summarizeValidationHistory
   */
  private extractImprovementAreas(validations: any[]): string[] {
    const recentValidations = validations.slice(-3);
    const areas = new Set<string>();
    
    for (const validation of recentValidations) {
      if (validation.details && validation.details.length > 0) {
        for (const detail of validation.details) {
          if (detail.status === 'failed' || detail.status === 'partial') {
            if (detail.improvement) {
              areas.add(detail.improvement);
            }
          }
        }
      }
    }
    
    return Array.from(areas);
  }
}
