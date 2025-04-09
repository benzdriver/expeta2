import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-page content-area">
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-symbols-rounded">description</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">24</div>
              <div className="stat-label">活跃需求</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-symbols-rounded">format_list_bulleted</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">86</div>
              <div className="stat-label">期望总数</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-symbols-rounded">code</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">42</div>
              <div className="stat-label">生成代码</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <span className="material-symbols-rounded">verified</span>
            </div>
            <div className="stat-content">
              <div className="stat-value">38</div>
              <div className="stat-label">验证通过</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="recent-activities-section">
        <div className="section-header">
          <h2>最近活动</h2>
          <div className="section-actions">
            <button className="secondary-button">
              <span className="material-symbols-rounded">filter_list</span>
              <span>筛选</span>
            </button>
          </div>
        </div>
        <div className="activities-list">
          <div className="card">
            <div className="card-content">
              <div className="activity-item">
                <div className="activity-icon">
                  <span className="material-symbols-rounded">description</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">新需求已创建</div>
                  <div className="activity-description">电子商务平台用户管理系统</div>
                  <div className="activity-time">今天 14:30</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">
                  <span className="material-symbols-rounded">format_list_bulleted</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">期望已更新</div>
                  <div className="activity-description">支付处理系统 - 添加了新的安全要求</div>
                  <div className="activity-time">今天 11:45</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">
                  <span className="material-symbols-rounded">code</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">代码已生成</div>
                  <div className="activity-description">用户认证模块 - 生成了5个文件</div>
                  <div className="activity-time">昨天 16:20</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">
                  <span className="material-symbols-rounded">verified</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">验证已完成</div>
                  <div className="activity-description">数据库连接模块 - 通过率92%</div>
                  <div className="activity-time">昨天 15:10</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">
                  <span className="material-symbols-rounded">settings</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">系统设置已更新</div>
                  <div className="activity-description">更新了LLM配置参数</div>
                  <div className="activity-time">2天前</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
