# Ghost Text Layout Fix - A4页面边界问题修复

## 问题描述
用户反馈影子文字（ghost text）会超出A4页面的渲染边界，没有按照正常的字体书写布局和轨迹进行换行。

## 问题分析
原始代码中的CSS样式使用了 `white-space: nowrap !important;`，这会阻止文本换行，导致影子文字超出容器边界。

## 修复方案

### 1. CSS样式优化
**文件**: `/apps/web/styles/prosemirror.css`

**修改前**:
```css
.ProseMirror .ghost-text {
  color: #9ca3af;
  font-style: italic;
  pointer-events: none;
  user-select: none;
  opacity: 0.7;
}
```

**修改后**:
```css
.ProseMirror .ghost-text {
  color: #9ca3af !important;
  font-style: normal !important;
  font-weight: normal !important;
  pointer-events: none !important;
  user-select: none !important;
  opacity: 0.5 !important;
  position: relative !important;
  display: inline !important;
  white-space: pre-wrap !important;        /* 允许换行 */
  word-wrap: break-word !important;        /* 单词级别换行 */
  overflow-wrap: break-word !important;    /* 强制换行 */
  font-size: inherit !important;
  line-height: inherit !important;
  max-width: 100% !important;             /* 限制最大宽度 */
  box-sizing: border-box !important;
}
```

### 2. 多行文本支持
**文件**: `/packages/headless/src/extensions/auto-complete.ts`

添加了对多行ghost text的支持：
- 检测换行符并分割文本
- 为多行内容创建容器结构
- 每行独立处理换行逻辑

### 3. 核心改进点

#### 换行控制
- **`white-space: pre-wrap`**: 保留空格和换行，允许自动换行
- **`word-wrap: break-word`**: 在单词边界处换行
- **`overflow-wrap: break-word`**: 必要时在任意字符处强制换行

#### 宽度控制
- **`max-width: 100%`**: 限制ghost text不超出容器宽度
- **`box-sizing: border-box`**: 确保padding和border包含在宽度计算中

#### 多行处理
```typescript
// 检测多行文本
const ghostLines = ghostText.split('\n');

if (ghostLines.length > 1) {
  // 创建容器处理多行
  const container = document.createElement("div");
  container.className = "ghost-text-container";
  
  ghostLines.forEach((line, index) => {
    const span = document.createElement("span");
    span.className = "ghost-text-line";
    span.style.display = index === 0 ? 'inline' : 'block';
    span.textContent = line;
    container.appendChild(span);
  });
}
```

## 修复效果

### 修复前
- Ghost text使用 `white-space: nowrap` 强制不换行
- 长文本会超出A4页面边界
- 影响用户阅读体验

### 修复后
- Ghost text遵循正常文本流
- 自动在页面边界处换行
- 保持与正常文字相同的布局规律
- 支持多行内容的正确显示

## 技术细节

### CSS属性说明
- **`white-space: pre-wrap`**: 保留空格序列，但允许换行
- **`word-wrap: break-word`**: 当单词过长时允许在单词内部断行
- **`overflow-wrap: break-word`**: 更现代的换行控制属性
- **`max-width: 100%`**: 确保不超出父容器宽度

### 兼容性保证
- 保持原有的视觉效果（颜色、透明度等）
- 不影响ghost text的交互行为
- 向前兼容现有功能

## 测试建议

1. **长文本测试**: 输入超过一行的中文文本，观察ghost text换行行为
2. **页面边界测试**: 在接近右边界时输入文本，确认自动换行
3. **多行文本测试**: 测试包含换行符的AI生成内容
4. **响应式测试**: 在不同屏幕尺寸下测试布局表现

## 影响范围
- 仅影响ghost text的视觉布局
- 不改变AI自动补全的核心逻辑
- 提升用户体验，特别是在A4页面格式中

此修复确保了影子文字能够像正常文字一样遵循页面布局规则，解决了文本超出边界的问题。