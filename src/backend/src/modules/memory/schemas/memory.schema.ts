import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum MemoryType {
  REQUIREMENT = 'requirement',
  EXPECTATION = 'expectation',
  CODE = 'code',
  VALIDATION = 'validation',
  VALIDATION_FEEDBACK = 'validation_feedback',
  SYSTEM = 'system',
  SEMANTIC_TRANSFORMATION = 'semantic_transformation',
  SEMANTIC_FEEDBACK = 'semantic_feedback',
  SEMANTIC_CACHE = 'semantic_cache',
  HUMAN_REVIEW_REQUEST = 'human_review_request',
  HUMAN_REVIEW_FEEDBACK = 'human_review_feedback',
}

@Schema()
export class Memory extends Document {
  @Prop({
    type: String,
    enum: Object.values(MemoryType),
    required: true,
  })
  type: MemoryType;

  @Prop({ type: Object, required: true })
  content: unknown;

  @Prop({ type: Object })
  metadata: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: {} })
  semanticMetadata: {
    /** 语义向量表示 */
    vector?: number[];
    /** 语义描述 */
    description?: string;
    /** 语义相关性分数 */
    relevanceScore?: number;
    /** 语义约束 */
    constraints?: Record<string, unknown>[];
    /** 语义验证结果 */
    validationResults?: Record<string, unknown>[];
  };

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const MemorySchema = SchemaFactory.createForClass(Memory);
export const _MemorySchema = MemorySchema.index({ type: 1 });
MemorySchema.index({ tags: 1 });
MemorySchema.index({
  'metadata.title': 'text',
  'content.text': 'text',
  'content.description': 'text',
});

MemorySchema.index({ 'semanticMetadata.relevanceScore': -1 });
MemorySchema.index({ 'semanticMetadata.description': 'text' });
