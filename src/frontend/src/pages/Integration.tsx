import React, { useState } from 'react';
import OrchestratorPanel from '../components/SemanticIntegration/OrchestratorPanel';
import SemanticMediatorPanel from '../components/SemanticIntegration/SemanticMediatorPanel';
import '../components/SemanticIntegration/SemanticIntegration.css';

const Integration: React.FC = () => {
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
  const [initialData, setInitialData] = useState<any>(null);
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>语义集成</h1>
        <p>协调模块间的语义驱动交互</p>
      </div>
      
      <div className="page-content">
        <div className="integration-container">
          <OrchestratorPanel requirementId={selectedRequirementId} />
          <SemanticMediatorPanel initialData={initialData} />
        </div>
      </div>
    </div>
  );
};

export default Integration;
