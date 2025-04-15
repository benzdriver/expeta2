import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export interface ExpectationNode {
  id: string;
  name: string;
  description: string;
  type: 'functional' | 'non-functional' | 'constraint';
  priority?: 'high' | 'medium' | 'low';
  children?: ExpectationNode[];
}

@Schema()
export class Expectation extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Requirement', required: true })
  requirementId: string;

  @Prop({ required: false })
  title: string;

  @Prop({ type: Object, required: true })
  model: unknown; // Using 'any' to avoid type conflicts with Document

  @Prop({ type: [String] })
  criteria?: string[];

  @Prop({ type: [String] })
  semanticTags?: string[];

  @Prop({ type: [Object] })
  subExpectations?: unknown[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: string;
}

export const _ExpectationSchema = 
