import React, { useState, useEffect, useCallback } from 'react';
import { useExpeta } from '../../contexts/ExpetaContext';
import './OrchestratorPanel.css';

interface Requirement {
  id: string;
  text: string;
  status?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
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

interface Question {
  text: string;
  type?: string;
  priority?: number;
}

interface ProcessStatus {
  status: string;
  message?: string;
  nextStep?: string;
  suggestedQuestions?: Question[];
  [key: string]: unknown;
}

interface OrchestratorPanelProps {
  requirementId?: string;
  onWorkflowExecuted?: (workflowId: string) => void;
}

const OrchestratorPanel: React.FC<OrchestratorPanelProps> = ({ requirementId, onWorkflowExecuted }) => {
  const { 
    processRequirement, 
    executeWorkflow,
    getRequirements,
    requirements,
    isLoading, 
    error 
  } = useExpeta();
  
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('full_process');
  const [workflowParams, setWorkflowParams] = useState<WorkflowParams>({});
  const [availableRequirements, setAvailableRequirements] = useState<Requirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>(requirementId || '');
  const [showRequirementSelector, setShowRequirementSelector] = useState<boolean>(false);
  
  
  useEffect(() => {
    if (selectedRequirementId) {
      setWorkflowParams((prev: Record<string, unknown>) => ({ ...prev, requirementId: selectedRequirementId }));
    }
  }, [selectedRequirementId]);
  
  const fetchRequirements = useCallback(async () => {
    try {
      const reqs = await getRequirements();
      setAvailableRequirements(reqs || requirements || []);
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Failed to fetch requirements', err);
    }
  }, [getRequirements, requirements]);
  
  const handleProcessRequirement = useCallback(async () => {
    if (!selectedRequirementId) return;
    
    try {
      const status = await processRequirement(selectedRequirementId);
      setProcessStatus(status);
      
      setWorkflowParams((prev: Record<string, unknown>) => ({ ...prev, requirementId: selectedRequirementId }));
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Failed to process requirement', err);
    }
  }, [selectedRequirementId, processRequirement]);
  
  const handleExecuteWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    try {
      const result = await executeWorkflow(selectedWorkflow, workflowParams);
      setProcessStatus(result);
      
      if (result.executionId && onWorkflowExecuted) {
        onWorkflowExecuted(result.executionId);
      }
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Failed to execute workflow', err);
    }
  };
  
  useEffect(() => {
    if (requirementId) {
      setSelectedRequirementId(requirementId);
      handleProcessRequirement();
    }
    
    fetchRequirements();
  }, [requirementId, fetchRequirements, handleProcessRequirement]);

  const renderWorkflowOptions = () => {
    const workflows = [
      { id: 'full_process', label: '完整流程', description: '从需求到代码生成和验证的完整流程' },
      { id: 'regenerate_code', label: '重新生成代码', description: '基于现有期望模型重新生成代码' },
      { id: 'semantic_analysis', label: '语义分析', description: '分析模块间的语义转换和关系' },
      { id: 'validation_only', label: '仅验证', description: '对现有代码进行语义验证' },
    ];
    
    return (
      <div className="workflow-options">
        <h3>选择工作流</h3>
        <div className="options-list">
          {workflows.map(workflow => (
            <div 
              key={workflow.id}
              className={`option-item ${selectedWorkflow === workflow.id ? 'selected' : ''}`}
              onClick={() => setSelectedWorkflow(workflow.id)}
            >
              <div className="option-header">
                <h4>{workflow.label}</h4>
                <span className={`status-indicator ${selectedWorkflow === workflow.id ? 'active' : ''}`}></span>
              </div>
              <p>{workflow.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderRequirementSelector = () => {
    if (!showRequirementSelector && selectedRequirementId) {
      const selectedReq = availableRequirements.find(r => r.id === selectedRequirementId);
      
      return (
        <div className="selected-requirement">
          <div className="requirement-header">
            <h4>当前需求</h4>
            <button 
              className="change-button"
              onClick={() => setShowRequirementSelector(true)}
            >
              更改
            </button>
          </div>
          <div className="requirement-content">
            <p>{selectedReq ? selectedReq.text : selectedRequirementId}</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="requirement-selector">
        <h4>选择需求</h4>
        {availableRequirements.length > 0 ? (
          <div className="requirements-list">
            {availableRequirements.map(req => (
              <div 
                key={req.id}
                className={`requirement-item ${selectedRequirementId === req.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedRequirementId(req.id);
                  setShowRequirementSelector(false);
                  setWorkflowParams((prev: Record<string, unknown>) => ({ ...prev, requirementId: req.id }));
                }}
              >
                <div className="requirement-item-header">
                  <span className="requirement-id">{req.id.substring(0, 8)}...</span>
                  <span className={`requirement-status ${req.status}`}>{req.status}</span>
                </div>
                <p className="requirement-text">{req.text.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-requirements">
            <p>没有可用的需求</p>
            <button 
              className="refresh-button"
              onClick={fetchRequirements}
              disabled={isLoading}
            >
              刷新
            </button>
          </div>
        )}
        
        {selectedRequirementId && (
          <button 
            className="cancel-button"
            onClick={() => setShowRequirementSelector(false)}
          >
            取消
          </button>
        )}
      </div>
    );
  };
  
  const renderWorkflowParams = () => {
    if (selectedWorkflow === 'full_process') {
      return (
        <div className="workflow-params">
          <h3>工作流参数</h3>
          {renderRequirementSelector()}
          
          {!showRequirementSelector && (
            <div className="additional-params">
              <div className="param-item">
                <label>包含语义分析</label>
                <input 
                  type="checkbox" 
                  checked={workflowParams.includeSemanticAnalysis || false} 
                  onChange={e => setWorkflowParams({ 
                    ...workflowParams, 
                    includeSemanticAnalysis: e.target.checked 
                  })}
                />
              </div>
            </div>
          )}
        </div>
      );
    } else if (selectedWorkflow === 'regenerate_code') {
      return (
        <div className="workflow-params">
          <h3>工作流参数</h3>
          <div className="param-item">
            <label>期望模型ID</label>
            <input 
              type="text" 
              value={workflowParams.expectationId || ''} 
              onChange={e => setWorkflowParams({ ...workflowParams, expectationId: e.target.value })}
              placeholder="输入期望模型ID"
            />
          </div>
          <div className="param-item">
            <label>优化级别</label>
            <select
              value={workflowParams.optimizationLevel || 'medium'}
              onChange={e => setWorkflowParams({ ...workflowParams, optimizationLevel: e.target.value })}
            >
              <option value="low">低 - 基本实现</option>
              <option value="medium">中 - 平衡优化</option>
              <option value="high">高 - 完全优化</option>
            </select>
          </div>
        </div>
      );
    } else if (selectedWorkflow === 'semantic_analysis') {
      return (
        <div className="workflow-params">
          <h3>工作流参数</h3>
          {renderRequirementSelector()}
          
          {!showRequirementSelector && (
            <div className="additional-params">
              <div className="param-item">
                <label>分析深度</label>
                <select
                  value={workflowParams.analysisDepth || 'medium'}
                  onChange={e => setWorkflowParams({ ...workflowParams, analysisDepth: e.target.value })}
                >
                  <option value="low">低 - 基本分析</option>
                  <option value="medium">中 - 详细分析</option>
                  <option value="high">高 - 深度分析</option>
                </select>
              </div>
              <div className="param-item">
                <label>跟踪模块间转换</label>
                <input 
                  type="checkbox" 
                  checked={workflowParams.trackTransformations || false} 
                  onChange={e => setWorkflowParams({ 
                    ...workflowParams, 
                    trackTransformations: e.target.checked 
                  })}
                />
              </div>
            </div>
          )}
        </div>
      );
    } else if (selectedWorkflow === 'validation_only') {
      return (
        <div className="workflow-params">
          <h3>工作流参数</h3>
          <div className="param-item">
            <label>期望模型ID</label>
            <input 
              type="text" 
              value={workflowParams.expectationId || ''} 
              onChange={e => setWorkflowParams({ ...workflowParams, expectationId: e.target.value })}
              placeholder="输入期望模型ID"
            />
          </div>
          <div className="param-item">
            <label>代码ID</label>
            <input 
              type="text" 
              value={workflowParams.codeId || ''} 
              onChange={e => setWorkflowParams({ ...workflowParams, codeId: e.target.value })}
              placeholder="输入代码ID"
            />
          </div>
          <div className="param-item">
            <label>验证策略</label>
            <select
              value={workflowParams.validationStrategy || 'balanced'}
              onChange={e => setWorkflowParams({ ...workflowParams, validationStrategy: e.target.value })}
            >
              <option value="lenient">宽松 - 关注基本功能</option>
              <option value="balanced">平衡 - 综合评估</option>
              <option value="strict">严格 - 完全符合期望</option>
            </select>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  const renderProcessStatus = () => {
    if (!processStatus) return null;
    
    return (
      <div className="process-status">
        <h3>处理状态</h3>
        <div className="status-details">
          <div className="status-item">
            <span className="status-label">状态:</span>
            <span className={`status-value ${processStatus.status}`}>{processStatus.status}</span>
          </div>
          {processStatus.message && (
            <div className="status-item">
              <span className="status-label">消息:</span>
              <span className="status-value">{processStatus.message}</span>
            </div>
          )}
          {processStatus.nextStep && (
            <div className="status-item">
              <span className="status-label">下一步:</span>
              <span className="status-value">{processStatus.nextStep}</span>
            </div>
          )}
        </div>
        
        {processStatus.suggestedQuestions && processStatus.suggestedQuestions.length > 0 && (
          <div className="suggested-questions">
            <h4>建议的澄清问题</h4>
            <ul>
              {processStatus.suggestedQuestions.map((q: Question, index: number) => (
                <li key={index}>{q.text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="orchestrator-panel">
      <div className="panel-header">
        <h2>流程协调器</h2>
        <p>管理从需求到代码生成的整个流程</p>
      </div>
      
      <div className="panel-content">
        {renderWorkflowOptions()}
        {renderWorkflowParams()}
        
        <div className="action-buttons">
          <button 
            className="primary-button" 
            onClick={handleExecuteWorkflow}
            disabled={isLoading || (selectedWorkflow === 'full_process' && !selectedRequirementId)}
          >
            {isLoading ? '执行中...' : '执行工作流'}
          </button>
          
          {selectedRequirementId && (
            <button 
              className="secondary-button" 
              onClick={handleProcessRequirement}
              disabled={isLoading}
            >
              检查需求状态
            </button>
          )}
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {renderProcessStatus()}
      </div>
    </div>
  );
};

export default OrchestratorPanel;
