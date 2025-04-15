import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RequirementData {
  text: string;
  status?: string;
  clarifications?: Array<{
    questionId: string;
    answer: string;
    timestamp?: Date;
  }>;
}

interface RequirementUpdateData {
  text?: string;
  status?: string;
  clarifications?: Array<{
    questionId: string;
    answer: string;
    timestamp?: Date;
  }>;
}

export const clarifierApi = {
  createRequirement: (data: RequirementData) => api.post('/clarifier/requirements', data),
  getRequirements: () => api.get('/clarifier/requirements'),
  getRequirement: (id: string) => api.get(`/clarifier/requirements/${id}`),
  updateRequirement: (id: string, data: RequirementUpdateData) => api.patch(`/clarifier/requirements/${id}`, data),
  deleteRequirement: (id: string) => api.delete(`/clarifier/requirements/${id}`),
  generateClarificationQuestions: (requirementText: string) => 
    api.post('/clarifier/generate-questions', { text: requirementText }),
  processClarificationAnswer: (requirementId: string, questionId: string, answer: string) => 
    api.post('/clarifier/process-answer', { requirementId, questionId, answer }),
  generateExpectations: (requirementId: string) => 
    api.post('/clarifier/generate-expectations', { requirementId }),
  getExpectations: (requirementId: string) => 
    api.get(`/clarifier/expectations/${requirementId}`),
  analyzeClarificationProgress: (requirementId: string) => 
    api.get(`/clarifier/analyze-progress/${requirementId}`),
};

interface CodeGenerationOptions {
  language?: string;
  frameworks?: string[];
  architecture?: string;
  template?: string;
  semanticAnalysis?: boolean;
  optimizationLevel?: string;
  [key: string]: unknown;
}

export const generatorApi = {
  generateCode: (expectationId: string, options: CodeGenerationOptions) => 
    api.post('/generator/generate', { expectationId, options }),
  getCodeByExpectationId: (expectationId: string) => 
    api.get(`/generator/code/expectation/${expectationId}`),
  getCodeById: (id: string) => 
    api.get(`/generator/code/${id}`),
};

export const validatorApi = {
  validateCode: (expectationId: string, codeId: string) => 
    api.post('/validator/validate', { expectationId, codeId }),
  getValidationsByExpectationId: (expectationId: string) => 
    api.get(`/validator/validations/${expectationId}`),
  getValidationsByCodeId: (codeId: string) => 
    api.get(`/validator/validations/code/${codeId}`),
  getValidationById: (id: string) => 
    api.get(`/validator/validation/${id}`),
};

interface MemoryData {
  id?: string;
  type: string;
  content: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

interface MemoryUpdateData {
  content?: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export const memoryApi = {
  storeMemory: (data: MemoryData) => 
    api.post('/memory/store', data),
  getMemoryById: (id: string) => 
    api.get(`/memory/get/${id}`),
  getRelatedMemories: (query: string) => 
    api.post('/memory/search', { query }),
  updateMemory: (id: string, data: MemoryUpdateData) => 
    api.patch(`/memory/${id}`, data),
  deleteMemory: (id: string) => 
    api.delete(`/memory/${id}`),
};

interface WorkflowParams {
  requirementId?: string;
  expectationId?: string;
  codeId?: string;
  includeSemanticAnalysis?: boolean;
  optimizationLevel?: string;
  analysisDepth?: string;
  trackTransformations?: boolean;
  validationStrategy?: string;
  [key: string]: unknown;
}

export const orchestratorApi = {
  processRequirement: (requirementId: string) => 
    api.post('/orchestrator/process-requirement', { requirementId }),
  getProcessStatus: (requirementId: string) => 
    api.get(`/orchestrator/status/${requirementId}`),
  executeWorkflow: (workflowId: string, params: WorkflowParams) => 
    api.post('/orchestrator/execute-workflow', { workflowId, params }),
  getWorkflowStatus: (executionId: string) =>
    api.get(`/orchestrator/workflow-status/${executionId}`),
  getModuleConnections: (workflowId: string) =>
    api.get(`/orchestrator/module-connections/${workflowId}`),
  cancelWorkflow: (executionId: string) =>
    api.post('/orchestrator/cancel-workflow', { executionId }),
};

interface SemanticData {
  [key: string]: unknown;
}

export const semanticMediatorApi = {
  translateBetweenModules: (sourceModule: string, targetModule: string, data: SemanticData) => 
    api.post('/semantic-mediator/translate', { sourceModule, targetModule, data }),
  enrichWithContext: (module: string, data: SemanticData, contextQuery: string) => 
    api.post('/semantic-mediator/enrich', { module, data, contextQuery }),
  resolveSemanticConflicts: (moduleA: string, dataA: SemanticData, moduleB: string, dataB: SemanticData) => 
    api.post('/semantic-mediator/resolve-conflicts', { moduleA, dataA, moduleB, dataB }),
  extractSemanticInsights: (data: SemanticData, query: string) => 
    api.post('/semantic-mediator/extract-insights', { data, query }),
  trackSemanticTransformation: (sourceModule: string, targetModule: string, sourceData: SemanticData, transformedData: SemanticData) => 
    api.post('/semantic-mediator/track-transformation', { sourceModule, targetModule, sourceData, transformedData }),
  evaluateSemanticTransformation: (sourceData: SemanticData, transformedData: SemanticData, expectedOutcome: string) => 
    api.post('/semantic-mediator/evaluate-transformation', { sourceData, transformedData, expectedOutcome }),
};

export default api;
