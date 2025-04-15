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
 * 工作流执行状态
 */
export type WorkflowExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * 工作流步骤执行状态
 */
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * 工作流执行步骤
 */
export interface WorkflowExecutionStep {
  name: string;
  status: WorkflowStepStatus;
  startTime?: Date;
  endTime?: Date;
  result?: unknown;
  error?: string;
}

/**
 * 自定义工作流接口
 */
export interface CustomWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  config?: Record<string, any>;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工作流执行接口
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  params: Record<string, any>;
  status: WorkflowExecutionStatus;
  startTime: Date;
  endTime?: Date;
  result?: unknown;
  error?: string;
  steps: WorkflowExecutionStep[];
}
