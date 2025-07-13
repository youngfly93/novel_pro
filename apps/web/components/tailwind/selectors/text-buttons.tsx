import { Button } from "@/components/tailwind/ui/button";
import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "novel";

// Define custom SVG icons to ensure they display properly
const BoldIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
  </svg>
);

const ItalicIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

const UnderlineIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </svg>
);

const StrikethroughIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 4H9a3 3 0 0 0-2.83 4" />
    <path d="M14 12a4 4 0 0 1 0 8H6" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

const CodeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16,18 22,12 16,6" />
    <polyline points="8,6 2,12 8,18" />
  </svg>
);

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  const items = [
    {
      name: "bold",
      isActive: () => editor.isActive("bold"),
      command: () => editor.chain().focus().toggleBold().run(),
      icon: BoldIcon,
    },
    {
      name: "italic",
      isActive: () => editor.isActive("italic"),
      command: () => editor.chain().focus().toggleItalic().run(),
      icon: ItalicIcon,
    },
    {
      name: "underline",
      isActive: () => editor.isActive("underline"),
      command: () => editor.chain().focus().toggleUnderline().run(),
      icon: UnderlineIcon,
    },
    {
      name: "strike",
      isActive: () => editor.isActive("strike"),
      command: () => editor.chain().focus().toggleStrike().run(),
      icon: StrikethroughIcon,
    },
    {
      name: "code",
      isActive: () => editor.isActive("code"),
      command: () => editor.chain().focus().toggleCode().run(),
      icon: CodeIcon,
    },
  ];

  return (
    <div className="flex">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <EditorBubbleItem
            key={item.name}
            onSelect={() => {
              item.command();
            }}
          >
            <Button size="sm" className="rounded-none" variant="ghost" type="button">
              <Icon />
              <span
                className={cn("text-xs ml-1", {
                  "text-blue-500": item.isActive(),
                  "text-gray-600": !item.isActive(),
                })}
              >
                {item.name.charAt(0).toUpperCase()}
              </span>
            </Button>
          </EditorBubbleItem>
        );
      })}
    </div>
  );
};
