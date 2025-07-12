"use client";
import { defaultEditorContent } from "@/lib/content";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { useEffect, useState, useRef, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { ColorSelector } from "./selectors/color-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { NodeSelector } from "./selectors/node-selector";
import { Separator } from "./ui/separator";
import { EnhancedDragHandle, DragHandleMenuComponent } from "./enhanced-drag-handle";

import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { uploadFn } from "./image-upload";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";

const hljs = require("highlight.js");

// Remove GlobalDragHandle from defaultExtensions and add our custom one
const extensionsWithoutDragHandle = defaultExtensions.filter(
  (ext) => ext.name !== "globalDragHandle" && ext.name !== "GlobalDragHandle",
);
const extensions = [...extensionsWithoutDragHandle, slashCommand, EnhancedDragHandle];

interface TailwindAdvancedEditorProps {
  initialContent?: JSONContent | null;
  onUpdate?: (content: JSONContent) => void;
  pageTitle?: string;
  darkMode?: boolean;
}

const TailwindAdvancedEditor = ({
  initialContent: propInitialContent,
  onUpdate: propOnUpdate,
  darkMode = false,
}: TailwindAdvancedEditorProps = {}) => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    doc.querySelectorAll("pre code").forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const saveContent = useCallback(
    async (editor: EditorInstance) => {
      const json = editor.getJSON();
      setCharsCount(editor.storage.characterCount.words());

      if (propOnUpdate) {
        // Use custom update handler for page-specific content
        propOnUpdate(json);
      } else {
        // Default behavior for main editor
        window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
        window.localStorage.setItem("novel-content", JSON.stringify(json));
        window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
      }
      setSaveStatus("Saved");
    },
    [propOnUpdate],
  );

  const debouncedUpdates = useDebouncedCallback(saveContent, 500);

  // Store editor instance ref for force save
  const editorRef = useRef<EditorInstance | null>(null);

  // Listen for force save events from page creation
  useEffect(() => {
    const handleForceSave = () => {
      if (editorRef.current) {
        saveContent(editorRef.current);
      }
    };

    window.addEventListener("forceSave", handleForceSave);
    return () => {
      window.removeEventListener("forceSave", handleForceSave);
    };
  }, [saveContent]);

  useEffect(() => {
    if (propInitialContent !== undefined) {
      // Use provided initial content
      if (propInitialContent === null) {
        // For null initial content (new pages), use empty content
        setInitialContent({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [],
            },
          ],
        });
      } else {
        setInitialContent(propInitialContent);
      }
    } else {
      // Default behavior - load from localStorage
      const content = window.localStorage.getItem("novel-content");
      if (content) setInitialContent(JSON.parse(content));
      else setInitialContent(defaultEditorContent);
    }
  }, [propInitialContent]);

  if (!initialContent) return null;

  return (
    <div className={`relative w-full ${darkMode ? "dark" : ""}`}>
      <div className="flex absolute right-8 top-8 z-10 mb-5 gap-2">
        <div
          className={`rounded-lg px-2 py-1 text-sm ${darkMode ? "bg-gray-700 text-gray-300" : "bg-accent text-muted-foreground"}`}
        >
          {saveStatus}
        </div>
        <div
          className={
            charsCount
              ? `rounded-lg px-2 py-1 text-sm ${darkMode ? "bg-gray-700 text-gray-300" : "bg-accent text-muted-foreground"}`
              : "hidden"
          }
        >
          {charsCount} Words
        </div>
      </div>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className={`editor-a4-layout ${darkMode ? "dark" : ""} relative sm:mb-[calc(10vh)] sm:rounded-lg`}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class: darkMode
                ? "prose prose-lg prose-invert prose-headings:font-title font-default focus:outline-none max-w-none text-white"
                : "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-none",
            },
          }}
          onUpdate={({ editor }) => {
            editorRef.current = editor;
            debouncedUpdates(editor);
            setSaveStatus("Unsaved");
          }}
          slotAfter={
            <>
              <ImageResizer />
              {editorRef.current && <DragHandleMenuComponent editor={editorRef.current} />}
            </>
          }
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />

            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default TailwindAdvancedEditor;
