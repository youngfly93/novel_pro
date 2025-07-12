import React, { useState, useEffect } from "react";
import { Editor, Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { NodeSelection } from "@tiptap/pm/state";
import { Trash2, Type, List, Code, Quote, Minus, Hash } from "lucide-react";

interface DragHandleMenuProps {
  editor: Editor;
  pos: number;
  onClose: () => void;
  x: number;
  y: number;
}

const DragHandleMenu: React.FC<DragHandleMenuProps> = ({ editor, pos, onClose, x, y }) => {
  const menuItems = [
    {
      icon: Trash2,
      label: "删除块",
      action: () => {
        const { tr } = editor.state;
        const node = editor.state.doc.nodeAt(pos);
        if (node) {
          tr.delete(pos, pos + node.nodeSize);
          editor.view.dispatch(tr);
        }
        onClose();
      },
      className: "text-red-600 hover:bg-red-50",
    },
    {
      icon: Type,
      label: "转为段落",
      action: () => {
        editor.chain().focus().setParagraph().run();
        onClose();
      },
    },
    {
      icon: Hash,
      label: "转为标题",
      action: () => {
        editor.chain().focus().setHeading({ level: 2 }).run();
        onClose();
      },
    },
    {
      icon: List,
      label: "转为列表",
      action: () => {
        editor.chain().focus().toggleBulletList().run();
        onClose();
      },
    },
    {
      icon: Code,
      label: "转为代码块",
      action: () => {
        editor.chain().focus().setCodeBlock().run();
        onClose();
      },
    },
    {
      icon: Quote,
      label: "转为引用",
      action: () => {
        editor.chain().focus().setBlockquote().run();
        onClose();
      },
    },
    {
      icon: Minus,
      label: "转为分割线",
      action: () => {
        editor.chain().focus().setHorizontalRule().run();
        onClose();
      },
    },
  ];

  return (
    <div
      className="fixed z-50 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.action}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${item.className || ""}`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

interface DragHandleState {
  showMenu: boolean;
  menuPos: { x: number; y: number };
  nodePos: number;
}

let dragHandleMenuState: DragHandleState = {
  showMenu: false,
  menuPos: { x: 0, y: 0 },
  nodePos: 0,
};

let setMenuState: React.Dispatch<React.SetStateAction<DragHandleState>> | null = null;

export const DragHandleMenuComponent: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [menuState, setMenuStateLocal] = useState<DragHandleState>(dragHandleMenuState);

  useEffect(() => {
    setMenuState = setMenuStateLocal;
    return () => {
      setMenuState = null;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuState.showMenu) {
        setMenuStateLocal((prev) => ({ ...prev, showMenu: false }));
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuState.showMenu]);

  if (!menuState.showMenu) return null;

  return (
    <DragHandleMenu
      editor={editor}
      pos={menuState.nodePos}
      onClose={() => setMenuStateLocal((prev) => ({ ...prev, showMenu: false }))}
      x={menuState.menuPos.x}
      y={menuState.menuPos.y}
    />
  );
};

export const EnhancedDragHandle = Extension.create({
  name: "enhancedDragHandle",

  addProseMirrorPlugins() {
    let dragHandleElement: HTMLElement | null = null;

    const hideDragHandle = () => {
      if (dragHandleElement) {
        dragHandleElement.classList.add("hide");
      }
    };

    const showDragHandle = () => {
      if (dragHandleElement) {
        dragHandleElement.classList.remove("hide");
      }
    };

    return [
      new Plugin({
        key: new PluginKey("enhancedDragHandle"),
        view(editorView) {
          // 创建拖拽手柄元素
          dragHandleElement = document.createElement("div");
          dragHandleElement.className = "drag-handle hide";
          dragHandleElement.draggable = true;
          dragHandleElement.setAttribute("data-drag-handle", "");

          // 添加右键点击事件
          dragHandleElement.addEventListener("contextmenu", (e) => {
            e.preventDefault();

            // 找到当前鼠标悬停的节点位置
            const coords = { left: e.clientX, top: e.clientY };
            const posAtCoords = editorView.posAtCoords(coords);

            if (!posAtCoords) return;

            const $pos = editorView.state.doc.resolve(posAtCoords.pos);
            let nodePos = posAtCoords.pos;

            // 找到块级节点的位置
            for (let i = $pos.depth; i > 0; i--) {
              const node = $pos.node(i);
              if (node.type.isBlock && node.type.name !== "doc") {
                nodePos = $pos.before(i);
                break;
              }
            }

            if (setMenuState) {
              setMenuState({
                showMenu: true,
                menuPos: { x: e.clientX, y: e.clientY },
                nodePos: nodePos,
              });
            }
          });

          // 处理拖拽开始事件
          dragHandleElement.addEventListener("dragstart", (event) => {
            if (!editorView.editable) return;

            // 找到鼠标位置对应的节点
            const coords = { x: event.clientX + 50, y: event.clientY };
            const element = document.elementFromPoint(coords.x, coords.y);

            if (!element) return;

            let node = element.closest("li, p, h1, h2, h3, h4, h5, h6, blockquote, div[data-type], pre");
            if (!node || !editorView.dom.contains(node)) return;

            const nodePos = editorView.posAtDOM(node, 0);
            if (nodePos < 0) return;

            // 选择要拖拽的节点
            const nodeSelection = NodeSelection.create(editorView.state.doc, nodePos);
            editorView.dispatch(editorView.state.tr.setSelection(nodeSelection));

            const slice = editorView.state.selection.content();

            // 设置拖拽数据
            event.dataTransfer!.effectAllowed = "copyMove";
            event.dataTransfer!.setDragImage(node, 0, 0);

            // 设置拖拽状态
            (editorView as any).dragging = { slice, move: event.ctrlKey };
          });

          // 监听鼠标移动事件来显示/隐藏拖拽手柄
          const handleMouseMove = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // 如果鼠标在编辑器外，隐藏手柄
            if (!editorView.dom.contains(target)) {
              hideDragHandle();
              return;
            }

            // 找到最近的可拖拽节点
            const node = target.closest(
              "li, p, h1, h2, h3, h4, h5, h6, blockquote, div[data-type], pre, [data-type='horizontalRule']",
            );

            if (!node || !editorView.dom.contains(node)) {
              hideDragHandle();
              return;
            }

            const rect = node.getBoundingClientRect();
            const editorRect = editorView.dom.getBoundingClientRect();

            // 更新拖拽手柄位置
            if (dragHandleElement) {
              dragHandleElement.style.left = `${rect.left - editorRect.left - 24}px`;
              dragHandleElement.style.top = `${rect.top - editorRect.top + 2}px`;
              showDragHandle();
            }
          };

          // 监听鼠标离开事件
          const handleMouseLeave = () => {
            setTimeout(() => {
              // 延迟隐藏，避免快速移动时闪烁
              if (dragHandleElement && !dragHandleElement.matches(":hover")) {
                hideDragHandle();
              }
            }, 100);
          };

          // 添加事件监听器
          editorView.dom.addEventListener("mousemove", handleMouseMove);
          editorView.dom.addEventListener("mouseleave", handleMouseLeave);

          // 将拖拽手柄添加到编辑器容器
          const container = editorView.dom.parentNode as HTMLElement;
          if (container) {
            container.style.position = "relative";
            container.appendChild(dragHandleElement);
          }

          return {
            destroy: () => {
              editorView.dom.removeEventListener("mousemove", handleMouseMove);
              editorView.dom.removeEventListener("mouseleave", handleMouseLeave);

              if (dragHandleElement && dragHandleElement.parentNode) {
                dragHandleElement.parentNode.removeChild(dragHandleElement);
              }
            },
          };
        },
      }),
    ];
  },
});
