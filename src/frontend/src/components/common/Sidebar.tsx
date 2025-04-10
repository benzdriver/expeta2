import React from 'react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (pageId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: 'dashboard' },
    { id: 'requirements', label: '需求管理', icon: 'description' },
    { id: 'expectations', label: '期望管理', icon: 'format_list_bulleted' },
    { id: 'code-generation', label: '代码生成', icon: 'code' },
    { id: 'validation', label: '验证结果', icon: 'verified' },
    { id: 'memory', label: '记忆系统', icon: 'database' },
    { id: 'integration', label: '语义集成', icon: 'integration_instructions' },
    { id: 'settings', label: '系统设置', icon: 'settings' }
  ];

  const handleNavClick = (pageId: string, e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange(pageId);
  };

  return (
    <nav className="sidebar">
      <div className="logo">
        <span className="logo-icon">E</span>
        <span className="logo-text">Expeta 2.0</span>
      </div>
      <ul className="nav-links">
        {navItems.map(item => (
          <li 
            key={item.id} 
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
          >
            <a 
              href={`#${item.id}`} 
              onClick={(e) => handleNavClick(item.id, e)}
            >
              <span className="material-symbols-rounded">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="user-info">
        <div className="user-avatar">
          <span className="material-symbols-rounded">person</span>
        </div>
        <div className="user-details">
          <span className="user-name">张明</span>
          <span className="user-role">系统管理员</span>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
