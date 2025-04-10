import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

/**
 * 优化代码DTO
 * 用于接收代码优化请求
 */
export class OptimizeCodeDto {
  /**
   * 代码ID
   */
  @IsString()
  @IsNotEmpty()
  codeId: string;

  /**
   * 语义反馈
   * 包含对代码的语义分析和改进建议
   */
  @IsObject()
  @IsNotEmpty()
  semanticFeedback: Record<string, any>;

  /**
   * 优化选项
   * 可选的优化配置参数
   */
  @IsObject()
  @IsOptional()
  options?: Record<string, any>;
}
