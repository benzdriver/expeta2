/**
 * Interfaces for LLM response types used in the application
 */

/**
 * Requirement structure for input to LLM services
 */
export interface Requirement {
  id: string;
  text: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Clarification structure for input to LLM services
 */
export interface Clarification {
  questionId: string;
  answer: string;
  [key: string]: unknown;
}

/**
 * Requirement analysis response structure
 */
export interface RequirementAnalysis {
  title: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  domain: string;
  keyFeatures: string[];
  stakeholders: string[];
  constraints: string[];
  risks: string[];
  [key: string]: unknown;
}

/**
 * Clarification questions response structure
 */
export interface ClarificationQuestions {
  questions: {
    id: string;
    text: string;
    importance: 'low' | 'medium' | 'high';
    context?: string;
  }[];
  summary?: string;
  [key: string]: unknown;
}

/**
 * Clarification progress analysis response structure
 */
export interface ClarificationProgress {
  progress: number;
  completedAreas: string[];
  incompleteAreas: string[];
  recommendations: string[];
  readyForExpectations: boolean;
  [key: string]: unknown;
}

/**
 * Expectation model response structure
 */
export interface ExpectationModel {
  id: string;
  title: string;
  description: string;
  functionalRequirements: {
    id: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  nonFunctionalRequirements: {
    id: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  constraints: string[];
  assumptions: string[];
  [key: string]: unknown;
}

/**
 * Code generation response structure
 */
export interface CodeGenerationResult {
  code: string;
  language: string;
  framework: string;
  components: string[];
  explanation: string;
  [key: string]: unknown;
}

/**
 * Code validation response structure
 */
export interface ValidationResult {
  status: 'passed' | 'failed' | 'warning';
  score: number;
  details: {
    category: string;
    issues: string[];
    recommendations: string[];
  }[];
  summary: string;
  [key: string]: unknown;
}

/**
 * Test cases response structure
 */
export interface TestCasesResult {
  testCases: {
    id: string;
    description: string;
    steps: string[];
    expectedResult: string;
    category: string;
  }[];
  coverage: {
    functional: number;
    edge: number;
    error: number;
  };
  [key: string]: unknown;
}

/**
 * Semantic insights response structure
 */
export interface SemanticInsights {
  insights: {
    category: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }[];
  summary: string;
  recommendations: string[];
  [key: string]: unknown;
}
