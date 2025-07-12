import type React from "react";
import { useState, useEffect } from "react";
import { type Editor, Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
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

const dragHandleMenuState: DragHandleState = {
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

// 这个扩展只为现有的拖拽手柄添加右键菜单功能，不创建新的拖拽手柄
export const EnhancedDragHandle = Extension.create({
  name: "enhancedDragHandle",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("enhancedDragHandle"),
        view(editorView) {
          // 监听全局右键点击事件
          const handleContextMenu = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // 检查是否点击的是拖拽手柄
            if (target.classList.contains("drag-handle") || target.hasAttribute("data-drag-handle")) {
              event.preventDefault();

              // 找到鼠标位置附近的文档位置
              const editorRect = editorView.dom.getBoundingClientRect();
              const coords = {
                left: event.clientX - editorRect.left,
                top: event.clientY - editorRect.top,
              };

              // 获取文档位置
              const posAtCoords = editorView.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });

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
                  menuPos: { x: event.clientX, y: event.clientY },
                  nodePos: nodePos,
                });
              }
            }
          };

          // 添加全局右键监听器
          document.addEventListener("contextmenu", handleContextMenu);

          return {
            destroy: () => {
              document.removeEventListener("contextmenu", handleContextMenu);
            },
          };
        },
      }),
    ];
  },
});
