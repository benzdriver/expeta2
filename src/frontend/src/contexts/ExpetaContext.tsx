import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  clarifierApi, 
  generatorApi, 
  validatorApi, 
  orchestratorApi, 
  semanticMediatorApi 
} from '../services/api';

interface _Expectation {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  semanticTags?: string[];
  priority?: 'low' | 'medium' | 'high';
  industryExamples?: string;
  subExpectations?: Partial<_Expectation>[];
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

interface ExpetaContextType {
  requirements: Requirement[];
  currentRequirement: Requirement | null;
  expectations: Record<string, any>;
  generatedCode: GeneratedCode | null;
  validations: Validation[];
  isLoading: boolean;
  error: string | null;
  
  createRequirement: (text: string) => Promise<Requirement>;
  getRequirements: () => Promise<Requirement[]>;
  getRequirement: (id: string) => Promise<Requirement>;
  updateRequirement: (id: string, data: any) => Promise<Requirement>;
  generateClarificationQuestions: (requirementText: string) => Promise<any>;
  processClarificationAnswer: (requirementId: string, questionId: string, answer: string) => Promise<any>;
  generateExpectations: (requirementId: string) => Promise<any>;
  
  generateCode: (expectationId: string, options: any) => Promise<GeneratedCode>;
  
  validateCode: (expectationId: string, codeId: string) => Promise<Validation>;
  
  processRequirement: (requirementId: string) => Promise<any>;
  executeWorkflow: (workflowId: string, params: any) => Promise<any>;
  getWorkflowStatus: (workflowId: string) => Promise<any>;
  getModuleConnections: (workflowId: string) => Promise<any>;
  
  translateBetweenModules: (sourceModule: string, targetModule: string, data: any) => Promise<any>;
  enrichWithContext: (module: string, data: any, contextQuery: string) => Promise<any>;
  extractSemanticInsights: (data: any, query: string) => Promise<any>;
  resolveSemanticConflicts: (moduleA: string, dataA: any, moduleB: string, dataB: any) => Promise<any>;
  trackSemanticTransformation: (sourceModule: string, targetModule: string, sourceData: any, transformedData: any) => Promise<any>;
  evaluateSemanticTransformation: (sourceData: any, transformedData: any, expectedOutcome: string) => Promise<any>;
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
  const [expectations, setExpectations] = useState<Record<string, any>>({});
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiCall = async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err: any) {
      /* eslint-disable-next-line no-console */
      console.error('API call failed:', err);
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createRequirement = async (text: string): Promise<Requirement> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.createRequirement({ text });
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

  const updateRequirement = async (id: string, data: any): Promise<Requirement> => {
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

  const generateClarificationQuestions = async (requirementText: string): Promise<any> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.generateClarificationQuestions(requirementText);
      return response.data;
    });
  };

  const processClarificationAnswer = async (
    requirementId: string, 
    questionId: string, 
    answer: string
  ): Promise<any> => {
    return handleApiCall(async () => {
      const response = await clarifierApi.processClarificationAnswer(requirementId, questionId, answer);
      if (currentRequirement?.id === requirementId) {
        getRequirement(requirementId);
      }
      return response.data;
    });
  };

  const generateExpectations = async (requirementId: string): Promise<any> => {
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

  const generateCode = async (expectationId: string, options: any): Promise<GeneratedCode> => {
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

  const processRequirement = async (requirementId: string): Promise<any> => {
    return handleApiCall(async () => {
      const response = await orchestratorApi.processRequirement(requirementId);
      return response.data;
    });
  };

  const executeWorkflow = async (workflowId: string, params: any): Promise<any> => {
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
    data: any
  ): Promise<any> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.translateBetweenModules(sourceModule, targetModule, data);
      return response.data;
    });
  };

  const enrichWithContext = async (
    module: string, 
    data: any, 
    contextQuery: string
  ): Promise<any> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.enrichWithContext(module, data, contextQuery);
      return response.data;
    });
  };

  const extractSemanticInsights = async (data: any, query: string): Promise<any> => {
    return handleApiCall(async () => {
      const response = await semanticMediatorApi.extractSemanticInsights(data, query);
      return response.data;
    });
  };

  const trackSemanticTransformation = async (
    sourceModule: string, 
    targetModule: string, 
    sourceData: any, 
    transformedData: any
  ): Promise<any> => {
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
    sourceData: any, 
    transformedData: any, 
    expectedOutcome: string
  ): Promise<any> => {
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
    resolveSemanticConflicts: async (moduleA: string, dataA: any, moduleB: string, dataB: any): Promise<any> => {
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
