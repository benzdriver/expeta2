/**
 * 工作流工具函数
 */

/**
 * 根据路径获取对象中的值
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  const _parts = 
  let _current = 

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
export function setValueByPath(obj: unknown, path: string, value: unknown): void {
  const _parts = 
  let _current = 

  for (let _i = 
    const _part = 

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
export function evaluateCondition(condition: string, context: unknown): boolean {
  try {
    const _evalFunc = 
      'context',
      `
      with (context) {
        return ${condition};
      }
    `,
    );

    return evalFunc(context);
  } catch (error) {
    /* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
/* eslint-disable-next-line no-console */
console.error(`Error evaluating condition "${condition}":`, error);
    return false;
  }
}
