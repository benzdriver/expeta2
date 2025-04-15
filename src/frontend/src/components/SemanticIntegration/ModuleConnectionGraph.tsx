import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useExpeta } from '../../contexts/ExpetaContext';
import './ModuleConnectionGraph.css';

interface ModuleConnectionGraphProps {
  workflowId?: string;
  showSemanticFlow?: boolean;
  onToggleSemanticFlow?: (show: boolean) => void;
}

const ModuleConnectionGraph: React.FC<ModuleConnectionGraphProps> = ({ 
  workflowId,
  showSemanticFlow = true,
  onToggleSemanticFlow
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getModuleConnections, isLoading } = useExpeta();
  
  const [connections, setConnections] = useState<{ source: string, target: string, type: string, count: number }[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  
  const fetchModuleConnections = useCallback(async () => {
    if (!workflowId) return;
    
    try {
      const data = await getModuleConnections(workflowId);
      
      if (data && Array.isArray(data)) {
        setConnections(data);
      } else {
        const mockConnections = [
          { source: 'clarifier', target: 'semantic_mediator', type: 'expectation', count: 5 },
          { source: 'semantic_mediator', target: 'generator', type: 'enriched_expectation', count: 3 },
          { source: 'generator', target: 'validator', type: 'code', count: 2 },
          { source: 'validator', target: 'semantic_mediator', type: 'validation_result', count: 2 },
          { source: 'semantic_mediator', target: 'clarifier', type: 'feedback', count: 1 },
          { source: 'memory', target: 'semantic_mediator', type: 'context', count: 4 },
          { source: 'semantic_mediator', target: 'orchestrator', type: 'status_update', count: 7 },
          { source: 'orchestrator', target: 'clarifier', type: 'command', count: 2 },
          { source: 'orchestrator', target: 'generator', type: 'command', count: 2 },
          { source: 'orchestrator', target: 'validator', type: 'command', count: 2 },
        ];
        
        setConnections(mockConnections);
        /* eslint-disable-next-line no-console */
        console.warn('API returned unexpected data format, using mock data instead');
      }
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error('Failed to fetch module connections', err);
      
      const mockConnections = [
        { source: 'clarifier', target: 'semantic_mediator', type: 'expectation', count: 5 },
        { source: 'semantic_mediator', target: 'generator', type: 'enriched_expectation', count: 3 },
        { source: 'generator', target: 'validator', type: 'code', count: 2 },
        { source: 'validator', target: 'semantic_mediator', type: 'validation_result', count: 2 },
        { source: 'semantic_mediator', target: 'clarifier', type: 'feedback', count: 1 },
        { source: 'memory', target: 'semantic_mediator', type: 'context', count: 4 },
        { source: 'semantic_mediator', target: 'orchestrator', type: 'status_update', count: 7 },
        { source: 'orchestrator', target: 'clarifier', type: 'command', count: 2 },
        { source: 'orchestrator', target: 'generator', type: 'command', count: 2 },
        { source: 'orchestrator', target: 'validator', type: 'command', count: 2 },
      ];
      
      setConnections(mockConnections);
    }
  }, [workflowId, getModuleConnections]);
  
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const modulePositions: Record<string, { x: number, y: number }> = {
      clarifier: { x: 100, y: 100 },
      generator: { x: 400, y: 100 },
      validator: { x: 400, y: 300 },
      memory: { x: 100, y: 300 },
      semantic_mediator: { x: 250, y: 200 },
      orchestrator: { x: 250, y: 50 }
    };
    
    connections.forEach(conn => {
      const sourcePos = modulePositions[conn.source];
      const targetPos = modulePositions[conn.target];
      
      if (!sourcePos || !targetPos) return;
      
      const isHighlighted = highlightedPath.includes(conn.source) && 
                           highlightedPath.includes(conn.target);
      
      const isActive = activeModule === conn.source || activeModule === conn.target;
      
      ctx.lineWidth = isHighlighted ? 3 : isActive ? 2 : 1;
      ctx.strokeStyle = isHighlighted ? '#4CAF50' : 
                       isActive ? '#2196F3' : '#9E9E9E';
      
      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      
      const midX = (sourcePos.x + targetPos.x) / 2;
      const midY = (sourcePos.y + targetPos.y) / 2;
      const offset = 30;
      
      ctx.quadraticCurveTo(midX + offset, midY + offset, targetPos.x, targetPos.y);
      ctx.stroke();
      
      if (showSemanticFlow) {
        ctx.fillStyle = isHighlighted ? '#4CAF50' : 
                       isActive ? '#2196F3' : '#757575';
        ctx.font = '10px Arial';
        ctx.fillText(
          `${conn.type} (${conn.count})`, 
          midX + offset/2, 
          midY + offset/2
        );
      }
      
      const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);
      const arrowSize = 8;
      
      ctx.beginPath();
      ctx.moveTo(targetPos.x, targetPos.y);
      ctx.lineTo(
        targetPos.x - arrowSize * Math.cos(angle - Math.PI/6),
        targetPos.y - arrowSize * Math.sin(angle - Math.PI/6)
      );
      ctx.lineTo(
        targetPos.x - arrowSize * Math.cos(angle + Math.PI/6),
        targetPos.y - arrowSize * Math.sin(angle + Math.PI/6)
      );
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    });
    
    Object.entries(modulePositions).forEach(([module, pos]) => {
      const isActive = activeModule === module;
      const isHighlighted = highlightedPath.includes(module);
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 30, 0, 2 * Math.PI);
      ctx.fillStyle = isHighlighted ? '#E8F5E9' : 
                     isActive ? '#E3F2FD' : '#F5F5F5';
      ctx.fill();
      ctx.lineWidth = isHighlighted ? 3 : isActive ? 2 : 1;
      ctx.strokeStyle = isHighlighted ? '#4CAF50' : 
                       isActive ? '#2196F3' : '#9E9E9E';
      ctx.stroke();
      
      ctx.fillStyle = '#212121';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const displayName = module
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      ctx.fillText(displayName, pos.x, pos.y);
    });
  }, [connections, activeModule, highlightedPath, showSemanticFlow, canvasRef]);
  
  useEffect(() => {
    if (workflowId) {
      fetchModuleConnections();
    }
  }, [workflowId, fetchModuleConnections]);
  
  useEffect(() => {
    if (canvasRef.current && connections.length > 0) {
      drawGraph();
    }
  }, [connections, activeModule, highlightedPath, drawGraph]);
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const modulePositions: Record<string, { x: number, y: number }> = {
      clarifier: { x: 100, y: 100 },
      generator: { x: 400, y: 100 },
      validator: { x: 400, y: 300 },
      memory: { x: 100, y: 300 },
      semantic_mediator: { x: 250, y: 200 },
      orchestrator: { x: 250, y: 50 }
    };
    
    let clickedModule = null;
    for (const [module, pos] of Object.entries(modulePositions)) {
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance <= 30) {
        clickedModule = module;
        break;
      }
    }
    
    if (clickedModule) {
      if (activeModule === clickedModule) {
        setActiveModule(null);
        setHighlightedPath([]);
      } else {
        setActiveModule(clickedModule);
        
        const relatedModules = new Set<string>([clickedModule]);
        connections.forEach(conn => {
          if (conn.source === clickedModule) {
            relatedModules.add(conn.target);
          } else if (conn.target === clickedModule) {
            relatedModules.add(conn.source);
          }
        });
        
        setHighlightedPath(Array.from(relatedModules));
      }
    }
  };
  
  return (
    <div className="module-connection-graph">
      <div className="graph-header">
        <h3>模块连接图</h3>
        <div className="graph-controls">
          <label>
            <input 
              type="checkbox" 
              checked={showSemanticFlow} 
              onChange={e => onToggleSemanticFlow && onToggleSemanticFlow(e.target.checked)}
            />
            显示语义流
          </label>
          <button 
            className="refresh-button" 
            onClick={fetchModuleConnections}
            disabled={isLoading}
          >
            刷新
          </button>
        </div>
      </div>
      
      <div className="graph-container">
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={350}
          onClick={handleCanvasClick}
        />
      </div>
      
      {activeModule && (
        <div className="module-details">
          <h4>模块详情: {activeModule}</h4>
          <div className="connection-stats">
            <div className="stat-item">
              <span className="stat-label">输入连接:</span>
              <span className="stat-value">
                {connections.filter(c => c.target === activeModule).length}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">输出连接:</span>
              <span className="stat-value">
                {connections.filter(c => c.source === activeModule).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleConnectionGraph;
