import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export interface ValidationDetail {
  expectationId: string;
  status: 'passed' | 'failed' | 'partial';
  score: number;
  message: string;
  semanticInsights?: string;
  improvement?: string;
  remainingIssues?: string;
}

@Schema()
export class Validation extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Expectation', required: true })
  expectationId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Code', required: true })
  codeId: string;

  @Prop({ type: String, enum: ['passed', 'failed', 'partial'], required: true })
  status: 'passed' | 'failed' | 'partial';

  @Prop({ required: true, min: 0, max: 100 })
  score: number;

  @Prop({
    type: [
      {
        expectationId: String,
        status: String,
        score: Number,
        message: String,
        semanticInsights: String,
        improvement: String,
        remainingIssues: String,
      },
    ],
    required: true,
  })
  details: ValidationDetail[];

  @Prop({ type: Object })
  metadata: Record<string, unknown>;

  @Prop({ required: true })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const _ValidationSchema = 
