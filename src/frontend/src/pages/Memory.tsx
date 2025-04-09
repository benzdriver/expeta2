import React, { useState } from 'react';

interface MemoryItem {
  id: string;
  type: 'requirement' | 'expectation' | 'code' | 'validation';
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  accessCount: number;
}

const Memory: React.FC = () => {
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([
    {
      id: 'mem-001',
      type: 'requirement',
      title: '用户管理系统需求',
      content: '实现一个完整的用户管理系统，包括注册、登录、个人资料管理和权限控制。',
      tags: ['用户管理', '认证', '权限控制'],
      createdAt: new Date('2025-04-09T10:30:00'),
      accessCount: 15
    },
    {
      id: 'mem-002',
      type: 'expectation',
      title: '用户注册期望',
      content: '允许新用户创建账户，包括电子邮件验证和密码安全要求',
      tags: ['用户管理', '注册', '安全'],
      createdAt: new Date('2025-04-09T11:15:00'),
      accessCount: 12
    },
    {
      id: 'mem-003',
      type: 'code',
      title: '用户认证模块代码',
      content: '用户认证模块的TypeScript实现，包括密码登录和第三方登录支持',
      tags: ['用户管理', '认证', 'TypeScript'],
      createdAt: new Date('2025-04-09T14:20:00'),
      accessCount: 8
    },
    {
      id: 'mem-004',
      type: 'validation',
      title: '用户管理系统验证结果',
      content: '用户管理系统代码的验证结果，总体得分85%',
      tags: ['用户管理', '验证', '部分通过'],
      createdAt: new Date('2025-04-09T15:30:00'),
      accessCount: 5
    },
    {
      id: 'mem-005',
      type: 'requirement',
      title: '支付处理系统需求',
      content: '实现安全的支付处理系统，支持多种支付方式',
      tags: ['支付', '安全', '交易'],
      createdAt: new Date('2025-04-08T09:15:00'),
      accessCount: 10
    }
  ]);
  
  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(memoryItems[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  const allTags = Array.from(new Set(memoryItems.flatMap(item => item.tags)));
  
  const filteredItems = memoryItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => item.tags.includes(tag));
    
    const matchesTypes = selectedTypes.length === 0 || 
      selectedTypes.includes(item.type);
    
    return matchesSearch && matchesTags && matchesTypes;
  });
  
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };
  
  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };
  
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'requirement':
        return 'description';
      case 'expectation':
        return 'format_list_bulleted';
      case 'code':
        return 'code';
      case 'validation':
        return 'verified';
      default:
        return 'memory';
    }
  };
  
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'requirement':
        return 'primary';
      case 'expectation':
        return 'info';
      case 'code':
        return 'success';
      case 'validation':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  return (
    <div className="memory-page content-area">
      <div className="section-header">
        <h2>记忆系统</h2>
        <div className="section-actions">
          <button className="secondary-button">
            <span className="material-symbols-rounded">tune</span>
            <span>高级搜索</span>
          </button>
          <button className="primary-button">
            <span className="material-symbols-rounded">add</span>
            <span>新建记忆</span>
          </button>
        </div>
      </div>
      
      <div className="memory-container">
        <div className="memory-sidebar">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">搜索与筛选</h3>
            </div>
            <div className="card-content">
              <div className="search-container">
                <input 
                  type="text" 
                  placeholder="搜索记忆..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="material-symbols-rounded search-icon">search</span>
              </div>
              
              <div className="filter-section">
                <h4>类型筛选</h4>
                <div className="filter-options">
                  <div 
                    className={`filter-chip ${selectedTypes.includes('requirement') ? 'active' : ''}`}
                    onClick={() => handleTypeToggle('requirement')}
                  >
                    <span className="material-symbols-rounded">{getTypeIcon('requirement')}</span>
                    <span>需求</span>
                  </div>
                  <div 
                    className={`filter-chip ${selectedTypes.includes('expectation') ? 'active' : ''}`}
                    onClick={() => handleTypeToggle('expectation')}
                  >
                    <span className="material-symbols-rounded">{getTypeIcon('expectation')}</span>
                    <span>期望</span>
                  </div>
                  <div 
                    className={`filter-chip ${selectedTypes.includes('code') ? 'active' : ''}`}
                    onClick={() => handleTypeToggle('code')}
                  >
                    <span className="material-symbols-rounded">{getTypeIcon('code')}</span>
                    <span>代码</span>
                  </div>
                  <div 
                    className={`filter-chip ${selectedTypes.includes('validation') ? 'active' : ''}`}
                    onClick={() => handleTypeToggle('validation')}
                  >
                    <span className="material-symbols-rounded">{getTypeIcon('validation')}</span>
                    <span>验证</span>
                  </div>
                </div>
              </div>
              
              <div className="filter-section">
                <h4>标签筛选</h4>
                <div className="filter-options">
                  {allTags.map(tag => (
                    <div 
                      key={tag}
                      className={`filter-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      <span className="material-symbols-rounded">tag</span>
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="memory-content">
          <div className="memory-list">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">记忆列表</h3>
                <div className="card-subtitle">
                  {filteredItems.length} 个结果
                </div>
              </div>
              <div className="card-content">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      className={`memory-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="memory-item-icon">
                        <span 
                          className={`material-symbols-rounded ${getTypeColor(item.type)}`}
                        >
                          {getTypeIcon(item.type)}
                        </span>
                      </div>
                      <div className="memory-item-content">
                        <h4 className="memory-item-title">{item.title}</h4>
                        <p className="memory-item-excerpt">{item.content.substring(0, 60)}...</p>
                        <div className="memory-item-meta">
                          <span className="memory-item-date">
                            {item.createdAt.toLocaleDateString('zh-CN')}
                          </span>
                          <span className="memory-item-access">
                            <span className="material-symbols-rounded">visibility</span>
                            {item.accessCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <span className="material-symbols-rounded">search_off</span>
                    <p>没有找到匹配的记忆项</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {selectedItem && (
            <div className="memory-detail">
              <div className="card">
                <div className="card-header">
                  <div className="memory-detail-type">
                    <span 
                      className={`type-badge ${getTypeColor(selectedItem.type)}`}
                    >
                      <span className="material-symbols-rounded">
                        {getTypeIcon(selectedItem.type)}
                      </span>
                      <span>
                        {selectedItem.type === 'requirement' ? '需求' : 
                         selectedItem.type === 'expectation' ? '期望' : 
                         selectedItem.type === 'code' ? '代码' : '验证'}
                      </span>
                    </span>
                  </div>
                  <div className="card-actions">
                    <button className="secondary-button">
                      <span className="material-symbols-rounded">edit</span>
                      <span>编辑</span>
                    </button>
                    <button className="secondary-button">
                      <span className="material-symbols-rounded">delete</span>
                      <span>删除</span>
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  <div className="memory-detail-header">
                    <h3 className="memory-detail-title">{selectedItem.title}</h3>
                    <div className="memory-detail-meta">
                      <span className="memory-detail-date">
                        创建于 {selectedItem.createdAt.toLocaleString('zh-CN')}
                      </span>
                      <span className="memory-detail-access">
                        <span className="material-symbols-rounded">visibility</span>
                        访问次数: {selectedItem.accessCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="memory-detail-content">
                    <p>{selectedItem.content}</p>
                  </div>
                  
                  <div className="memory-detail-tags">
                    <h4>标签</h4>
                    <div className="tags-list">
                      {selectedItem.tags.map(tag => (
                        <span key={tag} className="tag-badge">
                          <span className="material-symbols-rounded">tag</span>
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="memory-detail-relations">
                    <h4>关联项</h4>
                    <div className="relations-list">
                      {memoryItems
                        .filter(item => 
                          item.id !== selectedItem.id && 
                          item.tags.some(tag => selectedItem.tags.includes(tag))
                        )
                        .slice(0, 3)
                        .map(item => (
                          <div 
                            key={item.id} 
                            className="relation-item"
                            onClick={() => setSelectedItem(item)}
                          >
                            <span 
                              className={`material-symbols-rounded ${getTypeColor(item.type)}`}
                            >
                              {getTypeIcon(item.type)}
                            </span>
                            <span className="relation-title">{item.title}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Memory;
