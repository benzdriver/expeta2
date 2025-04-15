import React, { useState } from 'react';

interface Expectation {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active';
  createdAt: Date;
  updatedAt: Date;
  subExpectations?: SubExpectation[];
}

interface SubExpectation {
  id: string;
  title: string;
  description: string;
  criteria: string[];
}

const Expectations: React.FC = () => {
  const [expectations, _setExpectations] = useState<Expectation[]>([
    {
      id: 'user_management_system',
      title: '用户管理系统',
      description: '一个完整的用户管理系统，提供用户账户生命周期管理和安全访问控制。系统应支持用户注册、认证、个人资料管理和基于角色的权限控制。',
      status: 'active',
      createdAt: new Date('2025-04-09T10:30:00'),
      updatedAt: new Date('2025-04-09T14:15:00'),
      subExpectations: [
        {
          id: 'user_registration',
          title: '用户注册',
          description: '允许新用户创建账户，包括电子邮件验证和密码安全要求',
          criteria: ['支持电子邮件验证', '密码强度检查', '防止重复注册']
        },
        {
          id: 'user_authentication',
          title: '用户认证',
          description: '安全的用户登录系统，支持多种认证方式',
          criteria: ['支持密码登录', '支持Google和微信第三方登录', '实现登录尝试限制']
        },
        {
          id: 'role_management',
          title: '角色管理',
          description: '基于角色的权限控制系统',
          criteria: ['支持管理员、普通用户和访客角色', '可配置的权限设置', '角色分配和管理界面']
        }
      ]
    },
    {
      id: 'payment_processing',
      title: '支付处理系统',
      description: '安全处理多种支付方式的交易，包括信用卡、电子钱包和银行转账',
      status: 'active',
      createdAt: new Date('2025-04-08T09:15:00'),
      updatedAt: new Date('2025-04-09T11:30:00')
    },
    {
      id: 'inventory_management',
      title: '库存管理系统',
      description: '跟踪和管理产品库存，支持库存预警和自动补货功能',
      status: 'draft',
      createdAt: new Date('2025-04-07T14:20:00'),
      updatedAt: new Date('2025-04-07T16:45:00')
    },
    {
      id: 'reporting_dashboard',
      title: '报表仪表板',
      description: '生成和展示业务关键指标的可视化报表和图表',
      status: 'draft',
      createdAt: new Date('2025-04-06T11:10:00'),
      updatedAt: new Date('2025-04-06T15:30:00')
    }
  ]);
  
  const [selectedExpectation, setSelectedExpectation] = useState<Expectation | null>(expectations[0]);

  return (
    <div className="expectations-page content-area">
      <div className="section-header">
        <h2>期望管理</h2>
        <div className="section-actions">
          <button className="secondary-button">
            <span className="material-symbols-rounded">filter_list</span>
            <span>筛选</span>
          </button>
          <button className="primary-button">
            <span className="material-symbols-rounded">add</span>
            <span>新建期望</span>
          </button>
        </div>
      </div>
      
      <div className="expectations-container">
        <div className="expectation-list">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">期望列表</h3>
              <div className="search-container">
                <input type="text" placeholder="搜索期望..." className="search-input" />
                <span className="material-symbols-rounded search-icon">search</span>
              </div>
            </div>
            <div className="card-content">
              {expectations.map(exp => (
                <div 
                  key={exp.id} 
                  className={`expectation-item ${selectedExpectation?.id === exp.id ? 'selected' : ''}`}
                  onClick={() => setSelectedExpectation(exp)}
                >
                  <div className="expectation-header">
                    <span className="expectation-id">{exp.id}</span>
                    <span className={`expectation-status ${exp.status}`}>
                      {exp.status === 'active' ? '活跃' : '草稿'}
                    </span>
                  </div>
                  <h4 className="expectation-title">{exp.title}</h4>
                  <p className="expectation-description">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {selectedExpectation && (
          <div className="expectation-detail">
            <div className="expectation-detail-header">
              <h3 className="expectation-detail-title">{selectedExpectation.title}</h3>
              <div className="expectation-detail-actions">
                <button className="secondary-button">
                  <span className="material-symbols-rounded">edit</span>
                  <span>编辑</span>
                </button>
                <button className="primary-button">
                  <span className="material-symbols-rounded">code</span>
                  <span>生成代码</span>
                </button>
              </div>
            </div>
            
            <div className="expectation-section">
              <h3>基本信息</h3>
              <div className="expectation-property">
                <div className="expectation-property-label">ID</div>
                <div className="expectation-property-value">{selectedExpectation.id}</div>
              </div>
              <div className="expectation-property">
                <div className="expectation-property-label">状态</div>
                <div className="expectation-property-value">
                  {selectedExpectation.status === 'active' ? '活跃' : '草稿'}
                </div>
              </div>
              <div className="expectation-property">
                <div className="expectation-property-label">创建时间</div>
                <div className="expectation-property-value">
                  {selectedExpectation.createdAt.toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="expectation-property">
                <div className="expectation-property-label">最后更新</div>
                <div className="expectation-property-value">
                  {selectedExpectation.updatedAt.toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
            
            <div className="expectation-section">
              <h3>描述</h3>
              <div className="expectation-property">
                <div className="expectation-property-value">
                  {selectedExpectation.description}
                </div>
              </div>
            </div>
            
            {selectedExpectation.subExpectations && (
              <div className="expectation-section">
                <h3>子期望</h3>
                {selectedExpectation.subExpectations.map(subExp => (
                  <div key={subExp.id} className="sub-expectation">
                    <p><strong>ID:</strong> {subExp.id}</p>
                    <p><strong>标题:</strong> {subExp.title}</p>
                    <p><strong>描述:</strong> {subExp.description}</p>
                    <div className="criteria-list">
                      <p><strong>验收标准:</strong></p>
                      <ul>
                        {subExp.criteria.map((criterion, index) => (
                          <li key={index}>{criterion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Expectations;
