/**
 * 工作流工具函数
 */

/**
 * 根据路径获取对象中的值
 */
export function getValueByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

/**
 * 根据路径设置对象中的值
 */
export function setValueByPath(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (!(part in current)) {
      current[part] = {};
    }

    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * 评估条件表达式
 * 支持简单的条件表达式，如：
 * - "result.score > 0.8"
 * - "data.type === 'requirement'"
 * - "context.iterations < 3"
 */
export function evaluateCondition(condition: string, context: any): boolean {
  try {
    const evalFunc = new Function(
      'context',
      `
      with (context) {
        return ${condition};
      }
    `,
    );

    return evalFunc(context);
  } catch (error) {
    console.error(`Error evaluating condition "${condition}":`, error);
    return false;
  }
}
