import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export interface ExpectationNode {
  id: string;
  name: string;
  description: string;
  children: ExpectationNode[];
}

@Schema({ timestamps: true })
export class Expectation {
  @Prop({ required: true })
  requirementId: string;
  
  @Prop()
  title?: string;

  @Prop({ type: Object, required: true })
  model: ExpectationNode;
  
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
  
  @Prop()
  createdAt: Date;
  
  @Prop()
  updatedAt: Date;
}

export type ExpectationDocument = Expectation & Document;
export const ExpectationSchema = SchemaFactory.createForClass(Expectation); 
