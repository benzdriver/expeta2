import React, { useState, useEffect } from 'react';
import { useExpeta } from '../../contexts/ExpetaContext';

interface OrchestratorPanelProps {
  requirementId?: string;
  onWorkflowExecuted?: (workflowId: string) => void;
}

const OrchestratorPanel: React.FC<OrchestratorPanelProps> = ({ requirementId, onWorkflowExecuted }) => {
  const { 
    processRequirement, 
    executeWorkflow, 
    isLoading, 
    error 
  } = useExpeta();
  
  const [processStatus, setProcessStatus] = useState<any>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('full_process');
  const [workflowParams, setWorkflowParams] = useState<any>({});
  
  useEffect(() => {
    if (requirementId) {
      handleProcessRequirement();
    }
  }, [requirementId]);
  
  const handleProcessRequirement = async () => {
    if (!requirementId) return;
    
    try {
      const status = await processRequirement(requirementId);
      setProcessStatus(status);
      
      setWorkflowParams({ requirementId });
    } catch (err) {
      console.error('Failed to process requirement', err);
    }
  };
  
  const handleExecuteWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    try {
      const result = await executeWorkflow(selectedWorkflow, workflowParams);
      setProcessStatus(result);
      
      if (result.executionId && onWorkflowExecuted) {
        onWorkflowExecuted(result.executionId);
      }
    } catch (err) {
      console.error('Failed to execute workflow', err);
    }
  };
  
  const renderWorkflowOptions = () => {
    const workflows = [
      { id: 'full_process', label: '完整流程', description: '从需求到代码生成和验证的完整流程' },
      { id: 'regenerate_code', label: '重新生成代码', description: '基于现有期望模型重新生成代码' },
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
  
  const renderWorkflowParams = () => {
    if (selectedWorkflow === 'full_process') {
      return (
        <div className="workflow-params">
          <h3>工作流参数</h3>
          <div className="param-item">
            <label>需求ID</label>
            <input 
              type="text" 
              value={workflowParams.requirementId || ''} 
              onChange={e => setWorkflowParams({ ...workflowParams, requirementId: e.target.value })}
              placeholder="输入需求ID"
            />
          </div>
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
              {processStatus.suggestedQuestions.map((q: any, index: number) => (
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
            disabled={isLoading}
          >
            {isLoading ? '执行中...' : '执行工作流'}
          </button>
          
          {requirementId && (
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
