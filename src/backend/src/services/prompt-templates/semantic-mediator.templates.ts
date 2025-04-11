export const SEMANTIC_MEDIATOR_SYSTEM_PROMPT = `
你是一个专业的语义中介专家，擅长在不同模块之间进行语义转换和协调。
你的任务是理解不同模块的语义表达，并在它们之间进行准确的转换和协调。
请保持语义一致性，确保信息在转换过程中不丢失或扭曲。
`;

export const TRANSLATE_BETWEEN_MODULES_PROMPT = `
将以下来自{sourceModule}模块的数据转换为{targetModule}模块可理解的格式：

源数据（{sourceModule}）：
{sourceData}

请将源数据转换为{targetModule}模块可理解的格式，确保：
1. 保留所有关键信息
2. 适应目标模块的数据结构和语义要求
3. 转换过程中不引入新的信息或假设

以JSON格式返回结果：
{
  "translatedData": "转换后的数据",
  "mappingExplanation": [
    {
      "sourceField": "源字段",
      "targetField": "目标字段",
      "transformationLogic": "转换逻辑说明"
    },
    ...
  ],
  "preservedSemantics": ["保留的语义1", "保留的语义2", ...],
  "potentialLosses": ["可能损失的信息1", "可能损失的信息2", ...],
  "recommendations": ["建议1", "建议2", ...]
}
`;

export const ENRICH_WITH_CONTEXT_PROMPT = `
使用上下文信息丰富以下{module}模块的数据：

原始数据：
{originalData}

上下文查询：
{contextQuery}

请使用相关上下文信息丰富原始数据，确保：
1. 添加的上下文信息与原始数据相关
2. 丰富后的数据保持一致性和完整性
3. 清晰标识哪些是原始信息，哪些是丰富的信息

以JSON格式返回结果：
{
  "enrichedData": "丰富后的数据",
  "addedContext": [
    {
      "type": "上下文类型",
      "content": "上下文内容",
      "relevance": "相关性说明"
    },
    ...
  ],
  "integrationPoints": ["集成点1", "集成点2", ...],
  "confidenceLevel": "信心水平（高/中/低）",
  "explanation": "丰富过程的说明"
}
`;

export const RESOLVE_SEMANTIC_CONFLICTS_PROMPT = `
解决以下来自不同模块的数据之间的语义冲突：

模块A（{moduleA}）数据：
{dataA}

模块B（{moduleB}）数据：
{dataB}

请识别并解决这两个数据集之间的语义冲突，确保：
1. 识别所有潜在的冲突点
2. 提供合理的解决方案
3. 保持数据的一致性和完整性

以JSON格式返回结果：
{
  "conflicts": [
    {
      "description": "冲突描述",
      "fieldA": "模块A中的字段",
      "valueA": "模块A中的值",
      "fieldB": "模块B中的字段",
      "valueB": "模块B中的值",
      "resolution": "解决方案",
      "reasoning": "解决方案的理由"
    },
    ...
  ],
  "resolvedData": "解决冲突后的合并数据",
  "confidenceLevel": "信心水平（高/中/低）",
  "recommendations": ["建议1", "建议2", ...],
  "summary": "冲突解决总结"
}
`;

export const EXTRACT_SEMANTIC_INSIGHTS_PROMPT = `
从以下数据中提取与查询相关的语义洞察：

数据：
{data}

查询：
{query}

请提取与查询相关的语义洞察，包括：
1. 关键发现
2. 模式和趋势
3. 潜在的含义和影响
4. 建议的行动

以JSON格式返回结果：
{
  "keyInsights": [
    {
      "description": "洞察描述",
      "evidence": "支持证据",
      "confidence": "信心水平（高/中/低）",
      "implications": ["含义1", "含义2", ...]
    },
    ...
  ],
  "patterns": ["模式1", "模式2", ...],
  "suggestedActions": [
    {
      "action": "建议行动",
      "rationale": "理由",
      "priority": "优先级（高/中/低）"
    },
    ...
  ],
  "limitations": ["局限性1", "局限性2", ...],
  "summary": "洞察总结"
}
`;
