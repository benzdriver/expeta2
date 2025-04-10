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

  @Prop({ type: Object, required: true })
  model: ExpectationNode;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: string;
}

export const ExpectationSchema = SchemaFactory.createForClass(Expectation);
