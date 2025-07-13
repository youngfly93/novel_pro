# A4布局间距优化 - 让编辑器与标题更紧凑

## 问题描述
用户反馈A4编辑页面与"Untitled"标题之间的间距过大，希望让两者更靠近，提升视觉连贯性。

## 优化方案

### 1. 主页面布局调整
**文件**: `/apps/web/app/page.tsx`

**调整1 - 减少顶部工具栏底部间距**:
```typescript
// 修改前
className={`flex w-full max-w-4xl items-center gap-2 sm:mb-[calc(10vh)] ${...}`}

// 修改后  
className={`flex w-full max-w-4xl items-center gap-2 mb-2 ${...}`}
```

**调整2 - 减少主容器元素间距**:
```typescript
// 修改前
className={`flex-1 flex flex-col items-center gap-4 py-4 ${...}`}

// 修改后
className={`flex-1 flex flex-col items-center gap-2 py-4 ${...}`}
```

### 2. 编辑器组件优化
**文件**: `/apps/web/components/tailwind/advanced-editor.tsx`

**移除编辑器底部多余间距**:
```typescript
// 修改前
className={`editor-a4-layout ${darkMode ? "dark" : ""} relative sm:mb-[calc(10vh)] sm:rounded-lg`}

// 修改后
className={`editor-a4-layout ${darkMode ? "dark" : ""} relative sm:rounded-lg`}
```

### 3. A4页面内边距优化
**文件**: `/apps/web/styles/globals.css`

**桌面端间距调整**:
```css
/* 修改前 */
.editor-a4-layout {
  padding: 96px 72px; /* 1 inch margins */
}

/* 修改后 */
.editor-a4-layout {
  padding: 48px 72px 96px; /* Reduced top padding, keep sides and bottom */
}
```

**移动端间距调整**:
```css
/* 修改前 */
@media (max-width: 849px) {
  .editor-a4-layout {
    padding: 48px 24px;
  }
}

/* 修改后 */
@media (max-width: 849px) {
  .editor-a4-layout {
    padding: 24px 24px 48px; /* Reduced top padding for mobile */
  }
}
```

## 优化效果

### 间距变化对比

| 元素 | 修改前 | 修改后 | 改进量 |
|------|--------|--------|--------|
| 工具栏底部间距 | `calc(10vh)` ≈ 60-80px | `8px` | 减少 ~85% |
| 主容器元素间距 | `16px` | `8px` | 减少 50% |
| A4页面顶部内边距 | `96px` | `48px` | 减少 50% |
| 移动端顶部内边距 | `48px` | `24px` | 减少 50% |

### 视觉改进
1. **紧凑布局**: 标题与A4页面之间的视觉距离显著减少
2. **更好的连贯性**: 用户能够更清楚地感知标题与内容的关联
3. **屏幕利用率提升**: 减少无效空白区域，内容区域相对更大
4. **移动端体验优化**: 在小屏幕上避免过多空白浪费

### 保持的设计原则
- ✅ 保持A4纸张标准比例和尺寸
- ✅ 维持左右边距的专业文档感
- ✅ 保留底部间距避免内容过于贴边
- ✅ 响应式设计在不同屏幕尺寸下都有优化

## 技术实现细节

### CSS层级优化
使用Tailwind CSS的优先级系统，确保样式正确应用：
- 移除了过大的视口高度计算值 `calc(10vh)`
- 使用固定像素值提供更可预测的布局
- 保持响应式设计原则

### 布局流程优化
1. **减少顶层容器间距** → 整体布局更紧凑
2. **优化工具栏间距** → 减少标题与内容的视觉分离
3. **调整A4内边距** → 内容区域向上靠近标题

### 兼容性保证
- 在桌面端和移动端都进行了对应优化
- 保持暗色模式的正常显示
- 不影响编辑器的功能交互

## 用户体验提升

1. **视觉连贯性增强**: 标题和内容区域形成更紧密的视觉关系
2. **减少滚动需求**: 在相同屏幕尺寸下可以看到更多内容
3. **专业感保持**: 仍然保持类似Word文档的专业间距感
4. **响应式友好**: 在手机和平板上都有更好的空间利用率

这次优化在保持A4页面专业外观的同时，显著改善了布局的紧凑性和视觉连贯性。