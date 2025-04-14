import React, { useState } from 'react';
import OrchestratorPanel from '../components/SemanticIntegration/OrchestratorPanel';
import SemanticMediatorPanel from '../components/SemanticIntegration/SemanticMediatorPanel';
import WorkflowVisualizer from '../components/SemanticIntegration/WorkflowVisualizer';
import ModuleConnectionGraph from '../components/SemanticIntegration/ModuleConnectionGraph';
import '../components/SemanticIntegration/SemanticIntegration.css';

const Integration: React.FC = () => {
  const [selectedRequirementId, _setSelectedRequirementId] = useState<string>('');
  const [initialData, _setInitialData] = useState<any>(null);
  const [activeWorkflowId, _setActiveWorkflowId] = useState<string>('');
  const [showSemanticFlow, _setShowSemanticFlow] = useState<boolean>(true);
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>语义集成</h1>
        <p>协调模块间的语义驱动交互</p>
      </div>
      
      <div className="page-content">
        <div className="integration-container">
          <div className="control-panels">
            <OrchestratorPanel 
              requirementId={selectedRequirementId} 
              onWorkflowExecuted={(workflowId) => _setActiveWorkflowId(workflowId)} 
            />
            <SemanticMediatorPanel initialData={initialData} />
          </div>
          
          <div className="visualization-container">
            <WorkflowVisualizer workflowId={activeWorkflowId} />
            <ModuleConnectionGraph 
              workflowId={activeWorkflowId} 
              showSemanticFlow={showSemanticFlow}
              onToggleSemanticFlow={(show) => _setShowSemanticFlow(show)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integration;
