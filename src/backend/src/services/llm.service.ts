import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class LlmService {
  private apiKey: string;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant specialized in software requirements analysis and clarification.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling LLM API:', error);
      throw new Error('Failed to generate content using LLM');
    }
  }

  async analyzeRequirement(requirementText: string): Promise<any> {
    const prompt = `
      分析以下软件需求，提取关键信息：
      
      ${requirementText}
      
      请提供以下分析：
      1. 需求的主要目标
      2. 关键功能点
      3. 可能的不确定性或模糊点
      4. 建议的澄清问题
      
      以JSON格式返回结果。
    `;

    const analysisText = await this.generateContent(prompt);
    return JSON.parse(analysisText);
  }

  async generateExpectationModel(requirement: any, clarifications: any[]): Promise<any> {
    const prompt = `
      基于以下需求及其澄清信息，生成结构化的纯语义期望模型：
      
      需求：${requirement.text}
      
      澄清信息：
      ${clarifications.map(c => `问题: ${c.questionId}, 答案: ${c.answer}`).join('\n')}
      
      请生成一个期望模型，包含：
      1. 顶层期望：描述系统整体目标和价值
      2. 功能期望：描述系统应该做什么，而非如何做
      3. 非功能期望：描述系统的质量属性（性能、安全性、可用性等）
      4. 约束条件：描述系统必须遵守的限制
      
      以JSON格式返回结果，包含id、name、description和children字段，其中children是子期望的数组。
    `;

    const expectationsText = await this.generateContent(prompt);
    return JSON.parse(expectationsText);
  }
}
