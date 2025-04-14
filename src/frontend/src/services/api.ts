import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface RequirementData {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface GeneratorOptions {
  language: string;
  framework?: string;
  architecture?: string;
  template?: string;
  includeTests?: boolean;
  additionalContext?: Record<string, unknown>;
}

export interface MemoryData {
  content: string;
  type: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  source?: string;
  relatedIds?: string[];
}

export interface WorkflowParams {
  requirementId?: string;
  expectationId?: string;
  codeId?: string;
  validationId?: string;
  options?: Record<string, unknown>;
}

export interface ModuleData {
  [key: string]: unknown;
}

export const clarifierApi = {
  createRequirement: (data: RequirementData) => api.post('/clarifier/requirements', data),
  getRequirements: () => api.get('/clarifier/requirements'),
  getRequirement: (id: string) => api.get(`/clarifier/requirements/${id}`),
  updateRequirement: (id: string, data: Partial<RequirementData>) => api.patch(`/clarifier/requirements/${id}`, data),
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

export const generatorApi = {
  generateCode: (expectationId: string, options: GeneratorOptions) => 
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

export const memoryApi = {
  storeMemory: (data: MemoryData) => 
    api.post('/memory/store', data),
  getMemoryById: (id: string) => 
    api.get(`/memory/get/${id}`),
  getRelatedMemories: (query: string) => 
    api.post('/memory/search', { query }),
  updateMemory: (id: string, data: Partial<MemoryData>) => 
    api.patch(`/memory/${id}`, data),
  deleteMemory: (id: string) => 
    api.delete(`/memory/${id}`),
};

export const orchestratorApi = {
  processRequirement: (requirementId: string) => 
    api.post('/orchestrator/process-requirement', { requirementId }),
  getProcessStatus: (requirementId: string) => 
    api.get(`/orchestrator/status/${requirementId}`),
  executeWorkflow: (workflowId: string, params: WorkflowParams) => 
    api.post('/orchestrator/execute-workflow', { workflowId, params }),
};

export const semanticMediatorApi = {
  translateBetweenModules: (sourceModule: string, targetModule: string, data: ModuleData) => 
    api.post('/semantic-mediator/translate', { sourceModule, targetModule, data }),
  enrichWithContext: (module: string, data: ModuleData, contextQuery: string) => 
    api.post('/semantic-mediator/enrich', { module, data, contextQuery }),
  resolveSemanticConflicts: (moduleA: string, dataA: ModuleData, moduleB: string, dataB: ModuleData) => 
    api.post('/semantic-mediator/resolve-conflicts', { moduleA, dataA, moduleB, dataB }),
  extractSemanticInsights: (data: ModuleData, query: string) => 
    api.post('/semantic-mediator/extract-insights', { data, query }),
  trackSemanticTransformation: (sourceModule: string, targetModule: string, sourceData: ModuleData, transformedData: ModuleData) => 
    api.post('/semantic-mediator/track-transformation', { sourceModule, targetModule, sourceData, transformedData }),
  evaluateSemanticTransformation: (sourceData: ModuleData, transformedData: ModuleData, expectedOutcome: string) => 
    api.post('/semantic-mediator/evaluate-transformation', { sourceData, transformedData, expectedOutcome }),
};

export default api;
