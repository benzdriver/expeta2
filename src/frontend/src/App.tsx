import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ExpetaProvider } from './contexts/ExpetaContext';
import Sidebar from './components/common/Sidebar';
import TopBar from './components/common/TopBar';
import Dashboard from './pages/Dashboard';
import Requirements from './pages/Requirements';
import Expectations from './pages/Expectations';
import CodeGeneration from './pages/CodeGeneration';
import Validation from './pages/Validation';
import Memory from './pages/Memory';
import Integration from './pages/Integration';
import Settings from './pages/Settings';
import './styles/global.css';

const RouteWrapper = ({ 
  Component, 
  pageId, 
  setCurrentPage 
}: { 
  Component: React.ComponentType, 
  pageId: string, 
  setCurrentPage: (id: string) => void 
}) => {
  useEffect(() => {
    setCurrentPage(pageId);
  }, [pageId, setCurrentPage]);

  return <Component />;
};

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setCurrentPage('dashboard');
    } else {
      const pageId = path.substring(1);
      setCurrentPage(pageId);
    }
  }, [location]);

  const handlePageChange = (pageId: string) => {
    navigate(pageId === 'dashboard' ? '/' : `/${pageId}`);
  };

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
      <main className="main-content">
        <TopBar pageTitle={getPageTitle(currentPage)} />
        <Routes>
          <Route path="/" element={
            <RouteWrapper Component={Dashboard} pageId="dashboard" setCurrentPage={setCurrentPage} />
          } />
          <Route path="/requirements" element={
            <RouteWrapper Component={Requirements} pageId="requirements" setCurrentPage={setCurrentPage} />
          } />
          <Route path="/expectations" element={
            <RouteWrapper Component={Expectations} pageId="expectations" setCurrentPage={setCurrentPage} />
          } />
          <Route path="/code-generation" element={
            <RouteWrapper Component={CodeGeneration} pageId="code-generation" setCurrentPage={setCurrentPage} />
          } />
          <Route path="/validation" element={
            <RouteWrapper Component={Validation} pageId="validation" setCurrentPage={setCurrentPage} />
          } />
          <Route path="/memory" element={
            <RouteWrapper Component={Memory} pageId="memory" setCurrentPage={setCurrentPage} />
          } />
          <Route path="/integration" element={
            <RouteWrapper Component={Integration} pageId="integration" setCurrentPage={setCurrentPage} />
          } />
          <Route path="/settings" element={
            <RouteWrapper Component={Settings} pageId="settings" setCurrentPage={setCurrentPage} />
          } />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ExpetaProvider>
      <Router>
        <AppContent />
      </Router>
    </ExpetaProvider>
  );
};

const getPageTitle = (pageId: string): string => {
  const pageTitles: Record<string, string> = {
    'dashboard': '仪表盘',
    'requirements': '需求管理',
    'expectations': '期望管理',
    'code-generation': '代码生成',
    'validation': '验证结果',
    'memory': '记忆系统',
    'integration': '语义集成',
    'settings': '系统设置'
  };
  
  return pageTitles[pageId] || '仪表盘';
};

export default App;
