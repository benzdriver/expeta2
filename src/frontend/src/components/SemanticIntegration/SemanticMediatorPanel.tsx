import React, { useState } from 'react';
import { useExpeta } from '../../contexts/ExpetaContext';

interface SemanticMediatorPanelProps {
  initialData?: any;
}

const SemanticMediatorPanel: React.FC<SemanticMediatorPanelProps> = ({ initialData }) => {
  const { 
    translateBetweenModules, 
    enrichWithContext, 
    extractSemanticInsights, 
    resolveSemanticConflicts,
    isLoading, 
    error 
  } = useExpeta();
  
  const [sourceModule, setSourceModule] = useState<string>('clarifier');
  const [targetModule, setTargetModule] = useState<string>('generator');
  const [inputData, setInputData] = useState<string>(initialData ? JSON.stringify(initialData, null, 2) : '');
  const [contextQuery, setContextQuery] = useState<string>('');
  const [insightQuery, setInsightQuery] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [selectedOperation, setSelectedOperation] = useState<string>('translate');
  const [moduleA, setModuleA] = useState<string>('clarifier');
  const [moduleB, setModuleB] = useState<string>('generator');
  const [dataA, setDataA] = useState<string>('');
  const [dataB, setDataB] = useState<string>('');
  
  const handleTranslate = async () => {
    try {
      const data = JSON.parse(inputData);
      const translatedData = await translateBetweenModules(sourceModule, targetModule, data);
      setResult(translatedData);
    } catch (err: any) {
      console.error('Translation failed', err);
      setResult({ error: err.message || 'Failed to translate between modules' });
    }
  };
  
  const handleEnrich = async () => {
    try {
      const data = JSON.parse(inputData);
      const enrichedData = await enrichWithContext(sourceModule, data, contextQuery);
      setResult(enrichedData);
    } catch (err: any) {
      console.error('Enrichment failed', err);
      setResult({ error: err.message || 'Failed to enrich with context' });
    }
  };
  
  const handleExtractInsights = async () => {
    try {
      const data = JSON.parse(inputData);
      const insights = await extractSemanticInsights(data, insightQuery);
      setResult(insights);
    } catch (err: any) {
      console.error('Insight extraction failed', err);
      setResult({ error: err.message || 'Failed to extract semantic insights' });
    }
  };
  
  const handleResolveConflicts = async () => {
    try {
      const parsedDataA = JSON.parse(dataA);
      const parsedDataB = JSON.parse(dataB);
      const resolution = await resolveSemanticConflicts(moduleA, parsedDataA, moduleB, parsedDataB);
      setResult(resolution);
    } catch (err: any) {
      console.error('Conflict resolution failed', err);
      setResult({ error: err.message || 'Failed to resolve semantic conflicts' });
    }
  };
  
  const handleOperation = () => {
    switch (selectedOperation) {
      case 'translate':
        handleTranslate();
        break;
      case 'enrich':
        handleEnrich();
        break;
      case 'insights':
        handleExtractInsights();
        break;
      case 'conflicts':
        handleResolveConflicts();
        break;
    }
  };
  
  const renderOperationForm = () => {
    switch (selectedOperation) {
      case 'translate':
        return (
          <div className="operation-form">
            <div className="form-row">
              <div className="form-group">
                <label>源模块</label>
                <select 
                  value={sourceModule} 
                  onChange={e => setSourceModule(e.target.value)}
                >
                  <option value="clarifier">澄清器</option>
                  <option value="generator">生成器</option>
                  <option value="validator">验证器</option>
                  <option value="memory">记忆系统</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>目标模块</label>
                <select 
                  value={targetModule} 
                  onChange={e => setTargetModule(e.target.value)}
                >
                  <option value="clarifier">澄清器</option>
                  <option value="generator">生成器</option>
                  <option value="validator">验证器</option>
                  <option value="memory">记忆系统</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>输入数据 (JSON)</label>
              <textarea 
                value={inputData} 
                onChange={e => setInputData(e.target.value)}
                rows={8}
                placeholder="输入要转换的JSON数据"
              />
            </div>
          </div>
        );
        
      case 'enrich':
        return (
          <div className="operation-form">
            <div className="form-group">
              <label>模块</label>
              <select 
                value={sourceModule} 
                onChange={e => setSourceModule(e.target.value)}
              >
                <option value="clarifier">澄清器</option>
                <option value="generator">生成器</option>
                <option value="validator">验证器</option>
                <option value="memory">记忆系统</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>输入数据 (JSON)</label>
              <textarea 
                value={inputData} 
                onChange={e => setInputData(e.target.value)}
                rows={6}
                placeholder="输入要丰富的JSON数据"
              />
            </div>
            
            <div className="form-group">
              <label>上下文查询</label>
              <input 
                type="text" 
                value={contextQuery} 
                onChange={e => setContextQuery(e.target.value)}
                placeholder="输入上下文查询关键词"
              />
            </div>
          </div>
        );
        
      case 'insights':
        return (
          <div className="operation-form">
            <div className="form-group">
              <label>输入数据 (JSON)</label>
              <textarea 
                value={inputData} 
                onChange={e => setInputData(e.target.value)}
                rows={8}
                placeholder="输入要分析的JSON数据"
              />
            </div>
            
            <div className="form-group">
              <label>洞察查询</label>
              <input 
                type="text" 
                value={insightQuery} 
                onChange={e => setInsightQuery(e.target.value)}
                placeholder="输入洞察查询关键词"
              />
            </div>
          </div>
        );
        
      case 'conflicts':
        return (
          <div className="operation-form">
            <div className="form-row">
              <div className="form-group">
                <label>模块A</label>
                <select 
                  value={moduleA} 
                  onChange={e => setModuleA(e.target.value)}
                >
                  <option value="clarifier">澄清器</option>
                  <option value="generator">生成器</option>
                  <option value="validator">验证器</option>
                  <option value="memory">记忆系统</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>模块B</label>
                <select 
                  value={moduleB} 
                  onChange={e => setModuleB(e.target.value)}
                >
                  <option value="clarifier">澄清器</option>
                  <option value="generator">生成器</option>
                  <option value="validator">验证器</option>
                  <option value="memory">记忆系统</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>数据A (JSON)</label>
              <textarea 
                value={dataA} 
                onChange={e => setDataA(e.target.value)}
                rows={5}
                placeholder="输入模块A的JSON数据"
              />
            </div>
            
            <div className="form-group">
              <label>数据B (JSON)</label>
              <textarea 
                value={dataB} 
                onChange={e => setDataB(e.target.value)}
                rows={5}
                placeholder="输入模块B的JSON数据"
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="semantic-mediator-panel">
      <div className="panel-header">
        <h2>语义中介器</h2>
        <p>实现模块间的语义驱动交互</p>
      </div>
      
      <div className="panel-content">
        <div className="operation-selector">
          <h3>选择操作</h3>
          <div className="operation-options">
            <div 
              className={`operation-option ${selectedOperation === 'translate' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('translate')}
            >
              <h4>模块间转换</h4>
              <p>在不同模块之间转换数据格式，保持语义一致性</p>
            </div>
            
            <div 
              className={`operation-option ${selectedOperation === 'enrich' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('enrich')}
            >
              <h4>语义丰富</h4>
              <p>使用相关记忆丰富数据的语义上下文</p>
            </div>
            
            <div 
              className={`operation-option ${selectedOperation === 'insights' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('insights')}
            >
              <h4>语义洞察</h4>
              <p>从数据中提取有价值的语义洞察</p>
            </div>
            
            <div 
              className={`operation-option ${selectedOperation === 'conflicts' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('conflicts')}
            >
              <h4>冲突解决</h4>
              <p>解决不同模块之间的语义冲突</p>
            </div>
          </div>
        </div>
        
        {renderOperationForm()}
        
        <div className="action-buttons">
          <button 
            className="primary-button" 
            onClick={handleOperation}
            disabled={isLoading}
          >
            {isLoading ? '处理中...' : '执行操作'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {result && (
          <div className="result-container">
            <h3>结果</h3>
            <pre className="result-json">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SemanticMediatorPanel;
