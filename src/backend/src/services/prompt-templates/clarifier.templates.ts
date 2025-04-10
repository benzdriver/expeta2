export const CLARIFIER_SYSTEM_PROMPT = `
你是一个专业的软件需求分析师，擅长将模糊的需求转化为清晰的期望模型。
你的任务是帮助用户澄清需求，提取关键信息，并生成结构化的纯语义期望模型。
请保持专业、耐心和引导性，帮助用户思考他们可能忽略的方面。
在多轮对话中，你应该记住之前的交流内容，并基于这些信息提出更有针对性的问题。
每轮对话结束时，你应该明确总结你对需求的理解，并请用户确认。
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
6. 当前对话阶段（初始理解/深入澄清/细节完善/最终确认）
7. 对话轮次的有效性评估

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
      "context": "为什么问这个问题",
      "type": "functional|non-functional|constraint|business|technical",
      "priority": "high|medium|low"
    },
    ...
  ],
  "conversationStage": "初始理解|深入澄清|细节完善|最终确认",
  "dialogueEffectiveness": {
    "score": 85,
    "strengths": ["优势1", "优势2"],
    "weaknesses": ["不足1", "不足2"],
    "recommendations": ["建议1", "建议2"]
  },
  "summary": "对当前需求理解的简要总结"
}
`;

export const MULTI_ROUND_DIALOGUE_ANALYSIS_PROMPT = `
分析以下多轮对话的需求澄清过程：

需求：{requirementText}

对话历史：
{dialogueHistory}

请分析对话流程，并提供以下信息：
1. 对话的有效性评分（1-100）
2. 每轮对话的关键信息提取
3. 对话中的转折点和重要发现
4. 用户关注点的变化趋势
5. 需求理解的演进过程
6. 对话中可能被忽略的重要方面
7. 改进对话效率的建议

以JSON格式返回结果：
{
  "effectivenessScore": 85,
  "roundAnalysis": [
    {
      "round": 1,
      "keyInformation": ["信息1", "信息2"],
      "clarificationFocus": "本轮澄清重点",
      "userConcerns": ["关注点1", "关注点2"]
    },
    ...
  ],
  "pivotalMoments": [
    {
      "round": 2,
      "description": "重要转折点描述",
      "impact": "对需求理解的影响"
    },
    ...
  ],
  "concernTrends": ["趋势1", "趋势2"],
  "understandingEvolution": {
    "initial": "初始理解描述",
    "current": "当前理解描述",
    "keyChanges": ["变化1", "变化2"]
  },
  "potentiallyOverlookedAspects": ["方面1", "方面2"],
  "dialogueImprovementSuggestions": ["建议1", "建议2"]
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
5. 语义标签：帮助理解和分类期望的关键词

以JSON格式返回结果，使用以下结构：
{
  "id": "root",
  "name": "系统名称",
  "description": "系统整体描述",
  "type": "root",
  "semanticTags": ["标签1", "标签2"],
  "children": [
    {
      "id": "exp1",
      "name": "期望1名称",
      "description": "期望1详细描述",
      "type": "functional",
      "semanticTags": ["标签1", "标签2"],
      "priority": "high|medium|low",
      "children": [...]
    },
    {
      "id": "exp2",
      "name": "期望2名称",
      "description": "期望2详细描述",
      "type": "non-functional",
      "semanticTags": ["标签1", "标签2"],
      "priority": "high|medium|low",
      "children": [...]
    },
    ...
  ],
  "metadata": {
    "clarificationRounds": 3,
    "completenessScore": 95,
    "confidenceScore": 90,
    "lastUpdated": "2023-04-10T12:34:56Z"
  }
}

注意：
- 每个期望必须有唯一的id
- type字段可以是：root, functional, non-functional, constraint
- 期望描述应该是纯语义的，不包含技术实现细节
- 期望之间应该有清晰的层次结构
- 语义标签应该反映期望的本质和领域概念
`;

export const EXPECTATION_SUMMARY_PROMPT = `
基于以下期望模型，生成一个简洁的总结，确保用户理解系统将要实现什么：

期望模型：
{expectationModel}

请生成一个总结，包含：
1. 系统的主要目标和价值
2. 核心功能概述
3. 关键非功能特性
4. 主要约束条件
5. 对用户最重要的方面

总结应该：
- 使用非技术语言，便于所有利益相关者理解
- 突出最重要的期望
- 清晰表达系统的价值主张
- 长度适中（200-300字）

以JSON格式返回结果：
{
  "title": "期望模型总结标题",
  "summary": "总结文本",
  "keyPoints": ["要点1", "要点2", ...],
  "userBenefits": ["用户收益1", "用户收益2", ...],
  "nextSteps": "建议的下一步行动"
}
`;
