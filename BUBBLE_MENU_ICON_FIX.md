# 滑词窗口图标显示修复 - 解决加粗斜体按钮显示为小点的问题

## 问题描述
用户反馈滑词窗口（bubble menu）中的加粗、斜体、下划线等格式化按钮显示为小点，而不是正确的图标。

## 问题分析
1. **图标引入问题**: 可能是Lucide React图标的引入方式不正确
2. **CSS样式冲突**: SVG图标的默认样式可能被覆盖
3. **版本兼容性**: Lucide React版本可能存在兼容性问题

## 修复方案

### 1. 优化图标引入方式
**文件**: `/apps/web/components/tailwind/selectors/text-buttons.tsx`

**修改前 - 使用Icon后缀的导入**:
```typescript
import { BoldIcon, CodeIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from "lucide-react";
```

**修改后 - 使用标准名称导入**:
```typescript
import { Bold, Code, Italic, Strikethrough, Underline } from "lucide-react";
```

### 2. 改进组件渲染逻辑
**重构前 - 动态属性访问**:
```typescript
const items: SelectorItem[] = [
  {
    name: "bold",
    isActive: (editor) => editor.isActive("bold"),
    command: (editor) => editor.chain().focus().toggleBold().run(),
    icon: BoldIcon,
  },
  // ...
];

<item.icon className={cn("h-4 w-4", {...})} />
```

**重构后 - 直接组件渲染**:
```typescript
const items = [
  {
    name: "bold",
    isActive: () => editor.isActive("bold"),
    command: () => editor.chain().focus().toggleBold().run(),
    icon: Bold,
  },
  // ...
];

const Icon = item.icon;
<Icon className={cn("h-4 w-4", {...})} />
```

### 3. 添加CSS样式修复
**文件**: `/apps/web/styles/prosemirror.css`

**修复SVG图标显示**:
```css
/* Fix for text buttons in bubble menu */
[data-bubble-menu] svg,
.tippy-content svg,
.editor-bubble svg {
  display: inline-block !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
  stroke-width: 2 !important;
  width: 1rem !important;
  height: 1rem !important;
}

/* General lucide icon fix */
.lucide {
  display: inline-block !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
  stroke-width: 2 !important;
}

/* Button icon fix */
button svg {
  display: inline-block !important;
  vertical-align: middle !important;
}
```

## 修复效果

### 修复前
- ❌ 加粗、斜体、下划线按钮显示为小点
- ❌ 图标无法正确渲染
- ❌ 用户体验差，不知道按钮功能

### 修复后
- ✅ 图标正确显示为对应的格式化符号
- ✅ 按钮状态正确反映（激活时显示蓝色）
- ✅ 用户能清楚识别每个按钮的功能

## 技术细节

### 根本原因
1. **图标导入**: `BoldIcon`等带Icon后缀的导入可能在某些版本中不存在
2. **SVG属性**: 默认SVG样式被全局CSS覆盖，导致图标不可见
3. **渲染方式**: 动态属性访问可能导致组件无法正确渲染

### 解决策略
1. **标准化导入**: 使用Lucide React的标准图标名称
2. **强制样式**: 使用`!important`确保SVG样式不被覆盖
3. **多层选择器**: 针对不同的容器元素（bubble menu、tippy、button）都应用修复

### 兼容性保证
- 适配不同的弹出菜单容器
- 保持响应式设计
- 支持主题切换（深色/浅色模式）
- 不影响其他图标的正常显示

## 测试验证

### 功能测试
1. 选中文本，查看bubble menu是否正确显示图标
2. 点击各个格式化按钮，验证功能是否正常
3. 检查按钮激活状态的视觉反馈

### 兼容性测试
- 不同浏览器中的图标显示
- 移动端和桌面端的一致性
- 深色和浅色主题下的显示效果

## 预防措施

1. **图标导入规范**: 统一使用标准名称导入Lucide图标
2. **CSS隔离**: 为特定组件添加明确的样式作用域
3. **版本锁定**: 确保Lucide React版本的稳定性

修复后，滑词窗口中的格式化按钮应该能正确显示对应的图标，而不是小点。