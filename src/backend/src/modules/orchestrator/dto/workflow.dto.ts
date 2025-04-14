/**
 * 工作流类型枚举
 */
export enum WorkflowType {
  FULL_PROCESS = 'full_process',
  REGENERATE_CODE = 'regenerate_code',
  SEMANTIC_VALIDATION = 'semantic_validation',
  SEMANTIC_ENRICHMENT = 'semantic_enrichment',
  ITERATIVE_REFINEMENT = 'iterative_refinement',
  PARALLEL_VALIDATION = 'parallel_validation',
  ADAPTIVE_VALIDATION = 'adaptive_validation',
  CUSTOM = 'custom',
}

/**
 * 工作流执行DTO
 */
export class ExecuteWorkflowDto {
  workflowId: WorkflowType;
  params: Record<string, any>;
  hooks?: string[];
  description?: string;
}

/**
 * 工作流状态DTO
 */
export class WorkflowStatusDto {
  workflowId: string;
  executionId: string;
}

/**
 * 自定义工作流DTO
 */
export class CustomWorkflowDto {
  name: string;
  steps: WorkflowStep[];
  config?: Record<string, any>;
  description?: string;
}

/**
 * 工作流步骤接口
 */
export interface WorkflowStep {
  moduleId: string;
  operation: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
  condition?: string;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * 工作流执行结果DTO
 */
export class WorkflowResultDto {
  status: 'completed' | 'failed' | 'in_progress';
  result: Record<string, any>;
  error?: string;
  metrics?: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    stepMetrics?: Record<string, any>;
  };
}
