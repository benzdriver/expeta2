import React, { useState } from 'react';

interface ValidationResult {
  id: string;
  expectationId: string;
  codeId: string;
  status: 'passed' | 'failed' | 'partial';
  score: number;
  details: ValidationDetail[];
  createdAt: Date;
}

interface ValidationDetail {
  expectationId: string;
  status: 'passed' | 'failed' | 'partial';
  score: number;
  message: string;
}

const Validation: React.FC = () => {
  const [validationResults, _setValidationResults] = useState<ValidationResult[]>([
    {
      id: 'val-001',
      expectationId: 'user_management_system',
      codeId: 'code-001',
      status: 'partial',
      score: 85,
      details: [
        {
          expectationId: 'user_registration',
          status: 'passed',
          score: 100,
          message: '用户注册功能完全符合期望要求'
        },
        {
          expectationId: 'user_authentication',
          status: 'partial',
          score: 80,
          message: '用户认证功能基本符合要求，但缺少第三方登录支持'
        },
        {
          expectationId: 'role_management',
          status: 'passed',
          score: 90,
          message: '角色管理功能符合要求，但权限配置界面可以改进'
        }
      ],
      createdAt: new Date('2025-04-09T15:30:00')
    },
    {
      id: 'val-002',
      expectationId: 'payment_processing',
      codeId: 'code-002',
      status: 'failed',
      score: 65,
      details: [
        {
          expectationId: 'payment_methods',
          status: 'partial',
          score: 70,
          message: '支持信用卡支付，但缺少电子钱包集成'
        },
        {
          expectationId: 'transaction_security',
          status: 'failed',
          score: 50,
          message: '交易安全措施不足，需要实现更强的加密和验证'
        },
        {
          expectationId: 'payment_processing',
          status: 'partial',
          score: 75,
          message: '支付处理流程基本正确，但缺少错误处理和重试机制'
        }
      ],
      createdAt: new Date('2025-04-08T14:15:00')
    }
  ]);
  
  const [selectedResult, setSelectedResult] = useState<ValidationResult | null>(validationResults[0]);
  
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'partial':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'passed':
        return '通过';
      case 'failed':
        return '失败';
      case 'partial':
        return '部分通过';
      default:
        return '未知';
    }
  };
  
  return (
    <div className="validation-page content-area">
      <div className="section-header">
        <h2>验证结果</h2>
        <div className="section-actions">
          <button className="secondary-button">
            <span className="material-symbols-rounded">filter_list</span>
            <span>筛选</span>
          </button>
          <button className="primary-button">
            <span className="material-symbols-rounded">refresh</span>
            <span>重新验证</span>
          </button>
        </div>
      </div>
      
      <div className="validation-container">
        <div className="validation-list">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">验证结果列表</h3>
              <div className="search-container">
                <input type="text" placeholder="搜索结果..." className="search-input" />
                <span className="material-symbols-rounded search-icon">search</span>
              </div>
            </div>
            <div className="card-content">
              {validationResults.map(result => (
                <div 
                  key={result.id} 
                  className={`validation-item ${selectedResult?.id === result.id ? 'selected' : ''}`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="validation-header">
                    <span className="validation-id">{result.id}</span>
                    <span className={`validation-status ${getStatusColor(result.status)}`}>
                      {getStatusText(result.status)}
                    </span>
                  </div>
                  <div className="validation-info">
                    <div className="validation-score">
                      <div className="score-circle" style={{ 
                        background: `conic-gradient(var(--${getStatusColor(result.status)}-color) ${result.score}%, #e9ecef ${result.score}% 100%)` 
                      }}>
                        <span>{result.score}%</span>
                      </div>
                    </div>
                    <div className="validation-meta">
                      <h4 className="validation-title">
                        {result.expectationId === 'user_management_system' ? '用户管理系统' : 
                         result.expectationId === 'payment_processing' ? '支付处理系统' : 
                         result.expectationId}
                      </h4>
                      <p className="validation-time">
                        {result.createdAt.toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {selectedResult && (
          <div className="validation-detail">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">验证详情</h3>
                <div className="card-actions">
                  <button className="secondary-button">
                    <span className="material-symbols-rounded">download</span>
                    <span>导出报告</span>
                  </button>
                </div>
              </div>
              <div className="card-content">
                <div className="validation-summary">
                  <div className="summary-item">
                    <div className="summary-label">期望ID</div>
                    <div className="summary-value">{selectedResult.expectationId}</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">代码ID</div>
                    <div className="summary-value">{selectedResult.codeId}</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">验证时间</div>
                    <div className="summary-value">{selectedResult.createdAt.toLocaleString('zh-CN')}</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">总体状态</div>
                    <div className="summary-value">
                      <span className={`status-badge ${getStatusColor(selectedResult.status)}`}>
                        {getStatusText(selectedResult.status)}
                      </span>
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">总体得分</div>
                    <div className="summary-value">{selectedResult.score}%</div>
                  </div>
                </div>
                
                <div className="validation-details">
                  <h4>详细结果</h4>
                  {selectedResult.details.map((detail, index) => (
                    <div key={index} className="detail-item">
                      <div className="detail-header">
                        <span className="detail-title">{detail.expectationId}</span>
                        <span className={`detail-status ${getStatusColor(detail.status)}`}>
                          {getStatusText(detail.status)} ({detail.score}%)
                        </span>
                      </div>
                      <div className="detail-message">{detail.message}</div>
                    </div>
                  ))}
                </div>
                
                <div className="validation-actions">
                  <button className="secondary-button">
                    <span className="material-symbols-rounded">code</span>
                    <span>查看代码</span>
                  </button>
                  <button className="primary-button">
                    <span className="material-symbols-rounded">auto_fix</span>
                    <span>自动修复</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Validation;
