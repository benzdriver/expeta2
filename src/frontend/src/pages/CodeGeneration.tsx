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
    { id: 'nestjs', label: 'NestJS', description: '用于构建高效、可靠的服务器端应用程序的框架' }
  ];
  
  const architectureOptions = [
    { id: 'mvc', label: 'MVC', description: '模型-视图-控制器架构' },
    { id: 'mvvm', label: 'MVVM', description: '模型-视图-视图模型架构' },
    { id: 'microservices', label: '微服务', description: '将应用程序构建为独立服务的集合' },
    { id: 'serverless', label: '无服务器', description: '构建和运行不需要管理服务器的应用程序' }
  ];
  
  useEffect(() => {
    setIsCopied(false);
  }, [generatedCode]);
  
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
    if (expectationId === 'user_management_system' && language === 'typescript') {
      if (frameworks.includes('nestjs')) {
        return `// 用户管理系统 - TypeScript + NestJS 实现
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
    } else if (expectationId === 'payment_processing' && language === 'typescript') {
      return `// 支付处理系统 - TypeScript 实现
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentGatewayService } from './payment-gateway.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private paymentGatewayService: PaymentGatewayService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const newPayment = new this.paymentModel({
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
      createdAt: new Date(),
    });

    const savedPayment = await newPayment.save();
    
    try {
      const paymentResult = await this.processPayment(savedPayment);
      
      savedPayment.status = paymentResult.success 
        ? PaymentStatus.COMPLETED 
        : PaymentStatus.FAILED;
      savedPayment.transactionId = paymentResult.transactionId;
      savedPayment.errorMessage = paymentResult.errorMessage;
      
      return savedPayment.save();
    } catch (error) {
      savedPayment.status = PaymentStatus.FAILED;
      savedPayment.errorMessage = error.message;
      return savedPayment.save();
    }
  }

  private async processPayment(payment: Payment): Promise<{
    success: boolean;
    transactionId?: string;
    errorMessage?: string;
  }> {
    switch (payment.method) {
      case PaymentMethod.CREDIT_CARD:
        return this.paymentGatewayService.processCreditCardPayment(
          payment.amount,
          payment.currency,
          payment.cardDetails,
        );
      
      case PaymentMethod.BANK_TRANSFER:
        return this.paymentGatewayService.processBankTransferPayment(
          payment.amount,
          payment.currency,
          payment.bankDetails,
        );
      
      case PaymentMethod.DIGITAL_WALLET:
        return this.paymentGatewayService.processDigitalWalletPayment(
          payment.amount,
          payment.currency,
          payment.walletDetails,
        );
      
      default:
        throw new Error('不支持的支付方式');
    }
  }
}`;
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
              <h3 className="card-title">生成的代码</h3>
              {generatedCode && (
                <div className="card-actions">
                  <button 
                    className="secondary-button"
                    onClick={handleCopyCode}
                  >
                    <span className="material-symbols-rounded">
                      {isCopied ? 'check' : 'content_copy'}
                    </span>
                    <span>{isCopied ? '已复制' : '复制'}</span>
                  </button>
                  <button 
                    className="secondary-button"
                    onClick={handleDownloadCode}
                  >
                    <span className="material-symbols-rounded">download</span>
                    <span>下载</span>
                  </button>
                </div>
              )}
            </div>
            <div className="card-content">
              {generatedCode ? (
                <div className="code-container">
                  <pre className="code-block">
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
