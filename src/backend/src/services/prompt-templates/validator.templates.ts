export const VALIDATOR_SYSTEM_PROMPT = `
你是一个专业的软件质量评估专家，擅长验证代码是否满足语义期望。
你的任务是分析代码实现与期望模型的匹配度，识别潜在问题，并提供改进建议。
请保持客观、全面和建设性，关注代码的功能完整性、质量和符合期望的程度。
`;

export const VALIDATE_CODE_PROMPT = `
验证以下代码是否满足给定的期望模型：

期望模型：
{expectationModel}

代码实现：
{codeImplementation}

请从以下方面进行验证：
1. 功能完整性：代码是否实现了期望模型中的所有功能
2. 语义匹配度：代码的实现方式是否符合期望的语义意图
3. 质量评估：代码的质量、可维护性和可扩展性
4. 潜在问题：可能存在的缺陷、漏洞或边界情况
5. 改进建议：如何使代码更好地满足期望

以JSON格式返回结果：
{
  "overallMatch": 85,
  "functionalCompleteness": 90,
  "semanticAlignment": 80,
  "codeQuality": 85,
  "expectations": [
    {
      "id": "exp1",
      "name": "期望1名称",
      "match": 90,
      "issues": ["问题1", "问题2", ...],
      "suggestions": ["建议1", "建议2", ...]
    },
    ...
  ],
  "generalIssues": ["一般问题1", "一般问题2", ...],
  "generalSuggestions": ["一般建议1", "一般建议2", ...],
  "summary": "验证结果总结"
}
`;

export const GENERATE_TEST_CASES_PROMPT = `
基于以下期望模型，生成测试用例：

期望模型：
{expectationModel}

代码实现：
{codeImplementation}

请生成全面的测试用例，包括：
1. 单元测试
2. 集成测试
3. 边界条件测试
4. 异常情况测试

测试用例应该：
- 覆盖期望模型中的所有关键功能
- 验证代码在各种情况下的行为
- 包含必要的测试数据和预期结果

以JSON格式返回结果：
{
  "testSuites": [
    {
      "name": "测试套件名称",
      "type": "单元测试/集成测试/边界测试/异常测试",
      "testCases": [
        {
          "name": "测试用例名称",
          "description": "测试用例描述",
          "input": "测试输入",
          "expectedOutput": "预期输出",
          "expectationIds": ["相关期望ID1", "相关期望ID2", ...]
        },
        ...
      ]
    },
    ...
  ],
  "coverageAnalysis": "测试覆盖率分析",
  "testingStrategy": "测试策略说明"
}
`;

export const ANALYZE_VALIDATION_RESULTS_PROMPT = `
分析以下验证结果，提供改进建议：

验证结果：
{validationResults}

期望模型：
{expectationModel}

代码实现：
{codeImplementation}

请提供详细的分析和改进建议，包括：
1. 主要问题的根本原因
2. 优先级排序的改进建议
3. 具体的代码修改示例
4. 长期改进策略

以JSON格式返回结果：
{
  "rootCauses": [
    {
      "issue": "问题描述",
      "cause": "根本原因",
      "impact": "影响程度",
      "relatedExpectations": ["相关期望ID1", "相关期望ID2", ...]
    },
    ...
  ],
  "improvementSuggestions": [
    {
      "priority": 1,
      "description": "建议描述",
      "codeExample": "代码示例",
      "expectedBenefit": "预期收益"
    },
    ...
  ],
  "longTermStrategy": "长期改进策略",
  "summary": "分析总结"
}
`;
