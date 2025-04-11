import React, { useState } from 'react';
import OrchestratorPanel from '../components/SemanticIntegration/OrchestratorPanel';
import SemanticMediatorPanel from '../components/SemanticIntegration/SemanticMediatorPanel';
import WorkflowVisualizer from '../components/SemanticIntegration/WorkflowVisualizer';
import ModuleConnectionGraph from '../components/SemanticIntegration/ModuleConnectionGraph';
import '../components/SemanticIntegration/SemanticIntegration.css';

const Integration: React.FC = () => {
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
  const [initialData, setInitialData] = useState<any>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('');
  const [showSemanticFlow, setShowSemanticFlow] = useState<boolean>(true);
  
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
              onWorkflowExecuted={(workflowId) => setActiveWorkflowId(workflowId)} 
            />
            <SemanticMediatorPanel initialData={initialData} />
          </div>
          
          <div className="visualization-container">
            <WorkflowVisualizer workflowId={activeWorkflowId} />
            <ModuleConnectionGraph 
              workflowId={activeWorkflowId} 
              showSemanticFlow={showSemanticFlow}
              onToggleSemanticFlow={(show) => setShowSemanticFlow(show)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integration;
