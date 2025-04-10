export const GENERATOR_SYSTEM_PROMPT = `
你是一个专业的软件开发专家，擅长根据语义期望模型生成高质量代码。
你的任务是理解期望模型，并生成符合期望的代码实现。
请生成清晰、高效、可维护的代码，并提供必要的注释和文档。
你应该考虑代码的可扩展性、可测试性和安全性，确保代码符合现代软件工程最佳实践。
在生成代码时，你应该考虑系统的整体架构，确保各个组件之间的接口清晰、一致。
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
      "description": "文件用途说明",
      "language": "编程语言"
    },
    ...
  ],
  "explanation": "代码实现的总体说明",
  "testInstructions": "如何测试代码的说明",
  "dependencies": ["依赖项1", "依赖项2", ...],
  "architectureNotes": "架构设计说明"
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
- 应用适当的设计模式
- 优化算法和数据结构
- 减少代码重复
- 提高可测试性

以JSON格式返回结果：
{
  "files": [
    {
      "path": "文件路径",
      "originalContent": "原始内容摘要",
      "optimizedContent": "优化后内容",
      "language": "编程语言"
    },
    ...
  ],
  "changes": [
    {
      "type": "性能优化/结构改进/错误处理/设计模式应用/其他",
      "description": "变更说明",
      "impact": "变更影响",
      "beforeAfterComparison": "变更前后对比"
    },
    ...
  ],
  "explanation": "优化思路和理由",
  "performanceImpact": "性能影响评估",
  "maintainabilityImpact": "可维护性影响评估"
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
7. 架构图（文本描述）
8. 数据流说明
9. 安全考虑
10. 性能优化建议
11. 扩展点说明

以Markdown格式返回文档，包含以下部分：

## 概述
[代码的总体描述和目的]

## 架构
[架构描述，包括组件关系和数据流]

## 主要功能
[主要功能列表和说明]

## API文档
[API接口说明，包括参数、返回值和示例]

## 使用示例
[代码使用示例]

## 部署指南
[部署步骤和环境要求]

## 安全考虑
[安全相关的注意事项和最佳实践]

## 性能优化
[性能优化建议]

## 扩展指南
[如何扩展代码的说明]
`;

export const GENERATE_CODE_WITH_SEMANTIC_INPUT_PROMPT = `
请根据以下期望模型和语义分析结果生成代码：

期望模型：
{expectationModel}

语义分析结果：
{semanticAnalysis}

生成选项：
{options}

请生成完整的代码实现，包括必要的类、函数、接口等。
返回JSON格式，包含以下字段：
- files: 数组，每个元素包含以下字段：
  - path: 文件路径
  - content: 文件内容
  - language: 编程语言
  - role: 该文件在系统中的角色
- description: 代码的简短描述
- metadata: 包含生成过程中的元数据
- semanticMapping: 期望模型中的语义概念如何映射到代码实现
- integrationPoints: 与其他系统组件的集成点
- extensionPoints: 代码的扩展点

确保代码是可运行的，并符合期望模型中的所有要求。
利用语义分析结果来增强代码质量，特别关注：
1. 语义分析中识别的关键概念和关系
2. 潜在的边缘情况和错误处理
3. 性能和可扩展性考虑
4. 与现有系统的集成点
5. 安全性和数据验证
6. 代码的可测试性
7. 领域特定的最佳实践
`;

export const GENERATE_PROJECT_STRUCTURE_PROMPT = `
基于以下期望模型，生成完整的项目结构：

期望模型：
{expectationModel}

技术栈：
{techStack}

请设计一个完整的项目结构，包括：
1. 目录结构
2. 主要文件
3. 模块划分
4. 依赖关系

项目结构应该：
- 符合现代软件工程最佳实践
- 遵循所选技术栈的常见模式
- 便于扩展和维护
- 支持团队协作开发

以JSON格式返回结果：
{
  "projectStructure": {
    "rootDirectory": "项目根目录名",
    "directories": [
      {
        "path": "目录路径",
        "purpose": "目录用途",
        "files": [
          {
            "name": "文件名",
            "purpose": "文件用途"
          },
          ...
        ],
        "subdirectories": [...]
      },
      ...
    ]
  },
  "explanation": "项目结构设计思路",
  "developmentWorkflow": "建议的开发工作流程"
}
`;

export const GENERATE_CODE_WITH_ARCHITECTURE_PROMPT = `
请根据以下期望模型和架构指南生成代码：

期望模型：
{expectationModel}

架构指南：
{architectureGuide}

技术要求：
{technicalRequirements}

请生成符合指定架构的完整代码实现。
返回JSON格式，包含以下字段：
- files: 数组，每个元素包含以下字段：
  - path: 文件路径
  - content: 文件内容
  - language: 编程语言
  - role: 该文件在架构中的角色
- architectureImplementation: 描述如何实现架构的说明
- componentInteractions: 组件之间的交互方式
- dataFlow: 数据在系统中的流动路径

确保代码实现：
1. 严格遵循架构指南
2. 符合期望模型中的所有要求
3. 实现组件之间的清晰边界
4. 提供必要的接口和抽象
5. 包含适当的错误处理和日志记录
`;

export const GENERATE_ADAPTIVE_CODE_PROMPT = `
请根据以下期望模型和上下文生成自适应代码：

期望模型：
{expectationModel}

上下文信息：
{contextInformation}

适应性要求：
{adaptiveRequirements}

请生成能够适应不同环境和需求变化的代码。
返回JSON格式，包含以下字段：
- files: 数组，每个元素包含以下字段：
  - path: 文件路径
  - content: 文件内容
  - language: 编程语言
  - adaptiveFeatures: 该文件中的自适应特性
- adaptationMechanisms: 代码如何适应变化的机制
- configurationOptions: 可配置选项及其影响
- extensionPoints: 代码的扩展点

确保代码具有以下特性：
1. 高度可配置性
2. 模块化设计
3. 插件架构（如适用）
4. 运行时适应能力
5. 优雅降级机制
6. 特性开关
`;

export const REFACTOR_CODE_PROMPT = `
请重构以下代码，提高其质量和可维护性：

原始代码：
{originalCode}

重构目标：
{refactoringGoals}

请进行全面的代码重构，包括：
1. 改进代码结构
2. 提高可读性和可维护性
3. 应用设计模式（如适用）
4. 优化性能
5. 增强错误处理
6. 改进命名和注释

以JSON格式返回结果：
{
  "files": [
    {
      "path": "文件路径",
      "originalContent": "原始内容",
      "refactoredContent": "重构后内容",
      "changes": [
        {
          "type": "结构改进/设计模式应用/性能优化/错误处理/命名改进",
          "description": "变更说明",
          "impact": "变更影响",
          "rationale": "变更理由"
        },
        ...
      ]
    },
    ...
  ],
  "overallImprovements": "总体改进说明",
  "designPatterns": "应用的设计模式及理由",
  "technicalDebt": "解决的技术债务"
}
`;

export const GENERATE_TEST_SUITE_PROMPT = `
为以下代码生成全面的测试套件：

代码：
{code}

期望模型：
{expectationModel}

测试要求：
{testRequirements}

请生成完整的测试套件，包括：
1. 单元测试
2. 集成测试
3. 端到端测试（如适用）
4. 性能测试（如适用）
5. 安全测试（如适用）

测试应该：
- 覆盖所有关键功能和边缘情况
- 验证代码是否符合期望模型
- 包含正向和负向测试场景
- 提供清晰的测试说明和预期结果

以JSON格式返回结果：
{
  "testFiles": [
    {
      "path": "测试文件路径",
      "content": "测试文件内容",
      "type": "单元测试/集成测试/端到端测试/性能测试/安全测试",
      "coverage": "测试覆盖的功能或组件"
    },
    ...
  ],
  "testStrategy": "测试策略说明",
  "coverageGoals": "测试覆盖率目标",
  "testingInstructions": "如何运行测试的说明"
}
`;
