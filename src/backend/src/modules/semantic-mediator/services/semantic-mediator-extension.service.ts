import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from '../../memory/memory.service';
import { SemanticMediatorService } from '../semantic-mediator.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { 
  ValidationResult, 
  ValidationMessage, 
  TransformationFeedback, 
  SemanticConstraint
} from '../../memory/interfaces/semantic-memory.interfaces';

/**
 * 语义中介扩展服务
 * 提供从MemoryService移出的语义功能
 * 使用MemoryService处理存储，保持单向依赖
 */
@Injectable()
export class SemanticMediatorExtensionService {
  private readonly logger = new Logger(SemanticMediatorExtensionService.name);
  private semanticConstraints: Map<string, SemanticConstraint[]> = new Map();

  constructor(
    private readonly memoryService: MemoryService,
    private readonly semanticMediatorService: SemanticMediatorService,
  ) {
    this.logger.log('Semantic mediator extension service initialized');
    this.initializeSemanticConstraints();
  }

  /**
   * 初始化语义约束
   * @private
   */
  private initializeSemanticConstraints(): void {
    this.semanticConstraints.set(MemoryType.REQUIREMENT, [
      {
        field: 'title',
        constraint: 'Title must be descriptive and concise',
        validationFn: (value: any) => !!value && value.length > 3 && value.length < 100,
        errorMessage: 'Title must be between 3 and 100 characters',
        severity: 'error',
      },
      {
        field: 'status',
        constraint: 'Status must be a valid status value',
        validationFn: (value: any) => ['active', 'completed', 'pending', 'cancelled'].includes(value),
        errorMessage: 'Invalid status value',
        severity: 'error',
      },
    ]);

    this.semanticConstraints.set(MemoryType.EXPECTATION, [
      {
        field: 'requirementId',
        constraint: 'Must reference a valid requirement',
        validationFn: (value: any) => !!value && typeof value === 'string',
        errorMessage: 'Requirement ID is required',
        severity: 'error',
      },
      {
        field: 'title',
        constraint: 'Title must be descriptive',
        validationFn: (value: any) => !!value && value.length > 3,
        errorMessage: 'Title must be at least 3 characters',
        severity: 'error',
      },
    ]);

    this.semanticConstraints.set(MemoryType.SEMANTIC_TRANSFORMATION, [
      {
        field: 'sourceType',
        constraint: 'Source type must be specified',
        validationFn: (value: any) => !!value,
        errorMessage: 'Source type is required',
        severity: 'error',
      },
      {
        field: 'targetType',
        constraint: 'Target type must be specified',
        validationFn: (value: any) => !!value,
        errorMessage: 'Target type is required',
        severity: 'error',
      },
    ]);
  }

  /**
   * 存储带有语义转换的数据
   * @param data 源数据
   * @param targetSchema 目标模式
   * @returns 存储的记忆条目
   */
  async storeWithSemanticTransformation(data: any, targetSchema: any): Promise<any> {
    this.logger.log('Storing data with semantic transformation');

    try {
      const transformedData = await this.semanticMediatorService.translateToSchema(
        data, 
        targetSchema
      );

      return await this.memoryService.storeMemory({
        type: typeof data.type === 'string' ? data.type : MemoryType.SEMANTIC_TRANSFORMATION,
        content: transformedData,
        metadata: {
          originalType: typeof data.type === 'string' ? data.type : 'unknown',
          transformationTimestamp: new Date().toISOString(),
          targetSchemaId: targetSchema.id || 'unknown',
          transformationStatus: 'success',
        },
        tags: ['semantic_transformation', 'schema_based'],
        semanticMetadata: {
          description: `Semantically transformed data. Original type: ${typeof data.type === 'string' ? data.type : 'unknown'}`,
          relevanceScore: 0.9,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error storing data with semantic transformation: ${error.message}`,
        error.stack,
      );
      return undefined;
    }
  }

  /**
   * 注册记忆类型为语义数据源
   * @param memoryType 记忆类型
   * @param semanticDescription 语义描述
   */
  async registerAsDataSource(memoryType: MemoryType, semanticDescription: string): Promise<void> {
    this.logger.log(`Registering memory type as data source: ${memoryType}`);

    try {
      const sourceId = `memory_${memoryType}_${Date.now()}`;

      await this.semanticMediatorService.registerSemanticDataSource(
        sourceId,
        `Memory ${memoryType}`,
        'memory_system',
        semanticDescription,
      );

      await this.memoryService.storeMemory({
        type: MemoryType.SYSTEM,
        content: {
          action: 'register_data_source',
          memoryType,
          sourceId,
          semanticDescription,
        },
        metadata: {
          title: `Registered ${memoryType} as semantic data source`,
          timestamp: new Date().toISOString(),
        },
        tags: ['data_source_registration', memoryType, sourceId],
        semanticMetadata: {
          description: `Memory type ${memoryType} registered as semantic data source: ${semanticDescription}`,
          relevanceScore: 1.0,
        },
      });

      this.logger.debug(`Memory type registered as data source: ${memoryType} (${sourceId})`);
    } catch (error) {
      this.logger.error(
        `Error registering memory type as data source: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 记录转换反馈
   * 存储对语义转换的人工反馈以改进未来的转换
   * @param transformationId 转换ID
   * @param feedback 反馈信息
   */
  async recordTransformationFeedback(
    transformationId: string,
    feedback: TransformationFeedback,
  ): Promise<void> {
    this.logger.log(`Recording feedback for transformation: ${transformationId}`);

    try {
      const transformations = await this.memoryService.searchMemories(
        `transformationId:${transformationId}`, 
        1
      );

      if (!transformations || transformations.length === 0) {
        throw new Error(`Transformation with ID ${transformationId} not found`);
      }

      const transformation = transformations[0];

      await this.memoryService.storeMemory({
        type: MemoryType.SEMANTIC_FEEDBACK,
        content: {
          transformationId,
          feedback,
          originalTransformation: transformation.content,
          timestamp: new Date(),
        },
        metadata: {
          transformationId,
          rating: feedback.rating,
          requiresHumanReview: feedback.requiresHumanReview || false,
          providedBy: feedback.providedBy,
          timestamp: new Date(),
        },
        tags: ['semantic_feedback', transformationId, `rating_${feedback.rating}`],
        semanticMetadata: {
          description: `Feedback for semantic transformation ${transformationId}. Rating: ${feedback.rating}/5.`,
          relevanceScore: 1.0,
        },
      });

      await this.memoryService.updateMemory(
        MemoryType.SEMANTIC_TRANSFORMATION, 
        transformation._id, 
        {
          content: transformation.content,
          metadata: {
            ...transformation.metadata,
            hasFeedback: true,
            lastFeedbackTimestamp: new Date(),
            lastFeedbackRating: feedback.rating,
          },
        }
      );

      this.logger.debug(`Feedback recorded for transformation: ${transformationId}`);
    } catch (error) {
      this.logger.error(`Error recording transformation feedback: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 验证数据的语义一致性
   * @param data 要验证的数据
   * @param type 记忆类型
   * @returns 验证结果
   */
  async validateSemanticConsistency(data: any, type: MemoryType): Promise<ValidationResult> {
    this.logger.log(`Validating semantic consistency for type: ${type}`);

    try {
      const constraints = await this.getSemanticConstraints(type);

      if (!constraints || constraints.length === 0) {
        return {
          isValid: true,
          messages: [
            {
              type: 'info',
              message: `No semantic constraints defined for type: ${type}`,
            },
          ],
          score: 100,
        };
      }

      const messages: ValidationMessage[] = [];
      let totalScore = 0;
      let validConstraints = 0;

      for (const constraint of constraints) {
        try {
          let isValid = false;

          if (constraint.validationFn && typeof constraint.validationFn === 'function') {
            const fieldValue = constraint.field
              .split('.')
              .reduce((obj, key) => obj && obj[key], data);
            isValid = constraint.validationFn(fieldValue);
          } else {
            const validationResult = await this.semanticMediatorService.evaluateSemanticTransformation(
              { [constraint.field]: data[constraint.field] },
              { [constraint.field]: data[constraint.field] },
              constraint.constraint,
            );

            isValid = validationResult.semanticPreservation >= 70;
          }

          if (!isValid) {
            messages.push({
              type: constraint.severity || 'error',
              message:
                constraint.errorMessage ||
                `Field '${constraint.field}' does not satisfy constraint: ${constraint.constraint}`,
              field: constraint.field,
              rule: constraint.constraint,
            });

            totalScore += 0;
          } else {
            totalScore += 100;
          }

          validConstraints++;
        } catch (error) {
          this.logger.warn(
            `Error validating constraint for field ${constraint.field}: ${error.message}`,
          );
          messages.push({
            type: 'warning',
            message: `Could not validate constraint for field '${constraint.field}': ${error.message}`,
            field: constraint.field,
          });
        }
      }

      const finalScore = validConstraints > 0 ? Math.round(totalScore / validConstraints) : 0;
      const isValid = messages.filter(m => m.type === 'error').length === 0;

      return {
        isValid,
        messages,
        score: finalScore,
        suggestedFixes: isValid ? undefined : this.generateSuggestedFixes(data, messages),
      };
    } catch (error) {
      this.logger.error(`Error validating semantic consistency: ${error.message}`, error.stack);
      return {
        isValid: false,
        messages: [
          {
            type: 'error',
            message: `Validation error: ${error.message}`,
          },
        ],
        score: 0,
      };
    }
  }

  /**
   * 获取特定类型的语义约束
   * @param type 记忆类型
   * @returns 语义约束列表
   * @private
   */
  private async getSemanticConstraints(type: MemoryType): Promise<SemanticConstraint[]> {
    // First check our in-memory constraints
    if (this.semanticConstraints.has(type)) {
      return this.semanticConstraints.get(type) || [];
    }
    
    // Then look for constraints in the database
    const constraintMemories = await this.memoryService.searchMemories(
      `constraintType:${type} tag:semantic_constraint`,
      10
    );

    if (!constraintMemories || constraintMemories.length === 0) {
      return this.getDefaultConstraints(type);
    }

    const constraints: SemanticConstraint[] = [];

    for (const memory of constraintMemories) {
      if (memory.content && Array.isArray((memory.content as any).constraints)) {
        constraints.push(...(memory.content as any).constraints);
      }
    }

    return constraints;
  }

  /**
   * 获取默认语义约束
   * @param type 记忆类型
   * @returns 默认约束列表
   * @private
   */
  private getDefaultConstraints(type: MemoryType): SemanticConstraint[] {
    switch (type) {
      case MemoryType.REQUIREMENT:
        return [
          {
            field: 'content.text',
            constraint: 'Requirement description should be clear, specific, and testable',
            errorMessage: 'Requirement description is not clear or specific enough',
            severity: 'warning',
          },
        ];
      case MemoryType.EXPECTATION:
        return [
          {
            field: 'content.description',
            constraint: 'Expectations should include clear acceptance criteria',
            errorMessage: 'Expectation is missing clear acceptance criteria',
            severity: 'warning',
          },
        ];
      default:
        return [];
    }
  }

  /**
   * 生成建议修复
   * @param data 原始数据
   * @param messages 验证消息
   * @returns 建议修复
   * @private
   */
  private generateSuggestedFixes(data: any, messages: ValidationMessage[]): Record<string, any> {
    const fixes: Record<string, any> = {};

    for (const message of messages) {
      if (message.type === 'error' && message.field) {
        // Get the field value by traversing the data object
        const fieldPath = message.field.split('.');
        const fieldValue = fieldPath.reduce((obj: any, key) => obj && obj[key], data as any);
        
        fixes[message.field] = {
          original: fieldValue,
          suggestion: `Please correct this field to meet the constraint: ${message.rule || 'unspecified'}`,
        };
      }
    }

    return fixes;
  }
} 