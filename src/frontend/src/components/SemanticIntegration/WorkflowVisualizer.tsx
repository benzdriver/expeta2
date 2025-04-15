import React, { useState, useEffect, useCallback } from 'react';
import { useExpeta } from '../../contexts/ExpetaContext';
import './WorkflowVisualizer.css';

interface WorkflowVisualizerProps {
  workflowId?: string;
  requirementId?: string;
}

interface WorkflowStep {
  name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'failed' | 'waiting' | 'pending';
  result?: string;
  error?: string;
  progress?: number;
}

interface WorkflowData {
  id: string;
  status: string;
  progress: number;
  currentStep?: string;
  nextStep?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  steps: WorkflowStep[];
  results?: Record<string, unknown>;
  errors?: string[];
}

const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ workflowId, requirementId: _requirementId }) => {
  const { getWorkflowStatus, isLoading } = useExpeta();
  
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  
  
  const fetchWorkflowStatus = useCallback(async () => {
    if (!workflowId) return;
    
    try {
      const status = await getWorkflowStatus(workflowId);
      const workflowData: WorkflowData = {
        id: status.id,
        status: status.status,
        progress: status.progress,
        currentStep: status.currentStep,
        nextStep: status.nextStep,
        type: status.type as string,
        startTime: status.startTime as string,
        endTime: status.endTime as string,
        steps: (status.steps || []) as WorkflowStep[],
        results: status.results,
        errors: status.errors
      };
      setWorkflowData(workflowData);
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Failed to fetch workflow status', err);
    }
  }, [workflowId, getWorkflowStatus]);
  
  useEffect(() => {
    if (workflowId) {
      fetchWorkflowStatus();
      
      if (autoRefresh) {
        const interval = setInterval(fetchWorkflowStatus, refreshInterval);
        return () => clearInterval(interval);
      }
    }
  }, [workflowId, refreshInterval, autoRefresh, fetchWorkflowStatus]);

  const getStepStatusClass = (step: WorkflowStep | null) => {
    if (!step) return 'step-pending';
    
    switch (step.status) {
      case 'completed':
        return 'step-completed';
      case 'in_progress':
        return 'step-in-progress';
      case 'failed':
        return 'step-failed';
      case 'waiting':
        return 'step-waiting';
      default:
        return 'step-pending';
    }
  };
  
  const renderWorkflowSteps = () => {
    if (!workflowData || !workflowData.steps) return null;
    
    return (
      <div className="workflow-steps">
        {workflowData.steps.map((step: WorkflowStep, index: number) => (
          <div key={index} className={`workflow-step ${getStepStatusClass(step)}`}>
            <div className="step-number">{index + 1}</div>
            <div className="step-details">
              <h4>{step.name}</h4>
              <p>{step.description}</p>
              {step.status === 'completed' && (
                <div className="step-result">
                  <span className="result-label">结果:</span>
                  <span className="result-value">{step.result || '成功'}</span>
                </div>
              )}
              {step.status === 'failed' && (
                <div className="step-error">
                  <span className="error-label">错误:</span>
                  <span className="error-value">{step.error || '未知错误'}</span>
                </div>
              )}
              {step.status === 'in_progress' && (
                <div className="step-progress">
                  <div className="progress-indicator">
                    <div className="progress-bar" style={{ width: `${step.progress || 0}%` }}></div>
                  </div>
                  <span className="progress-value">{step.progress || 0}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderWorkflowSummary = () => {
    if (!workflowData) return null;
    
    return (
      <div className="workflow-summary">
        <div className="summary-header">
          <h3>工作流摘要</h3>
          <div className="workflow-status">
            <span className={`status-badge ${workflowData.status}`}>
              {workflowData.status}
            </span>
          </div>
        </div>
        
        <div className="summary-details">
          <div className="summary-item">
            <span className="item-label">工作流类型:</span>
            <span className="item-value">{workflowData.type || '未知'}</span>
          </div>
          <div className="summary-item">
            <span className="item-label">开始时间:</span>
            <span className="item-value">
              {workflowData.startTime ? new Date(workflowData.startTime).toLocaleString() : '未开始'}
            </span>
          </div>
          {workflowData.endTime && (
            <div className="summary-item">
              <span className="item-label">结束时间:</span>
              <span className="item-value">
                {new Date(workflowData.endTime).toLocaleString()}
              </span>
            </div>
          )}
          <div className="summary-item">
            <span className="item-label">总步骤:</span>
            <span className="item-value">{workflowData.steps?.length || 0}</span>
          </div>
          <div className="summary-item">
            <span className="item-label">已完成:</span>
            <span className="item-value">
              {workflowData.steps?.filter((s: any) => s.status === 'completed').length || 0}
            </span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderRefreshControls = () => {
    return (
      <div className="refresh-controls">
        <div className="control-item">
          <label>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            自动刷新
          </label>
        </div>
        
        {autoRefresh && (
          <div className="control-item">
            <label>刷新间隔 (ms):</label>
            <select 
              value={refreshInterval} 
              onChange={e => setRefreshInterval(parseInt(e.target.value))}
            >
              <option value="2000">2秒</option>
              <option value="5000">5秒</option>
              <option value="10000">10秒</option>
              <option value="30000">30秒</option>
            </select>
          </div>
        )}
        
        <button 
          className="refresh-button" 
          onClick={fetchWorkflowStatus}
          disabled={isLoading}
        >
          {isLoading ? '刷新中...' : '手动刷新'}
        </button>
      </div>
    );
  };
  
  if (!workflowId) {
    return (
      <div className="workflow-visualizer empty-state">
        <p>选择或启动一个工作流以查看可视化</p>
      </div>
    );
  }
  
  return (
    <div className="workflow-visualizer">
      <div className="visualizer-header">
        <h3>工作流可视化</h3>
        {renderRefreshControls()}
      </div>
      
      {workflowData ? (
        <div className="visualizer-content">
          {renderWorkflowSummary()}
          {renderWorkflowSteps()}
        </div>
      ) : (
        <div className="loading-state">
          {isLoading ? '加载工作流数据...' : '无工作流数据'}
        </div>
      )}
    </div>
  );
};

export default WorkflowVisualizer;
