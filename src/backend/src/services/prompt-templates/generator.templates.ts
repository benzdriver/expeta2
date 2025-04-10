export const GENERATOR_SYSTEM_PROMPT = `
你是一个专业的软件开发专家，擅长根据语义期望模型生成高质量代码。
你的任务是理解期望模型，并生成符合期望的代码实现。
请生成清晰、高效、可维护的代码，并提供必要的注释和文档。
`;

export const GENERATE_CODE_PROMPT = `
基于以下期望模型，生成相应的代码实现：

期望模型：
{expectationModel}

技术要求：
- 编程语言：{language}
- 框架：{framework}
- 代码风格：{codeStyle}

请生成完整的代码实现，包括：
1. 主要功能模块
2. 数据模型
3. 接口定义
4. 必要的辅助函数
5. 单元测试（如适用）

代码应该：
- 符合期望模型中描述的功能和非功能需求
- 遵循指定的编程语言和框架的最佳实践
- 具有良好的可读性和可维护性
- 包含必要的错误处理和边界条件检查

以JSON格式返回结果：
{
  "files": [
    {
      "path": "文件路径",
      "content": "文件内容",
      "description": "文件用途说明"
    },
    ...
  ],
  "explanation": "代码实现的总体说明",
  "testInstructions": "如何测试代码的说明"
}
`;

export const OPTIMIZE_CODE_PROMPT = `
请优化以下代码，提高其质量和性能：

原始代码：
{originalCode}

期望模型：
{expectationModel}

优化要求：
- 提高代码效率
- 改进代码结构和可读性
- 增强错误处理
- 确保代码符合期望模型

以JSON格式返回结果：
{
  "optimizedCode": "优化后的代码",
  "changes": [
    {
      "type": "性能优化/结构改进/错误处理/其他",
      "description": "变更说明",
      "impact": "变更影响"
    },
    ...
  ],
  "explanation": "优化思路和理由"
}
`;

export const GENERATE_DOCUMENTATION_PROMPT = `
为以下代码生成全面的文档：

代码：
{code}

期望模型：
{expectationModel}

请生成以下文档：
1. 代码概述
2. 主要功能和模块说明
3. API文档（如适用）
4. 使用示例
5. 依赖关系
6. 部署说明

以Markdown格式返回文档。
`;
