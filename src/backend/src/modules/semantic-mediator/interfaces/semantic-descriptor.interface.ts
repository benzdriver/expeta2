/**
 * 语义描述符接口
 * 用于描述数据源的语义特性
 */
export interface SemanticDescriptor {
  /**
   * 实体类型
   */
  entity: string;
  
  /**
   * 实体描述
   */
  description: string;
  
  /**
   * 属性定义
   */
  attributes: {
    [key: string]: {
      type: string;
      description: string;
      format?: string;
      constraints?: string[];
    };
  };
  
  /**
   * 支持的能力
   */
  capabilities?: string[];
  
  /**
   * 语义向量（可选）
   */
  vector?: number[];
  
  /**
   * 元数据（可选）
   */
  metadata?: Record<string, any>;
}
