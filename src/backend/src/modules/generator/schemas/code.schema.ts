import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export interface CodeFile {
  path: string;
  content: string;
  language: string;
}

export interface CodeMetadata {
  expectationId: string;
  version: number;
  status:
    | 'draft'
    | 'generated'
    | 'validated'
    | 'approved'
    | 'structure_generated'
    | 'architecture_generated'
    | 'tests_added'
    | 'refactored'
    | 'optimized';
  semanticAnalysisUsed?: boolean;
  semanticAnalysisSummary?: string;
  techStack?: unknown;
  architecturePattern?: string;
  originalCodeId?: string;
  generationOptions?: unknown;
  refactoringGoals?: unknown;
  testRequirements?: unknown;
  optimizationFeedback?: unknown;
}

@Schema()
export class Code extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Expectation', required: true })
  expectationId: string;

  @Prop({ type: [{ path: String, content: String, language: String }], required: true })
  files: CodeFile[];

  @Prop({ type: Object, required: true })
  metadata: CodeMetadata;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CodeSchema = SchemaFactory.createForClass(Code);

// Add indexes for better query performance
CodeSchema.index({ expectationId: 1 }); 
CodeSchema.index({ 'metadata.status': 1 });
CodeSchema.index({ createdAt: -1 });
