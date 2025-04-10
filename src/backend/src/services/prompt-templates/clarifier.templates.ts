export const CLARIFIER_SYSTEM_PROMPT = `
你是一个专业的软件需求分析师，擅长将模糊的需求转化为清晰的期望模型。
你的任务是帮助用户澄清需求，提取关键信息，并生成结构化的纯语义期望模型。
请保持专业、耐心和引导性，帮助用户思考他们可能忽略的方面。
`;

export const REQUIREMENT_ANALYSIS_PROMPT = `
分析以下软件需求，提取关键信息：

{requirementText}

请提供以下分析：
1. 需求的主要目标
2. 关键功能点
3. 可能的不确定性或模糊点
4. 建议的澄清问题
5. 相似行业设计参考

以JSON格式返回结果，包含以下字段：
{
  "mainGoal": "需求的主要目标",
  "keyFeatures": ["功能点1", "功能点2", ...],
  "uncertainties": ["不确定点1", "不确定点2", ...],
  "clarificationQuestions": [
    {
      "id": "q1",
      "question": "问题1",
      "context": "为什么问这个问题"
    },
    ...
  ],
  "industryReferences": [
    {
      "name": "参考系统名称",
      "description": "简短描述",
      "relevance": "与当前需求的相关性"
    },
    ...
  ]
}
`;

export const GENERATE_CLARIFICATION_QUESTIONS_PROMPT = `
基于以下需求和已有的澄清信息，生成新的澄清问题：

需求：{requirementText}

已有澄清：
{existingClarifications}

请生成3-5个有针对性的问题，帮助进一步澄清需求中的不确定性。问题应该：
1. 不重复已有的澄清信息
2. 聚焦于需求的关键方面
3. 帮助识别潜在的边界条件和约束
4. 引导用户思考他们可能忽略的方面
5. 参考相似行业的设计模式和最佳实践

以JSON数组格式返回结果：
[
  {
    "id": "q1",
    "question": "问题1",
    "context": "为什么问这个问题"
  },
  ...
]
`;

export const ANALYZE_CLARIFICATION_PROGRESS_PROMPT = `
评估以下需求及其澄清进度：

需求：{requirementText}

澄清历史：
{clarificationHistory}

请分析当前澄清进度，并提供以下信息：
1. 需求理解的完整度（百分比）
2. 是否需要更多澄清（true/false）
3. 已澄清的关键点摘要
4. 仍需澄清的方面
5. 建议的下一步澄清问题

以JSON格式返回结果：
{
  "completeness": 85,
  "needMoreClarification": true,
  "clarifiedPoints": ["已澄清点1", "已澄清点2", ...],
  "unclarifiedAspects": ["未澄清方面1", "未澄清方面2", ...],
  "suggestedQuestions": [
    {
      "id": "q1",
      "question": "问题1",
      "context": "为什么问这个问题"
    },
    ...
  ],
  "summary": "对当前需求理解的简要总结"
}
`;

export const GENERATE_EXPECTATIONS_PROMPT = `
基于以下需求及其澄清信息，生成结构化的纯语义期望模型：

需求：{requirementText}

澄清信息：
{clarificationInfo}

请生成一个期望模型，包含：
1. 顶层期望：描述系统整体目标和价值
2. 功能期望：描述系统应该做什么，而非如何做
3. 非功能期望：描述系统的质量属性（性能、安全性、可用性等）
4. 约束条件：描述系统必须遵守的限制

以JSON格式返回结果，使用以下结构：
{
  "id": "root",
  "name": "系统名称",
  "description": "系统整体描述",
  "type": "root",
  "children": [
    {
      "id": "exp1",
      "name": "期望1名称",
      "description": "期望1详细描述",
      "type": "functional",
      "children": [...]
    },
    {
      "id": "exp2",
      "name": "期望2名称",
      "description": "期望2详细描述",
      "type": "non-functional",
      "children": [...]
    },
    ...
  ]
}

注意：
- 每个期望必须有唯一的id
- type字段可以是：root, functional, non-functional, constraint
- 期望描述应该是纯语义的，不包含技术实现细节
- 期望之间应该有清晰的层次结构
`;
