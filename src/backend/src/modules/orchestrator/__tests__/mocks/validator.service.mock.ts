import { Injectable } from '@nestjs/common';
import { LlmService } from '../../../../services/llm.service';

@Injectable()
export class ValidatorServiceMock {
  llmService: LlmService;

  constructor() {
    this.llmService = {
      generateContent: async (prompt: string) => {
        return JSON.stringify({
          content: 'Mock validation result',
          model: 'mock-model',
        });
      },
      analyzeContent: async (content: string, query: string) => {
        return {
          analysis: 'Mock analysis result',
          relevance: 0.85,
          insights: ['Mock insight 1', 'Mock insight 2'],
        };
      }
    } as any;
  }

  validateCode = async () => {
    return {
      _id: 'val-123',
      expectationId: 'exp-123',
      codeId: 'code-456',
      score: 0.85,
      status: 'passed',
      details: []
    };
  };

  validateCodeWithSemanticInput = async () => {
    return {
      _id: 'val-new-123',
      expectationId: 'exp-123',
      codeId: 'code-456',
      score: 0.9,
      status: 'passed',
      details: []
    };
  };

  validateWithAdaptiveContext = async () => {
    return {
      _id: 'val-new-456',
      expectationId: 'exp-123',
      codeId: 'code-456',
      score: 0.92,
      status: 'passed',
      details: []
    };
  };

  getValidationById = async () => {
    return {
      _id: 'val-789',
      expectationId: 'exp-123',
      codeId: 'code-456',
      score: 0.85,
      status: 'passed',
      details: []
    };
  };

  getValidationsByCodeId = async () => {
    return [{
      _id: 'val-789',
      expectationId: 'exp-123',
      codeId: 'code-456',
      score: 0.85,
      status: 'passed',
      details: []
    }];
  };

  generateValidationFeedback = async () => {
    return {
      validationId: 'val-789',
      feedback: 'Good implementation with some security improvements needed',
      suggestions: [
        'Add input validation to authentication forms',
        'Implement proper error handling in dashboard components'
      ]
    };
  };
}
