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
  content: any;

  @Prop({ type: Object })
  metadata: Record<string, any>;

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
    constraints?: Record<string, any>[];
    /** 语义验证结果 */
    validationResults?: Record<string, any>[];
  };

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const MemorySchema = SchemaFactory.createForClass(Memory);

MemorySchema.index({ type: 1 });
MemorySchema.index({ tags: 1 });
MemorySchema.index({
  'metadata.title': 'text',
  'content.text': 'text',
  'content.description': 'text',
});

MemorySchema.index({ 'semanticMetadata.relevanceScore': -1 });
MemorySchema.index({ 'semanticMetadata.description': 'text' });
