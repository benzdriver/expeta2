import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const clarifierApi = {
  createRequirement: (data: any) => api.post('/clarifier/requirements', data),
  getRequirements: () => api.get('/clarifier/requirements'),
  getRequirement: (id: string) => api.get(`/clarifier/requirements/${id}`),
  updateRequirement: (id: string, data: any) => api.patch(`/clarifier/requirements/${id}`, data),
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
  generateCode: (expectationId: string, options: any) => 
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
  storeMemory: (data: any) => 
    api.post('/memory/store', data),
  getMemoryById: (id: string) => 
    api.get(`/memory/get/${id}`),
  getRelatedMemories: (query: string) => 
    api.post('/memory/search', { query }),
  updateMemory: (id: string, data: any) => 
    api.patch(`/memory/${id}`, data),
  deleteMemory: (id: string) => 
    api.delete(`/memory/${id}`),
};

export const orchestratorApi = {
  processRequirement: (requirementId: string) => 
    api.post('/orchestrator/process-requirement', { requirementId }),
  getProcessStatus: (requirementId: string) => 
    api.get(`/orchestrator/status/${requirementId}`),
  executeWorkflow: (workflowId: string, params: any) => 
    api.post('/orchestrator/execute-workflow', { workflowId, params }),
};

export const semanticMediatorApi = {
  translateBetweenModules: (sourceModule: string, targetModule: string, data: any) => 
    api.post('/semantic-mediator/translate', { sourceModule, targetModule, data }),
  enrichWithContext: (module: string, data: any, contextQuery: string) => 
    api.post('/semantic-mediator/enrich', { module, data, contextQuery }),
  resolveSemanticConflicts: (moduleA: string, dataA: any, moduleB: string, dataB: any) => 
    api.post('/semantic-mediator/resolve-conflicts', { moduleA, dataA, moduleB, dataB }),
  extractSemanticInsights: (data: any, query: string) => 
    api.post('/semantic-mediator/extract-insights', { data, query }),
  trackSemanticTransformation: (sourceModule: string, targetModule: string, sourceData: any, transformedData: any) => 
    api.post('/semantic-mediator/track-transformation', { sourceModule, targetModule, sourceData, transformedData }),
  evaluateSemanticTransformation: (sourceData: any, transformedData: any, expectedOutcome: string) => 
    api.post('/semantic-mediator/evaluate-transformation', { sourceData, transformedData, expectedOutcome }),
};

export default api;
