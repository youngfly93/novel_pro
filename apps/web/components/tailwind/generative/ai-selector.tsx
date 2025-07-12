"use client";

import { Command, CommandInput } from "@/components/tailwind/ui/command";

import { useCompletion } from "ai/react";
import { ArrowUp, Settings } from "lucide-react";
import { useEditor } from "novel";
import { addAIHighlight } from "novel";
import { useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "../ui/button";
import CrazySpinner from "../ui/icons/crazy-spinner";
import Magic from "../ui/icons/magic";
import { ScrollArea } from "../ui/scroll-area";
import AICompletionCommands from "./ai-completion-command";
import AISelectorCommands from "./ai-selector-commands";
import { useApiConfig } from "@/hooks/use-api-config";
//TODO: I think it makes more sense to create a custom Tiptap extension for this functionality https://tiptap.dev/docs/editor/ai/introduction

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState("");
  const { config, hasValidConfig, isLoaded } = useApiConfig();

  const { completion, complete, isLoading } = useCompletion({
    // id: "novel",
    api: "/api/generate",
    body: {
      apiConfig: config, // Include user's API configuration
    },
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error("You have reached your request limit for the day.");
        return;
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const hasCompletion = completion.length > 0;

  // Show API configuration prompt if not configured
  if (isLoaded && !hasValidConfig) {
    console.log("AI Selector: No valid config found", { config, hasValidConfig, isLoaded });
    return (
      <Command className="w-[350px]">
        <div className="p-4 text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-purple-100 rounded-full">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Configure AI API</h3>
            <p className="text-sm text-gray-500 mt-1">Set up your API key to enable AI-powered writing features</p>
          </div>
          <Button
            onClick={() => window.open("/settings", "_blank")}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Open Settings
          </Button>
        </div>
      </Command>
    );
  }

  console.log("AI Selector: Valid config found", { config, hasValidConfig, isLoaded });

  return (
    <Command className="w-[350px]">
      {hasCompletion && (
        <div className="flex max-h-[400px]">
          <ScrollArea>
            <div className="prose p-2 px-4 prose-sm">
              <Markdown>{completion}</Markdown>
            </div>
          </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-muted-foreground text-purple-500">
          <Magic className="mr-2 h-4 w-4 shrink-0  " />
          AI is thinking
          <div className="ml-2 mt-1">
            <CrazySpinner />
          </div>
        </div>
      )}
      {!isLoading && (
        <>
          <div className="relative">
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
              placeholder={hasCompletion ? "Tell AI what to do next" : "Ask AI to edit or generate..."}
              onFocus={() => addAIHighlight(editor)}
            />
            <Button
              size="icon"
              className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-900"
              onClick={() => {
                if (completion)
                  return complete(completion, {
                    body: { option: "zap", command: inputValue, apiConfig: config },
                  }).then(() => setInputValue(""));

                const slice = editor.state.selection.content();
                const text = editor.storage.markdown.serializer.serialize(slice.content);

                complete(text, {
                  body: { option: "zap", command: inputValue, apiConfig: config },
                }).then(() => setInputValue(""));
              }}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          {hasCompletion ? (
            <AICompletionCommands
              onDiscard={() => {
                editor.chain().unsetHighlight().focus().run();
                onOpenChange(false);
              }}
              completion={completion}
            />
          ) : (
            <AISelectorCommands
              onSelect={(value, option) => complete(value, { body: { option, apiConfig: config } })}
            />
          )}
        </>
      )}
    </Command>
  );
}
