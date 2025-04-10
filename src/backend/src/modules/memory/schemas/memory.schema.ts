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
}

@Schema()
export class Memory extends Document {
  @Prop({ 
    type: String, 
    enum: Object.values(MemoryType),
    required: true 
  })
  type: MemoryType;

  @Prop({ type: Object, required: true })
  content: any;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const MemorySchema = SchemaFactory.createForClass(Memory);

MemorySchema.index({ type: 1 });
MemorySchema.index({ tags: 1 });
MemorySchema.index({ 'metadata.title': 'text', 'content.text': 'text', 'content.description': 'text' });
