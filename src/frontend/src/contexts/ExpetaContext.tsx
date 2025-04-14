import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  clarifierApi, 
  generatorApi, 
  validatorApi, 
  orchestratorApi, 
  semanticMediatorApi,
  RequirementData,
  GeneratorOptions,
  WorkflowParams,
  ModuleData
} from '../services/api';
import loggingService from '../services/logging.service';

interface Expectation {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  semanticTags?: string[];
  priority?: 'low' | 'medium' | 'high';
  industryExamples?: string;
  subExpectations?: Partial<Expectation>[];
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

interface ProcessStatus {
  status: string;
  message?: string;
  nextStep?: string;
  suggestedQuestions?: Array<{ id: string; text: string }>;
}

interface ExpetaContextType {
  requirements: Requirement[];
  currentRequirement: Requirement | null;
  expectations: Record<string, Expectation[]>;
  generatedCode: GeneratedCode | null;
  validations: Validation[];
  isLoading: boolean;
  error: string | null;
  
  createRequirement: (text: string) => Promise<Requirement>;
  getRequirements: () => Promise<Requirement[]>;
  getRequirement: (id: string) => Promise<Requirement>;
  updateRequirement: (id: string, data: Partial<RequirementData>) => Promise<Requirement>;
  generateClarificationQuestions: (requirementText: string) => Promise<Array<{id: string; text: string}>>;
  processClarificationAnswer: (requirementId: string, questionId: string, answer: string) => Promise<Requirement>;
  generateExpectations: (requirementId: string) => Promise<Expectation[]>;
  
  generateCode: (expectationId: string, options: GeneratorOptions) => Promise<GeneratedCode>;
  
  validateCode: (expectationId: string, codeId: string) => Promise<Validation>;
  
  processRequirement: (requirementId: string) => Promise<ProcessStatus>;
  executeWorkflow: (workflowId: string, params: WorkflowParams) => Promise<Record<string, unknown>>;
  getWorkflowStatus: (workflowId: string) => Promise<any>;
  getModuleConnections: (workflowId: string) => Promise<any>;
  
  translateBetweenModules: (sourceModule: string, targetModule: string, data: ModuleData) => Promise<ModuleData>;
  enrichWithContext: (module: string, data: ModuleData, contextQuery: string) => Promise<ModuleData>;
  extractSemanticInsights: (data: ModuleData, query: string) => Promise<Record<string, unknown>>;
  resolveSemanticConflicts: (moduleA: string, dataA: ModuleData, moduleB: string, dataB: ModuleData) => Promise<ModuleData>;
  trackSemanticTransformation: (sourceModule: string, targetModule: string, sourceData: ModuleData, transformedData: ModuleData) => Promise<Record<string, unknown>>;
  evaluateSemanticTransformation: (sourceData: ModuleData, transformedData: ModuleData, expectedOutcome: string) => Promise<Record<string, unknown>>;
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
  const [expectations, setExpectations] = useState<Record<string, Expectation[]>>({});
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRequirements().catch(err => {
      loggingService.error('ExpetaContext', 'Failed to load initial requirements', err);
      setError('Failed to load initial data');
    });
  }, []);

  const handleApiCall = async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : { message: String(err) };
      loggingService.error('ExpetaContext', 'API call failed:', error);
      setError(error instanceof Error ? error.message : String(err) || 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createRequirement = async (text: string): Promise<Requirement> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.createRequirement({ 
        title: 'New Requirement',
        description: text 
      });
      const newRequirement = response.data;
      setRequirements(prev => [...prev, newRequirement]);
      setCurrentRequirement(newRequirement);
      return newRequirement;
    });
  };

  const getRequirements = async (): Promise<Requirement[]> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.getRequirements();
      const fetchedRequirements = response.data;
      setRequirements(fetchedRequirements);
      return fetchedRequirements;
    });
  };

  const getRequirement = async (id: string): Promise<Requirement> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.getRequirement(id);
      const requirement = response.data;
      setCurrentRequirement(requirement);
      return requirement;
    });
  };

  const updateRequirement = async (id: string, data: Partial<RequirementData>): Promise<Requirement> => {
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

  const generateClarificationQuestions = async (requirementText: string): Promise<Array<{id: string; text: string}>> => {
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

  const generateExpectations = async (requirementId: string): Promise<Expectation[]> => {
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

  const generateCode = async (expectationId: string, options: GeneratorOptions): Promise<GeneratedCode> => {
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

  const processRequirement = async (requirementId: string): Promise<ProcessStatus> => {
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
    data: ModuleData
  ): Promise<ModuleData> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.translateBetweenModules(sourceModule, targetModule, data);
      return response.data;
    });
  };

  const enrichWithContext = async (
    module: string, 
    data: ModuleData, 
    contextQuery: string
  ): Promise<ModuleData> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.enrichWithContext(module, data, contextQuery);
      return response.data;
    });
  };

  const extractSemanticInsights = async (data: ModuleData, query: string): Promise<Record<string, unknown>> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.extractSemanticInsights(data, query);
      return response.data;
    });
  };

  const trackSemanticTransformation = async (
    sourceModule: string, 
    targetModule: string, 
    sourceData: ModuleData, 
    transformedData: ModuleData
  ): Promise<Record<string, unknown>> => {
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
    sourceData: ModuleData, 
    transformedData: ModuleData, 
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

  const getWorkflowStatus = async (workflowId: string): Promise<any> => {
    return handleApiCall(async () => {
      const response = await orchestratorApi.getWorkflowStatus(workflowId);
      return response.data;
    });
  };

  const getModuleConnections = async (workflowId: string): Promise<any> => {
    return handleApiCall(async () => {
      const response = await orchestratorApi.getModuleConnections(workflowId);
      return response.data;
    });
  };

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
    resolveSemanticConflicts: async (moduleA: string, dataA: ModuleData, moduleB: string, dataB: ModuleData): Promise<ModuleData> => {
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
