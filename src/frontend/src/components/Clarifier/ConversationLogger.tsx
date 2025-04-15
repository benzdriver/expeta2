import React, { useState, useEffect, useCallback } from 'react';
import loggingService, { LogEntry, LogLevel, SessionLog } from '../../services/logging.service';
import './ConversationLogger.css';

interface ConversationLoggerProps {
  sessionId?: string;
  visible?: boolean;
  onClose?: () => void;
}

const ConversationLogger: React.FC<ConversationLoggerProps> = ({
  sessionId,
  visible = false,
  onClose
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'session'>('general');
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(sessionId);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [filterModule, setFilterModule] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const refreshLogs = useCallback(() => {
    if (activeTab === 'general') {
      const allLogs = loggingService.getLogs();
      const filteredLogs = allLogs.filter(log => {
        if (filterLevel !== 'all' && log.level !== filterLevel) return false;
        if (filterModule && !log.module.includes(filterModule)) return false;
        return true;
      });
      setLogs(filteredLogs);
    } else {
      const allSessionLogs = loggingService.getAllSessionLogs();
      setSessionLogs(allSessionLogs);
      
      if (activeSessionId) {
        const sessionLog = loggingService.getSessionLog(activeSessionId);
        if (sessionLog) {
          const filteredLogs = sessionLog.logs.filter(log => {
            if (filterLevel !== 'all' && log.level !== filterLevel) return false;
            if (filterModule && !log.module.includes(filterModule)) return false;
            return true;
          });
          setLogs(filteredLogs);
        }
      }
    }
  }, [activeTab, activeSessionId, filterLevel, filterModule]);
  
  useEffect(() => {
    if (visible && autoRefresh) {
      const interval = setInterval(() => {
        refreshLogs();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [visible, autoRefresh, refreshLogs]);

  useEffect(() => {
    if (visible) {
      refreshLogs();
    }
  }, [visible, activeTab, activeSessionId, filterLevel, filterModule, refreshLogs]);

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId]);

  const handleTabChange = (tab: 'general' | 'session') => {
    setActiveTab(tab);
  };

  const handleSessionSelect = (id: string) => {
    setActiveSessionId(id);
  };

  const handleLevelFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterLevel(e.target.value as LogLevel | 'all');
  };

  const handleModuleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterModule(e.target.value);
  };

  const handleClearLogs = () => {
    if (activeTab === 'general') {
      loggingService.clearLogs();
    } else if (activeSessionId) {
      loggingService.clearSessionLog(activeSessionId);
    }
    refreshLogs();
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const getLogLevelClass = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return 'log-level-debug';
      case LogLevel.INFO:
        return 'log-level-info';
      case LogLevel.WARN:
        return 'log-level-warn';
      case LogLevel.ERROR:
        return 'log-level-error';
      default:
        return '';
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!visible) return null;

  return (
    <div className="conversation-logger">
      <div className="logger-header">
        <h3>会话日志查看器</h3>
        <div className="logger-controls">
          <div className="tab-controls">
            <button
              className={activeTab === 'general' ? 'active' : ''}
              onClick={() => handleTabChange('general')}
            >
              全局日志
            </button>
            <button
              className={activeTab === 'session' ? 'active' : ''}
              onClick={() => handleTabChange('session')}
            >
              会话日志
            </button>
          </div>
          <div className="filter-controls">
            <select value={filterLevel} onChange={handleLevelFilterChange}>
              <option value="all">所有级别</option>
              <option value={LogLevel.DEBUG}>调试</option>
              <option value={LogLevel.INFO}>信息</option>
              <option value={LogLevel.WARN}>警告</option>
              <option value={LogLevel.ERROR}>错误</option>
            </select>
            <input
              type="text"
              placeholder="按模块筛选"
              value={filterModule}
              onChange={handleModuleFilterChange}
            />
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
              />
              自动刷新
            </label>
            <button onClick={refreshLogs}>刷新</button>
            <button onClick={handleClearLogs}>清除</button>
            <button onClick={handleClose}>关闭</button>
          </div>
        </div>
      </div>

      <div className="logger-content">
        {activeTab === 'session' && (
          <div className="session-list">
            <h4>会话列表</h4>
            <ul>
              {sessionLogs.map(session => (
                <li
                  key={session.sessionId}
                  className={activeSessionId === session.sessionId ? 'active' : ''}
                  onClick={() => handleSessionSelect(session.sessionId)}
                >
                  <span>{session.sessionId}</span>
                  <span>{formatTimestamp(session.startTime)}</span>
                  <span>{session.messages.length} 消息</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="log-entries">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>级别</th>
                <th>模块</th>
                <th>消息</th>
                <th>数据</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-logs">
                    没有符合条件的日志记录
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={index} className={getLogLevelClass(log.level)}>
                    <td>{formatTimestamp(log.timestamp)}</td>
                    <td>{log.level.toUpperCase()}</td>
                    <td>{log.module}</td>
                    <td>{log.message}</td>
                    <td>
                      {log.data && (
                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConversationLogger;
