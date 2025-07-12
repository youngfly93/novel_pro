import React from "react";
import { FileText } from "lucide-react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

interface PageReferenceAttributes {
  pageId: string | null;
  slug: string;
  title: string;
}

// React component for page reference
const PageReferenceComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const { slug, title } = node.attrs as PageReferenceAttributes;
  const [currentTitle, setCurrentTitle] = React.useState(title);

  // Listen for page title updates from localStorage
  React.useEffect(() => {
    const checkTitleUpdate = () => {
      const savedPages = localStorage.getItem("novel-pages");
      const pages = savedPages ? JSON.parse(savedPages) : {};

      // Only update existing pages, don't create new ones
      // Page creation should be handled by the actual page creation logic
      if (pages[slug] && pages[slug].title !== currentTitle) {
        setCurrentTitle(pages[slug].title);
        updateAttributes({ title: pages[slug].title });
      }

    // Check for updates periodically
    const interval = setInterval(checkTitleUpdate, 1000);

    // Also check when the page gains focus (user comes back from editing)
    const handleFocus = () => checkTitleUpdate();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [slug, currentTitle, updateAttributes]);

  const handleClick = () => {
    window.open(`/page/${slug}`, "_blank");
  };

  const handleTitleUpdate = (newTitle: string) => {
    setCurrentTitle(newTitle);
    updateAttributes({ title: newTitle });

    // Update title in localStorage
    const savedPages = localStorage.getItem("novel-pages");
    const pages = savedPages ? JSON.parse(savedPages) : {};

    if (pages[slug]) {
      pages[slug].title = newTitle;
      pages[slug].updatedAt = new Date().toISOString();
      localStorage.setItem("novel-pages", JSON.stringify(pages));
    }
  };

  return (
    <NodeViewWrapper className="page-reference-wrapper">
      <div
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors my-1 mx-1 max-w-md"
        onClick={handleClick}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <FileText className="h-4 w-4 text-gray-600 flex-shrink-0" />
        <span
          className="text-sm font-medium text-gray-800 truncate"
          contentEditable={true}
          suppressContentEditableWarning={true}
          onBlur={(e: React.FocusEvent<HTMLSpanElement>) => {
            const newTitle = e.target.textContent?.trim() || "Untitled";
            if (newTitle !== currentTitle) {
              handleTitleUpdate(newTitle);
            }
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLElement).blur();
            }
            // Prevent the click handler from being triggered
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {currentTitle || "Untitled"}
        </span>
      </div>
    </NodeViewWrapper>
  );
};

export const PageReference = Node.create({
  name: "pageReference",

  group: "inline",

  inline: true,

  selectable: true,

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-page-id"),
        renderHTML: (attributes) => {
          if (!attributes.pageId) return {};
          return { "data-page-id": attributes.pageId };
        },
      },
      slug: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-slug"),
        renderHTML: (attributes) => {
          if (!attributes.slug) return {};
          return { "data-slug": attributes.slug };
        },
      },
      title: {
        default: "Untitled",
        parseHTML: (element) => element.getAttribute("data-title") || "Untitled",
        renderHTML: (attributes) => {
          return { "data-title": attributes.title || "Untitled" };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="page-reference"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            pageId: element.getAttribute("data-page-id"),
            slug: element.getAttribute("data-slug"),
            title: element.getAttribute("data-title") || "Untitled",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-reference",
        "data-page-id": node.attrs.pageId,
        "data-slug": node.attrs.slug,
        "data-title": node.attrs.title,
      }),
      node.attrs.title || "Untitled",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageReferenceComponent);
  },
});
