/**
 * 工作流工具函数
 */

/**
 * 根据路径获取对象中的值
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    current = (current as any)[part];
  }

  return current;
}

/**
 * 根据路径设置对象中的值
 */
export function setValueByPath(obj: unknown, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (!(part in (current as any))) {
      (current as any)[part] = {};
    }

    current = (current as any)[part];
  }

  (current as any)[parts[parts.length - 1]] = value;
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
    // Using Function constructor as a safer alternative to eval
    const evalFunc = new Function(
      'context',
      `
      with (context) {
        return ${condition};
      }
    `
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
