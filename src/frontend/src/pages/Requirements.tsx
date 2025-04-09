import React, { useState } from 'react';
import ChatInterface from '../components/Clarifier/ChatInterface';

interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const Requirements: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([
    {
      id: 'req-001',
      title: '用户管理系统',
      description: '实现一个完整的用户管理系统，包括注册、登录、个人资料管理和权限控制。',
      status: 'active',
      createdAt: new Date('2025-04-09T10:30:00'),
      updatedAt: new Date('2025-04-09T14:15:00')
    }
  ]);
  
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(requirements[0]);

  const initialMessages = [
    {
      id: 'msg-1',
      sender: 'system' as const,
      content: '欢迎使用Expeta 2.0交互式澄清功能。我将帮助您更精确地定义需求和期望。',
      timestamp: new Date('2025-04-09T10:30:00')
    },
    {
      id: 'msg-2',
      sender: 'system' as const,
      content: '我注意到您的需求中提到了"权限控制"，但没有具体说明权限的类型和级别。您能提供更多关于权限控制的细节吗？',
      timestamp: new Date('2025-04-09T10:31:00')
    },
    {
      id: 'msg-3',
      sender: 'user' as const,
      content: '系统应该支持基于角色的权限控制，至少包括管理员、普通用户和访客三种角色。管理员可以管理所有用户账户，普通用户只能管理自己的资料，访客只有有限的查看权限。',
      timestamp: new Date('2025-04-09T10:32:00')
    },
    {
      id: 'msg-4',
      sender: 'system' as const,
      content: '谢谢您的补充。我已将这些信息添加到期望模型中。您是否需要系统支持第三方登录（如通过Google、Facebook等）？',
      timestamp: new Date('2025-04-09T10:33:00')
    },
    {
      id: 'msg-5',
      sender: 'user' as const,
      content: '是的，系统应该支持Google和微信登录。',
      timestamp: new Date('2025-04-09T10:34:00')
    }
  ];

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message);
  };

  return (
    <div className="requirements-page content-area">
      <section className="requirements-section">
        <div className="section-header">
          <h2>需求管理</h2>
          <div className="section-actions">
            <button className="secondary-button">
              <span className="material-symbols-rounded">filter_list</span>
              <span>筛选</span>
            </button>
            <button className="primary-button">
              <span className="material-symbols-rounded">add</span>
              <span>新建需求</span>
            </button>
          </div>
        </div>
        
        <div className="requirements-container">
          <div className="requirements-list">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">需求列表</h3>
                <div className="search-container">
                  <input type="text" placeholder="搜索需求..." className="search-input" />
                  <span className="material-symbols-rounded search-icon">search</span>
                </div>
              </div>
              <div className="card-content">
                {requirements.map(req => (
                  <div 
                    key={req.id} 
                    className={`requirement-item ${selectedRequirement?.id === req.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRequirement(req)}
                  >
                    <div className="requirement-header">
                      <span className="requirement-id">{req.id}</span>
                      <span className={`requirement-status ${req.status}`}>{req.status === 'active' ? '活跃' : req.status === 'draft' ? '草稿' : '已完成'}</span>
                    </div>
                    <h4 className="requirement-title">{req.title}</h4>
                    <p className="requirement-description">{req.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {selectedRequirement && (
            <div className="requirement-detail">
              <div className="requirement-detail-header">
                <h3 className="requirement-detail-title">{selectedRequirement.title}</h3>
                <div className="requirement-detail-actions">
                  <button className="secondary-button">
                    <span className="material-symbols-rounded">edit</span>
                    <span>编辑</span>
                  </button>
                  <button className="primary-button">
                    <span className="material-symbols-rounded">format_list_bulleted</span>
                    <span>生成期望</span>
                  </button>
                </div>
              </div>
              
              <div className="requirement-section">
                <h3>基本信息</h3>
                <div className="requirement-property">
                  <div className="requirement-property-label">ID</div>
                  <div className="requirement-property-value">{selectedRequirement.id}</div>
                </div>
                <div className="requirement-property">
                  <div className="requirement-property-label">状态</div>
                  <div className="requirement-property-value">
                    {selectedRequirement.status === 'active' ? '活跃' : 
                     selectedRequirement.status === 'draft' ? '草稿' : '已完成'}
                  </div>
                </div>
                <div className="requirement-property">
                  <div className="requirement-property-label">创建时间</div>
                  <div className="requirement-property-value">
                    {selectedRequirement.createdAt.toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="requirement-property">
                  <div className="requirement-property-label">最后更新</div>
                  <div className="requirement-property-value">
                    {selectedRequirement.updatedAt.toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
              
              <div className="requirement-section">
                <h3>描述</h3>
                <div className="requirement-property">
                  <div className="requirement-property-value">
                    {selectedRequirement.description}
                  </div>
                </div>
              </div>
              
              <div className="requirement-section">
                <h3>系统约束</h3>
                <div className="requirement-property">
                  <div className="requirement-property-value">
                    <ul className="constraints-list">
                      <li>所有用户数据处理必须符合数据保护规范</li>
                      <li>系统应支持至少10,000个并发用户</li>
                      <li>身份验证响应时间应小于500毫秒</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      <ChatInterface 
        initialMessages={initialMessages} 
        onSendMessage={handleSendMessage} 
      />
    </div>
  );
};

export default Requirements;
