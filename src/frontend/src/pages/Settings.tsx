import React, { useState } from 'react';

interface LLMConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

interface SystemSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  notifications: boolean;
  autoSave: boolean;
  debugMode: boolean;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('general');
  
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    apiKey: '****************************************'
  });
  
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    theme: 'light',
    language: 'zh-CN',
    notifications: true,
    autoSave: true,
    debugMode: false
  });
  
  const handleLlmConfigChange = (field: keyof LLMConfig, value: any) => {
    setLlmConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSystemSettingsChange = (field: keyof SystemSettings, value: any) => {
    setSystemSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSaveSettings = () => {
    console.log('Saving settings:', { llmConfig, systemSettings });
    alert('设置已保存');
  };
  
  return (
    <div className="settings-page content-area">
      <div className="section-header">
        <h2>系统设置</h2>
        <div className="section-actions">
          <button className="primary-button" onClick={handleSaveSettings}>
            <span className="material-symbols-rounded">save</span>
            <span>保存设置</span>
          </button>
        </div>
      </div>
      
      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="settings-tabs">
            <div 
              className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <span className="material-symbols-rounded">settings</span>
              <span>通用设置</span>
            </div>
            <div 
              className={`settings-tab ${activeTab === 'llm' ? 'active' : ''}`}
              onClick={() => setActiveTab('llm')}
            >
              <span className="material-symbols-rounded">smart_toy</span>
              <span>LLM配置</span>
            </div>
            <div 
              className={`settings-tab ${activeTab === 'modules' ? 'active' : ''}`}
              onClick={() => setActiveTab('modules')}
            >
              <span className="material-symbols-rounded">extension</span>
              <span>模块设置</span>
            </div>
            <div 
              className={`settings-tab ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
            >
              <span className="material-symbols-rounded">database</span>
              <span>数据库设置</span>
            </div>
            <div 
              className={`settings-tab ${activeTab === 'backup' ? 'active' : ''}`}
              onClick={() => setActiveTab('backup')}
            >
              <span className="material-symbols-rounded">backup</span>
              <span>备份与恢复</span>
            </div>
            <div 
              className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <span className="material-symbols-rounded">info</span>
              <span>关于系统</span>
            </div>
          </div>
        </div>
        
        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-panel">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">通用设置</h3>
                </div>
                <div className="card-content">
                  <div className="settings-group">
                    <label>界面主题</label>
                    <div className="radio-options">
                      <div className="radio-option">
                        <input 
                          type="radio" 
                          id="theme-light" 
                          name="theme"
                          checked={systemSettings.theme === 'light'}
                          onChange={() => handleSystemSettingsChange('theme', 'light')}
                        />
                        <label htmlFor="theme-light">浅色</label>
                      </div>
                      <div className="radio-option">
                        <input 
                          type="radio" 
                          id="theme-dark" 
                          name="theme"
                          checked={systemSettings.theme === 'dark'}
                          onChange={() => handleSystemSettingsChange('theme', 'dark')}
                        />
                        <label htmlFor="theme-dark">深色</label>
                      </div>
                      <div className="radio-option">
                        <input 
                          type="radio" 
                          id="theme-system" 
                          name="theme"
                          checked={systemSettings.theme === 'system'}
                          onChange={() => handleSystemSettingsChange('theme', 'system')}
                        />
                        <label htmlFor="theme-system">跟随系统</label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="settings-group">
                    <label>系统语言</label>
                    <select 
                      value={systemSettings.language}
                      onChange={(e) => handleSystemSettingsChange('language', e.target.value)}
                      className="select-input"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </div>
                  
                  <div className="settings-group">
                    <label>通知设置</label>
                    <div className="toggle-option">
                      <input 
                        type="checkbox" 
                        id="notifications" 
                        checked={systemSettings.notifications}
                        onChange={(e) => handleSystemSettingsChange('notifications', e.target.checked)}
                      />
                      <label htmlFor="notifications">启用系统通知</label>
                    </div>
                  </div>
                  
                  <div className="settings-group">
                    <label>自动保存</label>
                    <div className="toggle-option">
                      <input 
                        type="checkbox" 
                        id="autoSave" 
                        checked={systemSettings.autoSave}
                        onChange={(e) => handleSystemSettingsChange('autoSave', e.target.checked)}
                      />
                      <label htmlFor="autoSave">自动保存更改</label>
                    </div>
                  </div>
                  
                  <div className="settings-group">
                    <label>调试模式</label>
                    <div className="toggle-option">
                      <input 
                        type="checkbox" 
                        id="debugMode" 
                        checked={systemSettings.debugMode}
                        onChange={(e) => handleSystemSettingsChange('debugMode', e.target.checked)}
                      />
                      <label htmlFor="debugMode">启用调试模式</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'llm' && (
            <div className="settings-panel">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">LLM配置</h3>
                </div>
                <div className="card-content">
                  <div className="settings-group">
                    <label>LLM提供商</label>
                    <select 
                      value={llmConfig.provider}
                      onChange={(e) => handleLlmConfigChange('provider', e.target.value)}
                      className="select-input"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google AI</option>
                      <option value="local">本地模型</option>
                    </select>
                  </div>
                  
                  <div className="settings-group">
                    <label>模型选择</label>
                    <select 
                      value={llmConfig.model}
                      onChange={(e) => handleLlmConfigChange('model', e.target.value)}
                      className="select-input"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3">Claude 3</option>
                    </select>
                  </div>
                  
                  <div className="settings-group">
                    <label>温度 ({llmConfig.temperature})</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1"
                      value={llmConfig.temperature}
                      onChange={(e) => handleLlmConfigChange('temperature', parseFloat(e.target.value))}
                      className="range-input"
                    />
                    <div className="range-labels">
                      <span>确定性高</span>
                      <span>创造性高</span>
                    </div>
                  </div>
                  
                  <div className="settings-group">
                    <label>最大令牌数</label>
                    <input 
                      type="number" 
                      value={llmConfig.maxTokens}
                      onChange={(e) => handleLlmConfigChange('maxTokens', parseInt(e.target.value))}
                      className="number-input"
                      min="1"
                      max="8192"
                    />
                  </div>
                  
                  <div className="settings-group">
                    <label>API密钥</label>
                    <div className="api-key-input">
                      <input 
                        type="password" 
                        value={llmConfig.apiKey}
                        onChange={(e) => handleLlmConfigChange('apiKey', e.target.value)}
                        className="text-input"
                      />
                      <button className="secondary-button">
                        <span className="material-symbols-rounded">visibility</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="settings-group">
                    <button className="secondary-button">
                      <span className="material-symbols-rounded">sync</span>
                      <span>测试连接</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'modules' && (
            <div className="settings-panel">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">模块设置</h3>
                </div>
                <div className="card-content">
                  <div className="module-settings">
                    <div className="module-item">
                      <div className="module-header">
                        <span className="module-icon">
                          <span className="material-symbols-rounded">chat</span>
                        </span>
                        <h4 className="module-title">Clarifier模块</h4>
                        <div className="module-toggle">
                          <input type="checkbox" id="clarifier-enabled" checked />
                          <label htmlFor="clarifier-enabled"></label>
                        </div>
                      </div>
                      <div className="module-settings-content">
                        <div className="settings-group">
                          <label>对话轮次限制</label>
                          <input type="number" className="number-input" value="10" min="1" max="20" />
                        </div>
                        <div className="settings-group">
                          <label>问题生成策略</label>
                          <select className="select-input">
                            <option value="context">上下文感知</option>
                            <option value="template">模板驱动</option>
                            <option value="hybrid">混合策略</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="module-item">
                      <div className="module-header">
                        <span className="module-icon">
                          <span className="material-symbols-rounded">code</span>
                        </span>
                        <h4 className="module-title">Generator模块</h4>
                        <div className="module-toggle">
                          <input type="checkbox" id="generator-enabled" checked />
                          <label htmlFor="generator-enabled"></label>
                        </div>
                      </div>
                      <div className="module-settings-content">
                        <div className="settings-group">
                          <label>代码生成模型</label>
                          <select className="select-input">
                            <option value="gpt-4">GPT-4</option>
                            <option value="codellama">Code Llama</option>
                            <option value="custom">自定义模型</option>
                          </select>
                        </div>
                        <div className="settings-group">
                          <label>代码格式化</label>
                          <div className="toggle-option">
                            <input type="checkbox" id="code-formatting" checked />
                            <label htmlFor="code-formatting">自动格式化生成的代码</label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="module-item">
                      <div className="module-header">
                        <span className="module-icon">
                          <span className="material-symbols-rounded">verified</span>
                        </span>
                        <h4 className="module-title">Validator模块</h4>
                        <div className="module-toggle">
                          <input type="checkbox" id="validator-enabled" checked />
                          <label htmlFor="validator-enabled"></label>
                        </div>
                      </div>
                      <div className="module-settings-content">
                        <div className="settings-group">
                          <label>验证策略</label>
                          <select className="select-input">
                            <option value="semantic">语义验证</option>
                            <option value="functional">功能验证</option>
                            <option value="combined">综合验证</option>
                          </select>
                        </div>
                        <div className="settings-group">
                          <label>验证阈值</label>
                          <input type="range" className="range-input" value="80" min="0" max="100" />
                          <div className="range-value">80%</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="module-item">
                      <div className="module-header">
                        <span className="module-icon">
                          <span className="material-symbols-rounded">database</span>
                        </span>
                        <h4 className="module-title">Memory模块</h4>
                        <div className="module-toggle">
                          <input type="checkbox" id="memory-enabled" checked />
                          <label htmlFor="memory-enabled"></label>
                        </div>
                      </div>
                      <div className="module-settings-content">
                        <div className="settings-group">
                          <label>存储策略</label>
                          <select className="select-input">
                            <option value="all">存储所有内容</option>
                            <option value="important">仅存储重要内容</option>
                            <option value="custom">自定义策略</option>
                          </select>
                        </div>
                        <div className="settings-group">
                          <label>记忆清理</label>
                          <div className="toggle-option">
                            <input type="checkbox" id="memory-cleanup" checked />
                            <label htmlFor="memory-cleanup">自动清理过期记忆</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'database' && (
            <div className="settings-panel">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">数据库设置</h3>
                </div>
                <div className="card-content">
                  <div className="settings-group">
                    <label>数据库类型</label>
                    <select className="select-input">
                      <option value="mongodb">MongoDB</option>
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                    </select>
                  </div>
                  
                  <div className="settings-group">
                    <label>连接URL</label>
                    <input type="text" className="text-input" value="mongodb://localhost:27017/expeta" />
                  </div>
                  
                  <div className="settings-group">
                    <label>用户名</label>
                    <input type="text" className="text-input" value="expeta_user" />
                  </div>
                  
                  <div className="settings-group">
                    <label>密码</label>
                    <input type="password" className="text-input" value="********" />
                  </div>
                  
                  <div className="settings-group">
                    <div className="settings-actions">
                      <button className="secondary-button">
                        <span className="material-symbols-rounded">sync</span>
                        <span>测试连接</span>
                      </button>
                      <button className="secondary-button">
                        <span className="material-symbols-rounded">delete</span>
                        <span>清空数据库</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'backup' && (
            <div className="settings-panel">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">备份与恢复</h3>
                </div>
                <div className="card-content">
                  <div className="settings-group">
                    <label>自动备份</label>
                    <div className="toggle-option">
                      <input type="checkbox" id="auto-backup" checked />
                      <label htmlFor="auto-backup">启用自动备份</label>
                    </div>
                  </div>
                  
                  <div className="settings-group">
                    <label>备份频率</label>
                    <select className="select-input">
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                  </div>
                  
                  <div className="settings-group">
                    <label>备份保留时间</label>
                    <select className="select-input">
                      <option value="7">7天</option>
                      <option value="30">30天</option>
                      <option value="90">90天</option>
                      <option value="365">365天</option>
                    </select>
                  </div>
                  
                  <div className="settings-group">
                    <label>备份存储位置</label>
                    <input type="text" className="text-input" value="/var/backups/expeta" />
                  </div>
                  
                  <div className="settings-group">
                    <div className="settings-actions">
                      <button className="secondary-button">
                        <span className="material-symbols-rounded">backup</span>
                        <span>立即备份</span>
                      </button>
                      <button className="secondary-button">
                        <span className="material-symbols-rounded">restore</span>
                        <span>从备份恢复</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'about' && (
            <div className="settings-panel">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">关于系统</h3>
                </div>
                <div className="card-content">
                  <div className="about-system">
                    <div className="system-logo">
                      <span className="logo-icon">E</span>
                      <span className="logo-text">Expeta 2.0</span>
                    </div>
                    
                    <div className="system-info">
                      <div className="info-item">
                        <div className="info-label">版本</div>
                        <div className="info-value">2.0.0</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">构建日期</div>
                        <div className="info-value">2025-04-09</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">许可证</div>
                        <div className="info-value">专有软件</div>
                      </div>
                    </div>
                    
                    <div className="system-description">
                      <p>Expeta 2.0是一个语义驱动的软件架构系统，通过模块化、语义感知的过程将需求转化为代码。</p>
                    </div>
                    
                    <div className="system-actions">
                      <button className="secondary-button">
                        <span className="material-symbols-rounded">help</span>
                        <span>帮助文档</span>
                      </button>
                      <button className="secondary-button">
                        <span className="material-symbols-rounded">update</span>
                        <span>检查更新</span>
                      </button>
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

export default Settings;
