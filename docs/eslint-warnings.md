# ESLint 警告知识库

## 类型定义相关警告

### @typescript-eslint/no-explicit-any

**描述**: 使用 `any` 类型会绕过 TypeScript 的类型检查系统。

**解决方案**:
- 使用更具体的类型（例如 `string`, `number`, `boolean` 等）
- 使用泛型类型（例如 `Array<T>`, `Record<K, V>` 等）
- 使用 `unknown` 类型，然后进行类型断言
- 对于 API 响应，创建接口定义响应结构

**示例**:
```typescript
// 修改前
function processData(data: any): any {
  return data.value;
}

// 修改后
interface DataObject {
  value: string;
}

function processData(data: DataObject): string {
  return data.value;
}
```

## 未使用变量相关警告

### @typescript-eslint/no-unused-vars

**描述**: 声明但未使用的变量。

**解决方案**:
- 移除未使用的变量
- 添加下划线前缀（例如 `_variableName`）
- 在需要的地方使用这些变量

**示例**:
```typescript
// 修改前
const showTemplateFeatures = useState(false)[0];
const selectedTemplateDetails = useState(null)[0];

// 修改后
const _showTemplateFeatures = useState(false)[0];
const _selectedTemplateDetails = useState(null)[0];
```

## React Hooks 相关警告

### react-hooks/exhaustive-deps

**描述**: useEffect 依赖项数组中缺少依赖。

**解决方案**:
- 添加缺少的依赖项到依赖数组中
- 使用 useCallback/useMemo 封装函数或对象以稳定引用
- 将依赖项提取到 useEffect 外部

**示例**:
```typescript
// 修改前
useEffect(() => {
  fetchData(userId);
}, []);

// 修改后
useEffect(() => {
  fetchData(userId);
}, [userId, fetchData]);
```

## 控制台语句相关警告

### no-console

**描述**: 生产代码中不应该有控制台语句。

**解决方案**:
- 移除控制台语句
- 使用适当的日志服务替代
- 在开发环境中条件性地使用控制台语句
- 添加 eslint-disable-next-line 注释

**示例**:
```typescript
// 修改前
console.log('User logged in:', user);

// 修改后
/* eslint-disable-next-line no-console */
console.log('User logged in:', user);

// 或者使用日志服务
logger.info('User logged in:', user);
```

## 空构造函数警告

### @typescript-eslint/no-empty-function

**描述**: 空的构造函数或方法。

**解决方案**:
- 添加注释说明为什么函数是空的
- 实现函数逻辑
- 移除空函数

**示例**:
```typescript
// 修改前
private constructor() {}

// 修改后
private constructor() { /* 单例模式 */ }
```

## 代码格式相关警告

### prettier/prettier

**描述**: 代码格式不符合 Prettier 配置。

**解决方案**:
- 运行 prettier --write 格式化代码
- 配置编辑器自动格式化

## React JSX 相关警告

### react/jsx-no-undef

**描述**: JSX 中使用了未定义的组件。

**解决方案**:
- 导入缺少的组件
- 修正组件名称拼写错误

### react/jsx-no-target-blank

**描述**: 使用 target="_blank" 但没有 rel="noopener noreferrer"。

**解决方案**:
- 添加 rel="noopener noreferrer" 属性

### react/jsx-curly-brace-presence

**描述**: JSX 属性中不必要的花括号。

**解决方案**:
- 移除不必要的花括号

## 引号相关警告

### jsx-quotes

**描述**: JSX 属性应使用双引号。

**解决方案**:
- 将 JSX 属性中的单引号改为双引号

### quotes

**描述**: 字符串应使用单引号或双引号（取决于配置）。

**解决方案**:
- 统一使用配置中指定的引号类型

## 未转义的实体警告

### react/no-unescaped-entities

**描述**: JSX 中未转义的特殊字符（如引号）。

**解决方案**:
- 使用 HTML 实体（如 &quot;）
- 使用 Unicode 转义序列
- 使用花括号包裹字符串并使用 JavaScript 转义

**示例**:
```typescript
// 修改前
<p>选择期望和选项，然后点击"生成代码"按钮</p>

// 修改后
<p>选择期望和选项，然后点击&quot;生成代码&quot;按钮</p>
```
