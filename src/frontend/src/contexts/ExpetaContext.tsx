import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  clarifierApi, 
  generatorApi, 
  validatorApi, 
  orchestratorApi, 
  semanticMediatorApi 
} from '../services/api';

interface Expectation {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  semanticTags?: string[];
  priority?: 'low' | 'medium' | 'high';
  industryExamples?: string;
  subExpectations?: Partial<Expectation>[];
  requirementId?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Requirement {
  id: string;
  text: string;
  status: string;
  clarifications?: {
    questionId: string;
    answer: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

interface GeneratedCode {
  id: string;
  expectationId: string;
  language: string;
  frameworks: string[];
  architecture: string[];
  template?: string;
  code: string;
  createdAt: Date;
  semanticTags?: string[];
  semanticContext?: {
    industry?: string;
    domain?: string;
    complexity?: string;
    priority?: string;
  };
  generationMetrics?: {
    semanticScore: number;
    qualityScore: number;
    performanceScore: number;
    securityScore: number;
  };
}

interface Validation {
  id: string;
  expectationId: string;
  codeId: string;
  status: 'passed' | 'failed' | 'partial';
  score: number;
  details: {
    expectationId: string;
    status: string;
    score: number;
    message: string;
  }[];
  createdAt: Date;
  updatedAt?: Date;
}

interface ClarificationQuestion {
  id: string;
  text: string;
  priority?: number;
  type?: string;
}

interface RequirementUpdateData {
  text?: string;
  status?: string;
  clarifications?: {
    questionId: string;
    answer: string;
    timestamp: Date;
  }[];
}

interface CodeGenerationOptions {
  language?: string;
  frameworks?: string[];
  architecture?: string;
  template?: string;
  semanticAnalysis?: boolean;
  optimizationLevel?: string;
  [key: string]: unknown;
}

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

interface WorkflowStatus {
  id: string;
  status: string;
  progress: number;
  currentStep?: string;
  nextStep?: string;
  results?: Record<string, unknown>;
  errors?: string[];
  [key: string]: unknown;
}

interface ModuleConnection {
  sourceModule: string;
  targetModule: string;
  connectionType: string;
  dataFlow: string[];
  active: boolean;
  [key: string]: unknown;
}

interface SemanticData {
  [key: string]: unknown;
}

interface SemanticTransformationResult {
  success: boolean;
  transformationId?: string;
  differences?: Record<string, unknown>[];
  metrics?: Record<string, number>;
  [key: string]: unknown;
}

interface SemanticInsight {
  key: string;
  value: unknown;
  confidence: number;
  source: string;
  [key: string]: unknown;
}

interface SemanticConflictResolution {
  resolved: boolean;
  conflicts: Record<string, unknown>[];
  resolutions: Record<string, unknown>[];
  mergedData?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ExpetaContextType {
  requirements: Requirement[];
  currentRequirement: Requirement | null;
  expectations: Record<string, Expectation>;
  generatedCode: GeneratedCode | null;
  validations: Validation[];
  isLoading: boolean;
  error: string | null;
  
  createRequirement: (text: string) => Promise<Requirement>;
  getRequirements: () => Promise<Requirement[]>;
  getRequirement: (id: string) => Promise<Requirement>;
  updateRequirement: (id: string, data: RequirementUpdateData) => Promise<Requirement>;
  generateClarificationQuestions: (requirementText: string) => Promise<ClarificationQuestion[]>;
  processClarificationAnswer: (requirementId: string, questionId: string, answer: string) => Promise<Requirement>;
  generateExpectations: (requirementId: string) => Promise<Expectation>;
  
  generateCode: (expectationId: string, options: CodeGenerationOptions) => Promise<GeneratedCode>;
  
  validateCode: (expectationId: string, codeId: string) => Promise<Validation>;
  
  processRequirement: (requirementId: string) => Promise<Record<string, unknown>>;
  executeWorkflow: (workflowId: string, params: WorkflowParams) => Promise<Record<string, unknown>>;
  getWorkflowStatus: (workflowId: string) => Promise<WorkflowStatus>;
  getModuleConnections: (workflowId: string) => Promise<ModuleConnection[]>;
  
  translateBetweenModules: (sourceModule: string, targetModule: string, data: SemanticData) => Promise<SemanticData>;
  enrichWithContext: (module: string, data: SemanticData, contextQuery: string) => Promise<SemanticData>;
  extractSemanticInsights: (data: SemanticData, query: string) => Promise<SemanticInsight[]>;
  resolveSemanticConflicts: (moduleA: string, dataA: SemanticData, moduleB: string, dataB: SemanticData) => Promise<SemanticConflictResolution>;
  trackSemanticTransformation: (sourceModule: string, targetModule: string, sourceData: SemanticData, transformedData: SemanticData) => Promise<SemanticTransformationResult>;
  evaluateSemanticTransformation: (sourceData: SemanticData, transformedData: SemanticData, expectedOutcome: string) => Promise<Record<string, unknown>>;
}

const ExpetaContext = createContext<ExpetaContextType | undefined>(undefined);

export const useExpeta = () => {
  const context = useContext(ExpetaContext);
  if (context === undefined) {
    throw new Error('useExpeta must be used within an ExpetaProvider');
  }
  return context;
};

interface ExpetaProviderProps {
  children: ReactNode;
}

export const ExpetaProvider: React.FC<ExpetaProviderProps> = ({ children }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [currentRequirement, setCurrentRequirement] = useState<Requirement | null>(null);
  const [expectations, setExpectations] = useState<Record<string, Expectation>>({});
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiCall = React.useCallback(async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err: Error | unknown) {
      /* eslint-disable-next-line no-console */
      console.error('API call failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError]);

  const createRequirement = async (text: string): Promise<Requirement> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.createRequirement({ text });
      const newRequirement = response.data;
      setRequirements(prev => [...prev, newRequirement]);
      setCurrentRequirement(newRequirement);
      return newRequirement;
    });
  };

  const getRequirements = React.useCallback(async (): Promise<Requirement[]> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.getRequirements();
      const fetchedRequirements = response.data;
      setRequirements(fetchedRequirements);
      return fetchedRequirements;
    });
  }, [handleApiCall, setRequirements]);

  const getRequirement = async (id: string): Promise<Requirement> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.getRequirement(id);
      const requirement = response.data;
      setCurrentRequirement(requirement);
      return requirement;
    });
  };

  const updateRequirement = async (id: string, data: RequirementUpdateData): Promise<Requirement> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.updateRequirement(id, data);
      const updatedRequirement = response.data;
      setRequirements(prev => 
        prev.map(req => req.id === id ? updatedRequirement : req)
      );
      if (currentRequirement?.id === id) {
        setCurrentRequirement(updatedRequirement);
      }
      return updatedRequirement;
    });
  };

  const generateClarificationQuestions = async (requirementText: string): Promise<ClarificationQuestion[]> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.generateClarificationQuestions(requirementText);
      return response.data;
    });
  };

  const processClarificationAnswer = async (
    requirementId: string, 
    questionId: string, 
    answer: string
  ): Promise<Requirement> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.processClarificationAnswer(requirementId, questionId, answer);
      if (currentRequirement?.id === requirementId) {
        getRequirement(requirementId);
      }
      return response.data;
    });
  };

  const generateExpectations = async (requirementId: string): Promise<Expectation> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.generateExpectations(requirementId);
      const generatedExpectations = response.data;
      setExpectations(prev => ({
        ...prev,
        [requirementId]: generatedExpectations
      }));
      return generatedExpectations;
    });
  };

  const generateCode = async (expectationId: string, options: CodeGenerationOptions): Promise<GeneratedCode> => {
    return handleApiCall(async () => {
      const response = await generatorApi.generateCode(expectationId, options);
      const code = response.data;
      setGeneratedCode(code);
      return code;
    });
  };

  const validateCode = async (expectationId: string, codeId: string): Promise<Validation> => {
    return handleApiCall(async () => {
      const response = await validatorApi.validateCode(expectationId, codeId);
      const validation = response.data;
      setValidations(prev => [...prev, validation]);
      return validation;
    });
  };

  const processRequirement = async (requirementId: string): Promise<Record<string, unknown>> => {
    return handleApiCall(async () => {
      const response = await orchestratorApi.processRequirement(requirementId);
      return response.data;
    });
  };

  const executeWorkflow = async (workflowId: string, params: WorkflowParams): Promise<Record<string, unknown>> => {
    return handleApiCall(async () => {
      const response = await orchestratorApi.executeWorkflow(workflowId, params);
      
      if (response.data.requirement) {
        setCurrentRequirement(response.data.requirement);
        setRequirements(prev => 
          prev.map(req => req.id === response.data.requirement.id ? response.data.requirement : req)
        );
      }
      
      if (response.data.expectations) {
        setExpectations(prev => ({
          ...prev,
          [response.data.expectations.requirementId]: response.data.expectations
        }));
      }
      
      if (response.data.code) {
        setGeneratedCode(response.data.code);
      }
      
      if (response.data.validation) {
        setValidations(prev => [...prev, response.data.validation]);
      }
      
      return response.data;
    });
  };

  const translateBetweenModules = async (
    sourceModule: string, 
    targetModule: string, 
    data: SemanticData
  ): Promise<SemanticData> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.translateBetweenModules(sourceModule, targetModule, data);
      return response.data;
    });
  };

  const enrichWithContext = async (
    module: string, 
    data: SemanticData, 
    contextQuery: string
  ): Promise<SemanticData> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.enrichWithContext(module, data, contextQuery);
      return response.data;
    });
  };

  const extractSemanticInsights = async (data: SemanticData, query: string): Promise<SemanticInsight[]> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.extractSemanticInsights(data, query);
      return response.data;
    });
  };

  const trackSemanticTransformation = async (
    sourceModule: string, 
    targetModule: string, 
    sourceData: SemanticData, 
    transformedData: SemanticData
  ): Promise<SemanticTransformationResult> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.trackSemanticTransformation(
        sourceModule, 
        targetModule, 
        sourceData, 
        transformedData
      );
      return response.data;
    });
  };

  const evaluateSemanticTransformation = async (
    sourceData: SemanticData, 
    transformedData: SemanticData, 
    expectedOutcome: string
  ): Promise<Record<string, unknown>> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.evaluateSemanticTransformation(
        sourceData, 
        transformedData, 
        expectedOutcome
      );
      return response.data;
    });
  };

  const getWorkflowStatus = async (workflowId: string): Promise<WorkflowStatus> => {
    return handleApiCall(async () => {
      const response = await orchestratorApi.getWorkflowStatus(workflowId);
      return response.data;
    });
  };

  const getModuleConnections = async (workflowId: string): Promise<ModuleConnection[]> => {
    return handleApiCall(async () => {
      const response = await orchestratorApi.getModuleConnections(workflowId);
      return response.data;
    });
  };
  
  useEffect(() => {
    getRequirements().catch(err => {
      /* eslint-disable-next-line no-console */
      console.error('Failed to load initial requirements', err);
      setError('Failed to load initial data');
    });
  }, [getRequirements]);

  const value = {
    requirements,
    currentRequirement,
    expectations,
    generatedCode,
    validations,
    isLoading,
    error,
    
    createRequirement,
    getRequirements,
    getRequirement,
    updateRequirement,
    generateClarificationQuestions,
    processClarificationAnswer,
    generateExpectations,
    
    generateCode,
    
    validateCode,
    
    processRequirement,
    executeWorkflow,
    getWorkflowStatus,
    getModuleConnections,
    
    translateBetweenModules,
    enrichWithContext,
    extractSemanticInsights,
    resolveSemanticConflicts: async (moduleA: string, dataA: SemanticData, moduleB: string, dataB: SemanticData): Promise<SemanticConflictResolution> => {
      return handleApiCall(async () => {
        const response = await semanticMediatorApi.resolveSemanticConflicts(moduleA, dataA, moduleB, dataB);
        return response.data;
      });
    },
    trackSemanticTransformation,
    evaluateSemanticTransformation,
  };

  return (
    <ExpetaContext.Provider value={value}>
      {children}
    </ExpetaContext.Provider>
  );
};
