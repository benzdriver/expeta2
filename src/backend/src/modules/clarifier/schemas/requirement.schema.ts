import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export interface Clarification {
  questionId: string;
  answer: string;
  timestamp: Date;
}

export type RequirementStatus = 'initial' | 'clarifying' | 'expectations_generated' | 'completed';

@Schema()
export class Requirement extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  text: string;

  @Prop()
  description?: string;

  @Prop()
  domain?: string;

  @Prop()
  priority?: string;

  @Prop({ type: String, enum: ['initial', 'clarifying', 'expectations_generated', 'completed'], default: 'initial' })
  status: RequirementStatus;

  @Prop({ type: [{ questionId: String, answer: String, timestamp: Date }] })
  clarifications?: Clarification[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: string;
}

export const RequirementSchema = SchemaFactory.createForClass(Requirement);
