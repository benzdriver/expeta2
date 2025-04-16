import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export interface Clarification {
  questionId: string;
  answer: string;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RequirementStatus = 'initial' | 'clarifying' | 'expectations_generated' | 'completed';

export interface DialogueMessage {
  sender: 'user' | 'system' | 'clarifier';
  content: string;
  type?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Schema({ timestamps: true })
export class Requirement {
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

  @Prop({ enum: ['initial', 'clarifying', 'expectations_generated', 'completed'], default: 'initial' })
  status: RequirementStatus;

  @Prop({ type: [Object], default: [] })
  clarifications: Clarification[];

  @Prop({
    type: [
      {
        sender: String,
        content: String,
        type: String,
        metadata: Object,
        timestamp: Date,
      },
    ],
  })
  dialogueLog?: DialogueMessage[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: string;
}

export type RequirementDocument = Requirement & Document;
export const RequirementSchema = SchemaFactory.createForClass(Requirement); 
