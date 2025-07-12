3 后端：把 AI 接口改成流式输出
Novel Pro 的现状是一次性返回 200 字符补全文本。为了“灰字实时出现”，需要：

ts
复制
编辑
// apps/web/app/api/generate/route.ts

const { ReadableStream } = require("web-streams-polyfill/ponyfill"); // Edge 环境

requestBody.stream = true;                 // 1️⃣ 请求 OpenRouter 开启流
const res = await fetch(`${baseUrl}/chat/completions`, {
  ... // headers
  body: JSON.stringify(requestBody),
});

return new Response(res.body, {            // 2️⃣ 直接把可读流透传给前端
  status: 200,
  headers: { "Content-Type": "text/event-stream" },
});
OpenRouter 文档明确支持 stream:true 并按 SSE chunk 推送 
OpenRouter
；如果只想兼容 fetch ReadableStream，也可以保留默认 JSON 协议并手动解析 
OpenRouter
。Edge Route 自带 ReadableStream 支持，无需第三方库 
Next.js
。

4 前端：在 Tiptap 里插入“幽灵文本”
4.1 核心思路
在光标处发起补全请求，监听流式分片。

把已接收到的文本用 Decoration.inline 渲染成浅灰色（class ghost-text）。

覆写 Tab 键：若当前存在 ghostText，就 insertContent 并删除装饰；否则执行正常 Tab 行为。

ProseMirror Decoration 的官方示例与搜索高亮非常类似 
ProseMirror
；insertContent 是 Tiptap 自带命令 
tiptap.dev
。

4.2 示例 Extension（放在 packages/headless/src/extensions/ghostText.ts）
ts
复制
编辑
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, Decoration, DecorationSet } from 'prosemirror-state'

export const GhostText = Extension.create({
  name: 'ghostText',
  addOptions() {
    return {
      onRequest: async (prefix: string, update: (txt: string)=>void) => {},
    }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('ghostText'),
        state: {
          init: () => ({ text: '' }),
          apply: (tr, value) => {
            const meta = tr.getMeta(this)
            return meta ? { text: meta } : value
          },
        },
        props: {
          decorations: (state) => {
            const { text } = this.getState(state)
            if (!text) return null
            const pos = state.selection.$from.pos
            return DecorationSet.create(state.doc, [
              Decoration.inline(pos, pos, {
                nodeName: 'span',
                class: 'ghost-text text-gray-400',
                style: 'pointer-events:none',
              }, { 'data-ghost': text }),
            ])
          },
          handleKeyDown: (view, e) => {
            if (e.key === 'Tab') {
              const { text } = this.getState(view.state)
              if (text) {
                view.dispatch(
                  view.state.tr
                    .insertText(text)
                    .setMeta(this, '')      // 清空 ghost
                )
                e.preventDefault()
                return true
              }
            }
            return false
          },
        },
      }),
    ]
  },
})
调用方式：

ts
复制
编辑
editor.registerExtension(GhostText.configure({
  onRequest: async (prefix, update) => {
    const res = await fetch('/api/generate', { ... })
    for await (const chunk of res.body) update(chunk)
  },
}))
提示：若想更快集成，可直接使用 Tiptap 3 的官方 Content AI → Autocomplete 扩展，它内部已经帮你做了这套逻辑，并暴露 onTab 钩子 
tiptap.dev
。

5 前端触发逻辑（快捷键 ++ 或输入检测）
在 onKeyDown 中检测用户输入 "+"；两次连续则取光标前文作为 prompt 调用 onRequest。

若要改成和 Gmail 那种 “持续预测”，可以在用户停止输入 200 ms 后触发。

Tiptap Suggestion 工具提供现成的光标监听和弹窗能力，也能用来做 / 命令或 @mention 风格补全 
tiptap.dev
