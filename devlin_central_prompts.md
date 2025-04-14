# Devin 中心 Session Slack 命令

@Devin 请根据以下步骤启动一个中心管理Session，来协调和监督Expeta 2.0项目各模块的开发进度。

## 中心 Session 的任务
- 检查各个模块的当前完成状态。
- 对未完成模块分别启动独立的子Session。
  - 启动的每个子模块Session均需自动继承并严格遵守中心Session提供的所有参考文档和要求。
  - 子Session命名规则：以模块名称为前缀，例如模块Clarifier的开发Session命名为 `clarifier`。
  - 当每个子模块Session完成代码开发后，自动启动对应的单元测试Session，命名为 `模块名_unit_tests`。
    - 如果单元测试中发现任何失败的测试用例，Session应主动分析失败原因，修复相关代码，并重新运行测试，直到所有测试通过。
  - 单元测试通过后，自动启动对应模块的集成测试Session，命名为 `模块名_integration_tests`。
    - 如果集成测试中出现失败，同样需执行自动修复流程并重新测试，确保集成稳定。
- 在模块准备提交Pull Request（PR）前，自动检查其分支是否落后于主分支（main）。如有落后，提醒开发者或自动执行：先pull最新main分支并解决冲突，再进行PR。
- 定期监控子Session及其对应测试Session的进度。
- 如果监测到某个子Session或测试Session意外中断或断开，请自动恢复并继续该模块或测试Session的任务，确保开发进程不受影响。
- 每个模块完成单元测试和集成测试后需告知中心Session。
- 所有模块均完成单元测试和自身模块的集成测试并且全部通过后，启动最后的系统性整体测试。
  - 系统性整体测试需验证每一个模块的功能，并记录整个流程。
  - 最终Session命名为 `system_full_validation`。
- 完成整体测试后，将完整的测试结果和流程报告给中心Session。

## 参考文档（已上传至Slack）
- expeta_execution_prompt.md
- expeta_design_principles.md
- expeta_interface_specs.md
- expeta_technical_dependencies.md
- expeta_task_plan.md

## 特殊注意
- 特别关注Clarifier模块的多轮对话能力提升。
- 关注Generator模块的代码生成和访问体验改进。
- 严格遵守Expeta 2.0的设计原则和架构标准。

请立即开始任务，并提供进展反馈。

