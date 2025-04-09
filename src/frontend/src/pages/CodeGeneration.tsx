import React, { useState, useEffect, useRef } from 'react';

interface CodeGenerationOption {
  id: string;
  label: string;
  description: string;
}

interface Framework {
  id: string;
  label: string;
  description: string;
}

interface Architecture {
  id: string;
  label: string;
  description: string;
}

interface GeneratedCode {
  id: string;
  expectationId: string;
  language: string;
  frameworks: string[];
  architecture: string[];
  code: string;
  createdAt: Date;
}

interface ExpectationDetail {
  id: string;
  title: string;
  description?: string;
}

const CodeGeneration: React.FC = () => {
  const [selectedExpectationId, setSelectedExpectationId] = useState<string>('user_management_system');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('typescript');
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedArchitecture, setSelectedArchitecture] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const codeRef = useRef<HTMLPreElement>(null);
  
  const expectations: ExpectationDetail[] = [
    { 
      id: 'user_management_system', 
      title: '用户管理系统',
      description: '一个完整的用户管理系统，提供用户注册、认证、个人资料管理和权限控制。'
    },
    { 
      id: 'payment_processing', 
      title: '支付处理系统',
      description: '安全处理多种支付方式的交易，包括信用卡、电子钱包和银行转账。'
    },
    { 
      id: 'inventory_management', 
      title: '库存管理系统',
      description: '跟踪和管理产品库存，支持库存预警和自动补货功能。'
    },
    { 
      id: 'reporting_dashboard', 
      title: '报表仪表板',
      description: '生成和展示业务关键指标的可视化报表和图表。'
    }
  ];
  
  const languageOptions = [
    { id: 'typescript', label: 'TypeScript' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
    { id: 'csharp', label: 'C#' }
  ];
  
  const frameworkOptions = [
    { id: 'react', label: 'React', description: '用于构建用户界面的JavaScript库' },
    { id: 'angular', label: 'Angular', description: '由Google维护的TypeScript框架' },
    { id: 'vue', label: 'Vue.js', description: '渐进式JavaScript框架' },
    { id: 'express', label: 'Express', description: 'Node.js的Web应用框架' },
    { id: 'nestjs', label: 'NestJS', description: '用于构建高效、可靠的服务器端应用程序的框架' },
    { id: 'django', label: 'Django', description: 'Python高级Web框架，鼓励快速开发和简洁实用的设计' },
    { id: 'flask', label: 'Flask', description: 'Python轻量级Web应用框架' },
    { id: 'spring', label: 'Spring', description: 'Java应用程序开发框架和控制反转容器实现' },
    { id: 'dotnet', label: '.NET Core', description: '微软开发的跨平台开源框架' }
  ];
  
  const architectureOptions = [
    { id: 'mvc', label: 'MVC', description: '模型-视图-控制器架构' },
    { id: 'mvvm', label: 'MVVM', description: '模型-视图-视图模型架构' },
    { id: 'microservices', label: '微服务', description: '将应用程序构建为独立服务的集合' },
    { id: 'serverless', label: '无服务器', description: '构建和运行不需要管理服务器的应用程序' },
    { id: 'hexagonal', label: '六边形架构', description: '也称为端口和适配器架构，关注业务逻辑与外部系统的分离' },
    { id: 'cqrs', label: 'CQRS', description: '命令查询责任分离，将读取和更新操作分开' },
    { id: 'event_sourcing', label: '事件溯源', description: '通过事件序列捕获所有状态变化，而不是存储当前状态' },
    { id: 'clean', label: '清洁架构', description: '强调关注点分离和依赖规则，使系统更易于测试和维护' }
  ];
  
  useEffect(() => {
    setIsCopied(false);
    
    if (generatedCode && codeRef.current) {
      applySyntaxHighlighting(codeRef.current, generatedCode.language);
    }
  }, [generatedCode]);
  
  const applySyntaxHighlighting = (codeElement: HTMLPreElement, language: string) => {
    const codeContent = codeElement.querySelector('code');
    if (!codeContent) return;
    
    const code = codeContent.textContent || '';
    let highlightedCode = '';
    
    if (language === 'typescript' || language === 'javascript') {
      highlightedCode = code
        .replace(/(\/\/.*)/g, '<span class="comment">$1</span>')
        .replace(/('.*?'|".*?")/g, '<span class="string">$1</span>')
        .replace(/\b(const|let|var|function|class|interface|type|enum|export|import|from|return|if|else|for|while|switch|case|break|continue|new|this|super|extends|implements|async|await)\b/g, 
          '<span class="keyword">$1</span>')
        .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="class-name">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    } else if (language === 'python') {
      highlightedCode = code
        .replace(/(#.*)/g, '<span class="comment">$1</span>')
        .replace(/('.*?'|".*?")/g, '<span class="string">$1</span>')
        .replace(/\b(def|class|import|from|as|return|if|elif|else|for|while|break|continue|with|try|except|finally|raise|assert|global|nonlocal|lambda|pass|yield)\b/g, 
          '<span class="keyword">$1</span>')
        .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="class-name">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    } else {
      highlightedCode = code;
    }
    
    codeContent.innerHTML = highlightedCode;
  };
  
  const handleFrameworkChange = (frameworkId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedFrameworks(prev => [...prev, frameworkId]);
    } else {
      setSelectedFrameworks(prev => prev.filter(id => id !== frameworkId));
    }
  };
  
  const handleArchitectureChange = (architectureId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedArchitecture(prev => [...prev, architectureId]);
    } else {
      setSelectedArchitecture(prev => prev.filter(id => id !== architectureId));
    }
  };
  
  const handleGenerateCode = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const newGeneratedCode: GeneratedCode = {
        id: `code-${Date.now()}`,
        expectationId: selectedExpectationId,
        language: selectedLanguage,
        frameworks: selectedFrameworks,
        architecture: selectedArchitecture,
        code: generateSampleCode(
          selectedExpectationId, 
          selectedLanguage, 
          selectedFrameworks, 
          selectedArchitecture
        ),
        createdAt: new Date()
      };
      
      setGeneratedCode(newGeneratedCode);
      setIsGenerating(false);
    }, 2000);
  };
  
  const generateSampleCode = (
    expectationId: string, 
    language: string,
    frameworks: string[],
    architectures: string[]
  ): string => {
    const getArchitectureComments = (architectures: string[], language: string): string => {
      let comments = '';
      const commentPrefix = language === 'python' ? '# ' : '// ';
      
      if (architectures.includes('hexagonal')) {
        comments += `${commentPrefix}使用六边形架构 (端口和适配器)\n`;
        comments += `${commentPrefix}- 领域逻辑位于核心层，完全独立于外部系统\n`;
        comments += `${commentPrefix}- 通过端口（接口）定义与外部系统的交互契约\n`;
        comments += `${commentPrefix}- 适配器实现端口接口，处理外部系统的具体交互\n`;
        comments += `${commentPrefix}- 依赖方向：外部 → 适配器 → 端口 → 领域模型\n\n`;
      }
      
      if (architectures.includes('cqrs')) {
        comments += `${commentPrefix}使用CQRS模式（命令查询责任分离）\n`;
        comments += `${commentPrefix}- 命令模型负责修改数据，处理业务逻辑和状态变更\n`;
        comments += `${commentPrefix}- 查询模型负责读取数据，优化为查询场景\n`;
        comments += `${commentPrefix}- 两个模型可以使用不同的数据存储和表示方式\n`;
        comments += `${commentPrefix}- 通过事件在命令模型和查询模型之间同步数据\n\n`;
      }
      
      if (architectures.includes('event_sourcing')) {
        comments += `${commentPrefix}使用事件溯源模式\n`;
        comments += `${commentPrefix}- 所有状态变化都作为事件序列存储，而非存储当前状态\n`;
        comments += `${commentPrefix}- 通过重放事件序列重建任意时间点的系统状态\n`;
        comments += `${commentPrefix}- 提供完整的审计跟踪和历史记录\n`;
        comments += `${commentPrefix}- 支持时间点回溯和基于事件的业务分析\n\n`;
      }
      
      if (architectures.includes('clean')) {
        comments += `${commentPrefix}使用清洁架构\n`;
        comments += `${commentPrefix}- 依赖规则：内层不依赖外层，依赖指向由外向内\n`;
        comments += `${commentPrefix}- 实体层：包含企业业务规则和核心领域模型\n`;
        comments += `${commentPrefix}- 用例层：包含应用业务规则和特定用例实现\n`;
        comments += `${commentPrefix}- 接口适配器层：转换数据格式，连接外部与内部\n`;
        comments += `${commentPrefix}- 框架和驱动层：处理与外部系统的具体交互\n\n`;
      }
      
      if (architectures.includes('microservices')) {
        comments += `${commentPrefix}使用微服务架构\n`;
        comments += `${commentPrefix}- 按业务能力划分为独立部署的服务\n`;
        comments += `${commentPrefix}- 服务间通过API或消息队列通信\n`;
        comments += `${commentPrefix}- 每个服务有自己的数据存储\n`;
        comments += `${commentPrefix}- 服务可以独立扩展和部署\n\n`;
      }
      
      if (architectures.includes('mvc')) {
        comments += `${commentPrefix}使用MVC架构模式\n`;
        comments += `${commentPrefix}- 模型(Model)：处理数据和业务逻辑\n`;
        comments += `${commentPrefix}- 视图(View)：负责数据展示和用户界面\n`;
        comments += `${commentPrefix}- 控制器(Controller)：处理用户输入并协调模型和视图\n\n`;
      }
      
      return comments;
    };
    
    const archComments = getArchitectureComments(architectures, language);
    
    if (expectationId === 'user_management_system') {
      if (language === 'typescript') {
        if (frameworks.includes('nestjs')) {
          return `${archComments}// 用户管理系统 - TypeScript + NestJS 实现
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<User> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}`;
        } else {
          return `// 用户管理系统 - TypeScript 实现
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

class UserService {
  private users: Map<string, User> = new Map();

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const newUser: User = {
      id,
      ...userData,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(id, newUser);
    return newUser;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | undefined> {
    const user = this.users.get(id);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export default UserService;`;
        }
      } else if (frameworks.includes('react')) {
        return `${archComments}// 用户管理系统 - React 实现`;
      } else {
        return `// ${expectationId} - ${language} 实现示例\n// 这里将根据选择的期望和语言生成相应的代码`;
      }
    } else if (expectationId === 'payment_processing') {
      if (language === 'typescript') {
        return `${archComments}// 支付处理系统 - TypeScript 实现`;
      } else {
        return `// ${expectationId} - ${language} 实现示例\n// 这里将根据选择的期望和语言生成相应的代码`;
      }
    } else {
      return `// ${expectationId} - ${language} 实现示例\n// 这里将根据选择的期望和语言生成相应的代码`;
    }
  };
  
  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode.code)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy code: ', err);
        });
    }
  };

  const handleDownloadCode = () => {
    if (!generatedCode) return;
    
    const expectation = expectations.find(exp => exp.id === generatedCode.expectationId);
    const fileName = `${expectation?.title || generatedCode.expectationId}_${generatedCode.language}`;
    const fileExtension = getFileExtension(generatedCode.language);
    
    const element = document.createElement('a');
    const file = new Blob([generatedCode.code], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${fileName}.${fileExtension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const getFileExtension = (language: string): string => {
    switch (language) {
      case 'typescript': return 'ts';
      case 'javascript': return 'js';
      case 'python': return 'py';
      case 'java': return 'java';
      case 'csharp': return 'cs';
      default: return 'txt';
    }
  };
  
  return (
    <div className="code-generation-page content-area">
      <div className="section-header">
        <h2>代码生成</h2>
        <div className="section-actions">
          <button className="secondary-button">
            <span className="material-symbols-rounded">history</span>
            <span>历史记录</span>
          </button>
        </div>
      </div>
      
      <div className="code-generation-container">
        <div className="code-options">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">生成选项</h3>
            </div>
            <div className="card-content">
              <div className="option-group">
                <label>选择期望</label>
                <select 
                  value={selectedExpectationId}
                  onChange={(e) => setSelectedExpectationId(e.target.value)}
                  className="select-input"
                >
                  {expectations.map(exp => (
                    <option key={exp.id} value={exp.id}>{exp.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="option-group">
                <label>编程语言</label>
                <div className="radio-options">
                  {languageOptions.map(option => (
                    <div key={option.id} className="radio-option">
                      <input 
                        type="radio" 
                        id={`lang-${option.id}`} 
                        name="language"
                        value={option.id}
                        checked={selectedLanguage === option.id}
                        onChange={() => setSelectedLanguage(option.id)}
                      />
                      <label htmlFor={`lang-${option.id}`}>{option.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="option-group">
                <label>框架选择</label>
                <div className="checkbox-options">
                  {frameworkOptions.map(option => (
                    <div key={option.id} className="checkbox-option">
                      <input 
                        type="checkbox" 
                        id={`framework-${option.id}`} 
                        name="frameworks"
                        value={option.id}
                        checked={selectedFrameworks.includes(option.id)}
                        onChange={(e) => handleFrameworkChange(option.id, e.target.checked)}
                      />
                      <label htmlFor={`framework-${option.id}`}>
                        <span className="option-label">{option.label}</span>
                        <span className="option-description">{option.description}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="option-group">
                <label>架构模式</label>
                <div className="checkbox-options">
                  {architectureOptions.map(option => (
                    <div key={option.id} className="checkbox-option">
                      <input 
                        type="checkbox" 
                        id={`arch-${option.id}`} 
                        name="architecture"
                        value={option.id}
                        checked={selectedArchitecture.includes(option.id)}
                        onChange={(e) => handleArchitectureChange(option.id, e.target.checked)}
                      />
                      <label htmlFor={`arch-${option.id}`}>
                        <span className="option-label">{option.label}</span>
                        <span className="option-description">{option.description}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="option-actions">
                <button 
                  className="primary-button generate-button"
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="loading-spinner"></span>
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded">code</span>
                      <span>生成代码</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="code-preview">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">代码预览</h3>
              {generatedCode && (
                <div className="card-actions">
                  <button 
                    className="secondary-button"
                    onClick={handleCopyCode}
                  >
                    {isCopied ? (
                      <>
                        <span className="material-symbols-rounded">check</span>
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-rounded">content_copy</span>
                        <span>复制代码</span>
                      </>
                    )}
                  </button>
                  <button 
                    className="secondary-button"
                    onClick={handleDownloadCode}
                  >
                    <span className="material-symbols-rounded">download</span>
                    <span>下载代码</span>
                  </button>
                </div>
              )}
            </div>
            <div className="card-content">
              {generatedCode ? (
                <div className="code-container">
                  <div className="code-header">
                    <div className="code-language">
                      <span className="language-badge">{generatedCode.language}</span>
                      {generatedCode.frameworks.map(fw => (
                        <span key={fw} className="framework-badge">{fw}</span>
                      ))}
                    </div>
                    <div className="code-info">
                      <span className="code-timestamp">{generatedCode.createdAt.toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                  <pre ref={codeRef} className={`code-block language-${generatedCode.language}`}>
                    <code>{generatedCode.code}</code>
                  </pre>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="material-symbols-rounded">code</span>
                  <p>选择期望和选项，然后点击"生成代码"按钮</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeGeneration;
