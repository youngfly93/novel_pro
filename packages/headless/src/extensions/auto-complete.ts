import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

interface AutoCompleteState {
  ghostText: string;
  isLoading: boolean;
  abortController?: AbortController;
  requestId?: string;
  isComposing?: boolean;
}

const AUTOCOMPLETE_PLUGIN_KEY = new PluginKey("autoComplete");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    autoComplete: {
      setGhostText: (text: string) => ReturnType;
      clearGhostText: () => ReturnType;
      acceptGhostText: () => ReturnType;
      updateSettings: () => ReturnType;
    };
  }
}

export interface AutoCompleteOptions {
  delay: number;
  minLength: number;
  maxTokens: number;
  onRequest?: (prompt: string, abortController: AbortController) => Promise<ReadableStream | null>;
}

// Helper function to load settings from localStorage
const loadAutoCompleteSettings = () => {
  try {
    const saved = localStorage.getItem("novel-api-config");
    if (saved) {
      const config = JSON.parse(saved);
      return {
        delay: config.delay || 20,
        minLength: config.minLength || 3,
        maxTokens: config.maxTokens || 150,
      };
    }
  } catch (error) {
    console.error("Failed to load autocomplete settings:", error);
  }
  // Return defaults if loading fails
  return {
    delay: 20,
    minLength: 3,
    maxTokens: 150,
  };
};

export const AutoComplete = Extension.create<AutoCompleteOptions>({
  name: "autoComplete",

  addOptions() {
    const settings = loadAutoCompleteSettings();
    return {
      delay: settings.delay,
      minLength: settings.minLength,
      maxTokens: settings.maxTokens,
      onRequest: undefined,
    };
  },

  addCommands() {
    return {
      setGhostText:
        (text: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, { ghostText: text });
          }
          return true;
        },

      clearGhostText:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, { ghostText: "", isLoading: false });
          }
          return true;
        },

      acceptGhostText:
        () =>
        ({ tr, dispatch, state }) => {
          if (dispatch) {
            const pluginState = AUTOCOMPLETE_PLUGIN_KEY.getState(state) as AutoCompleteState;
            if (pluginState?.ghostText) {
              tr.insertText(pluginState.ghostText);
              tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, { ghostText: "", isLoading: false });
            }
          }
          return true;
        },

      updateSettings:
        () =>
        ({ editor }) => {
          // Reload settings from localStorage and update extension options
          const newSettings = loadAutoCompleteSettings();
          editor.extensionManager.extensions.forEach((extension) => {
            if (extension.name === "autoComplete") {
              extension.options = {
                ...extension.options,
                ...newSettings,
              };
            }
          });
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;
    let debounceTimer: NodeJS.Timeout | null = null;
    let activeRequestId: string | null = null;
    let lastTriggerTime = 0;
    
    // Enhanced cache for recent completions with larger size for better hit rate
    const completionCache = new Map<string, string>();
    const MAX_CACHE_SIZE = 50;

    const triggerCompletion = (view: EditorView) => {
      const { from } = view.state.selection;
      const textBefore = view.state.doc.textBetween(Math.max(0, from - 100), from);

      console.log('🔍 triggerCompletion called:', { textBefore: textBefore.trim(), length: textBefore.trim().length, minLength: options.minLength });

      // Quick minimum length check
      const trimmedText = textBefore.trim();
      if (trimmedText.length < options.minLength) {
        console.log('❌ Text too short, skipping completion');
        return;
      }

      // Quick code block check
      const $pos = view.state.selection.$from;
      if ($pos.parent.type.name === "codeBlock") {
        return;
      }
      
      const prompt = trimmedText;
      
      // Multiple cache key strategies for better hit rate
      const lastWords = textBefore.split(/\s+/).slice(-6).join(' ');
      const last3Words = textBefore.split(/\s+/).slice(-3).join(' ');
      const cacheKeys = [
        lastWords || prompt,
        last3Words || prompt,
        prompt.slice(-20), // Last 20 characters
        prompt
      ];
      
      // Check multiple cache keys for instant response
      for (const cacheKey of cacheKeys) {
        const cachedCompletion = completionCache.get(cacheKey);
        if (cachedCompletion) {
          console.log('⚡ Cache hit for:', cacheKey);
          // Instantly show cached completion
          view.dispatch(
            view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
              ghostText: cachedCompletion,
              isLoading: false,
              requestId: Date.now().toString(),
            }),
          );
          return;
        }
      }
      
      console.log('🌐 Cache miss, requesting new completion');
      requestCompletion(view, prompt);
    };

    const requestCompletion = async (view: EditorView, prompt: string) => {
      // Generate unique request ID
      const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      activeRequestId = requestId;

      const pluginState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;

      // Cancel any existing request
      if (pluginState.abortController) {
        pluginState.abortController.abort();
      }

      const abortController = new AbortController();

      try {
        // Set loading state
        view.dispatch(
          view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
            isLoading: true,
            abortController,
            requestId,
          }),
        );

        let stream: ReadableStream | null = null;

        if (options.onRequest) {
          // Use custom request handler if provided
          stream = await options.onRequest(prompt, abortController);
        } else {
          // Load API config from localStorage
          let apiConfig = null;
          try {
            const savedConfig = localStorage.getItem("novel-api-config");
            if (savedConfig) {
              apiConfig = JSON.parse(savedConfig);
            }
          } catch (_e) {
            // Ignore localStorage errors
          }

          // Default API request
          const requestBody: {
            prompt: string;
            option: string;
            stream: boolean;
            maxTokens?: number;
            apiConfig?: unknown;
          } = {
            prompt,
            option: "autocomplete",
            stream: true,
            maxTokens: options.maxTokens,
          };

          if (apiConfig) {
            requestBody.apiConfig = apiConfig;
          }

          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          stream = response.body;
        }

        if (!stream) {
          throw new Error("No response stream");
        }
        const reader = stream.getReader();
        let accumulatedText = "";

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              // Handle both SSE format and direct OpenRouter stream format
              let dataToProcess = null;

              if (line.startsWith("data: ")) {
                // SSE format
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr.trim() === "[DONE]") {
                    continue;
                  }
                  dataToProcess = JSON.parse(jsonStr);
                } catch (_e) {
                  continue;
                }
              } else if (line.trim()?.startsWith("{")) {
                // Direct JSON format (OpenRouter stream)
                try {
                  dataToProcess = JSON.parse(line.trim());
                } catch (_e) {
                  continue;
                }
              } else if (line.trim()) {
                continue;
              }

              if (dataToProcess) {
                const content = dataToProcess.choices?.[0]?.delta?.content;
                if (content) {
                  accumulatedText += content;

                  // Only update if this is still the active request
                  if (activeRequestId === requestId) {
                    // Clean up the accumulated text to remove any overlap with input
                    let cleanedText = accumulatedText;
                    
                    // Remove the prompt from the beginning if it's duplicated
                    const promptLower = prompt.toLowerCase();
                    const cleanedLower = cleanedText.toLowerCase();
                    
                    if (cleanedLower.startsWith(promptLower)) {
                      cleanedText = accumulatedText.substring(prompt.length);
                    }
                    
                    // Also handle partial overlaps at word boundaries
                    const promptWords = prompt.split(/\s+/);
                    const lastPromptWord = promptWords[promptWords.length - 1]?.toLowerCase();
                    
                    if (lastPromptWord && cleanedText.toLowerCase().startsWith(lastPromptWord)) {
                      // Find where the overlap ends
                      const words = cleanedText.split(/\s+/);
                      if (words[0]?.toLowerCase() === lastPromptWord) {
                        cleanedText = cleanedText.substring(words[0].length).trimStart();
                      }
                    }

                    // Update ghost text in real-time, keep loading state until stream completes
                    view.dispatch(
                      view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                        ghostText: cleanedText,
                        isLoading: true, // Keep loading state until stream completes
                        requestId,
                      }),
                    );
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          
          // Cache the completion for instant future use (use cleaned text)
          if (accumulatedText && prompt.length >= options.minLength) {
            // Apply cleaning logic to cached text too
            let cachedText = accumulatedText;
            
            const promptLower = prompt.toLowerCase();
            const cleanedLower = cachedText.toLowerCase();
            
            if (cleanedLower.startsWith(promptLower)) {
              cachedText = accumulatedText.substring(prompt.length);
            }
            
            const promptWords = prompt.split(/\s+/);
            const lastPromptWord = promptWords[promptWords.length - 1]?.toLowerCase();
            
            if (lastPromptWord && cachedText.toLowerCase().startsWith(lastPromptWord)) {
              const words = cachedText.split(/\s+/);
              if (words[0]?.toLowerCase() === lastPromptWord) {
                cachedText = cachedText.substring(words[0].length).trimStart();
              }
            }
            
            // Use the same cache key logic as retrieval
            const lastWords = prompt.split(/\s+/).slice(-6).join(' ');
            const cacheKey = lastWords || prompt; // Fallback to full prompt if not enough words
            completionCache.set(cacheKey, cachedText);
            
            // Maintain cache size
            if (completionCache.size > MAX_CACHE_SIZE) {
              const firstKey = completionCache.keys().next().value;
              if (firstKey) {
                completionCache.delete(firstKey);
              }
            }
          }

          // Cancel any pending debounce timers to prevent them from clearing our ghost text
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }

          // Only finalize if this is still the active request
          if (activeRequestId === requestId) {
            if (accumulatedText) {
              // Apply the same cleaning logic for final text
              let finalCleanedText = accumulatedText;
              
              // Remove the prompt from the beginning if it's duplicated
              const promptLower = prompt.toLowerCase();
              const cleanedLower = finalCleanedText.toLowerCase();
              
              if (cleanedLower.startsWith(promptLower)) {
                finalCleanedText = accumulatedText.substring(prompt.length);
              }
              
              // Also handle partial overlaps at word boundaries
              const promptWords = prompt.split(/\s+/);
              const lastPromptWord = promptWords[promptWords.length - 1]?.toLowerCase();
              
              if (lastPromptWord && finalCleanedText.toLowerCase().startsWith(lastPromptWord)) {
                // Find where the overlap ends
                const words = finalCleanedText.split(/\s+/);
                if (words[0]?.toLowerCase() === lastPromptWord) {
                  finalCleanedText = finalCleanedText.substring(words[0].length).trimStart();
                }
              }

              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  ghostText: finalCleanedText,
                  isLoading: false, // Now we're done loading
                  requestId,
                }),
              );
            } else {
              // No content received, clear everything
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  ghostText: "",
                  isLoading: false,
                  requestId,
                }),
              );
            }
            // Clear active request ID after completion
            activeRequestId = null;
          }
        }
      } catch (_error) {
        // Silently handle errors except abort errors

        // Clear loading state on error
        view.dispatch(
          view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
            ghostText: "",
            isLoading: false,
          }),
        );
      }
    };

    return [
      new Plugin({
        key: AUTOCOMPLETE_PLUGIN_KEY,

        state: {
          init(): AutoCompleteState {
            return { ghostText: "", isLoading: false, isComposing: false };
          },

          apply(tr, state: AutoCompleteState): AutoCompleteState {
            const meta = tr.getMeta(AUTOCOMPLETE_PLUGIN_KEY);
            if (meta) {
              // Cancel existing request when setting new ghost text
              if (meta.ghostText !== undefined && state.abortController) {
                state.abortController.abort();
              }

              // Prevent accidental clearing of ghost text right after setting it
              if (meta.ghostText === "" && state.ghostText && state.ghostText.length > 0) {
                // If we're currently loading, refuse to clear the ghost text
                if (state.isLoading && meta.isLoading === undefined) {
                  return state; // Don't apply the clear operation
                }

                // Also block clearing if we just finished a request and no requestId provided
                if (meta.requestId === undefined && state.requestId && state.ghostText) {
                  return state;
                }
              }

              return { ...state, ...meta };
            }
            return state;
          },
        },

        props: {
          decorations(state) {
            const pluginState = AUTOCOMPLETE_PLUGIN_KEY.getState(state) as AutoCompleteState;

            // Don't show ghost text if no text
            if (!pluginState?.ghostText) {
              return DecorationSet.empty;
            }

            // Temporarily disable IME blocking to debug the stuck ghost text issue
            // TODO: Re-enable with better logic after confirming ghost text updates work
            // if (pluginState.isComposing) {
            //   return DecorationSet.empty;
            // }

            const { from } = state.selection;

            try {
              const ghostText = pluginState.ghostText;

              // Create a widget decoration to display the ghost text after the cursor
              // Use stable key to avoid unnecessary DOM recreation
              const uniqueKey = `ghost-text-${from}-${ghostText.length}`;
              const widget = Decoration.widget(
                from,
                () => {
                  const span = document.createElement("span");
                  span.className = "ghost-text";
                  span.style.cssText = `
                  color: #9ca3af !important; 
                  pointer-events: none; 
                  font-style: normal; 
                  font-weight: normal !important;
                  opacity: 0.5 !important; 
                  user-select: none !important;
                  position: relative !important;
                  display: inline !important;
                  white-space: nowrap !important;
                  font-size: inherit !important;
                `;
                  span.textContent = ghostText;
                  span.setAttribute("data-testid", "ghost-text");
                  span.setAttribute("data-ghost-content", ghostText);
                  span.setAttribute("contenteditable", "false");

                  return span;
                },
                {
                  side: 1, // Position after the cursor
                  marks: [],
                  key: uniqueKey, // Use unique key to force recreation
                },
              );

              return DecorationSet.create(state.doc, [widget]);
            } catch (_error) {
              return DecorationSet.empty;
            }
          },

          handleKeyDown(view, event) {
            const state = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;

            // Accept ghost text with Tab
            if (event.key === "Tab" && state?.ghostText) {
              event.preventDefault();
              editor.commands.acceptGhostText();
              return true;
            }

            // Clear ghost text with Escape
            if (event.key === "Escape" && state?.ghostText) {
              event.preventDefault();
              editor.commands.clearGhostText();
              return true;
            }

            // Clear ghost text on navigation keys
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
              if (state?.ghostText) {
                editor.commands.clearGhostText();
              }
            }

            // Clear ghost text on content-changing keys, but handle IME input carefully
            if (state?.ghostText && !state.isComposing) {
              const isEditingKey = event.key === "Enter" || 
                                  event.key === "Backspace" || 
                                  event.key === "Delete";
              
              const isTypedChar = event.key.length === 1 && 
                                 !event.ctrlKey && 
                                 !event.metaKey &&
                                 !event.altKey;
              
              // Clear on editing keys OR typed characters (when not composing)
              if (isEditingKey || isTypedChar) {
                console.log('🧹 Clearing ghost text on keydown:', event.key);
                view.dispatch(
                  view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                    ghostText: "",
                    isLoading: false,
                    requestId: Date.now().toString(),
                  }),
                );
              }
            }

            return false;
          },

          handleTextInput(view) {
            const pluginState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;

            // Don't do anything if IME is composing (state managed by composition events)
            if (pluginState.isComposing) {
              console.log('🚫 Skipping handleTextInput during IME composition');
              return false;
            }

            // Add throttling to prevent too frequent requests
            const now = Date.now();
            const MIN_TRIGGER_INTERVAL = 500; // Minimum 500ms between triggers
            
            if (now - lastTriggerTime < MIN_TRIGGER_INTERVAL) {
              console.log('🕒 Throttling: Too soon since last trigger');
              // Still clear ghost text but don't trigger new completion
              if (pluginState.ghostText) {
                view.dispatch(
                  view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                    ghostText: "",
                    isLoading: false,
                    requestId: Date.now().toString(),
                  }),
                );
              }
              return false;
            }

            // Clear existing ghost text when user continues typing
            if (pluginState.ghostText) {
              console.log('🧹 Clearing ghost text on handleTextInput');
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  ghostText: "",
                  isLoading: false,
                  requestId: Date.now().toString(),
                }),
              );
            }

            // Clear any stale cache entries periodically to prevent stuck content
            if (completionCache.size > MAX_CACHE_SIZE * 0.8) {
              completionCache.clear();
            }

            // Don't trigger new completion if we're currently loading
            if (pluginState.isLoading) {
              return false;
            }

            // Clear existing timer
            if (debounceTimer) {
              clearTimeout(debounceTimer);
            }

            // For very fast response, try immediate completion for cache hits
            // Then set up minimal delay for new requests
            
            // First, try immediate completion if we have cache
            const { from } = view.state.selection;
            const textBefore = view.state.doc.textBetween(Math.max(0, from - 100), from);
            const trimmedText = textBefore.trim();
            
            if (trimmedText.length >= options.minLength) {
              // Check cache immediately for instant response
              const lastWords = textBefore.split(/\s+/).slice(-6).join(' ');
              const last3Words = textBefore.split(/\s+/).slice(-3).join(' ');
              const cacheKeys = [
                lastWords || trimmedText,
                last3Words || trimmedText,
                trimmedText.slice(-20),
                trimmedText
              ];
              
              for (const cacheKey of cacheKeys) {
                const cachedCompletion = completionCache.get(cacheKey);
                if (cachedCompletion) {
                  console.log('⚡ Instant cache hit in handleTextInput');
                  view.dispatch(
                    view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                      ghostText: cachedCompletion,
                      isLoading: false,
                      requestId: Date.now().toString(),
                    }),
                  );
                  return false; // Exit early on cache hit
                }
              }
            }
            
            // Set up longer delay for new requests to avoid spam
            debounceTimer = setTimeout(() => {
              // Check again if we're still not loading and not composing before triggering
              const currentState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;
              if (currentState.isLoading || currentState.isComposing) {
                return;
              }

              lastTriggerTime = Date.now(); // Update last trigger time
              triggerCompletion(view);
            }, options.delay * 5); // Use longer delay to reduce frequency

            return false;
          },

          handleDOMEvents: {
            // Handle input events more carefully
            input(_view, _event) {
              // Let handleTextInput handle this instead to avoid double clearing
              return false;
            },

            compositionstart(view) {
              // IME composition started (e.g., Chinese pinyin input)
              console.log('🈲 IME composition started');
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  isComposing: true,
                  ghostText: "", // Clear ghost text when IME starts
                  isLoading: false,
                }),
              );
              
              // Clear any pending completion timers
              if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
              }
              
              return false;
            },

            compositionend(view) {
              // IME composition ended
              console.log('✅ IME composition ended');
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  isComposing: false,
                }),
              );
              
              // After IME ends, wait longer before triggering completion
              // This prevents triggering on every Chinese character input
              setTimeout(() => {
                const currentState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;
                if (!currentState.isComposing && !currentState.isLoading) {
                  triggerCompletion(view);
                }
              }, options.delay * 10); // Use much longer delay after IME input
              
              return false;
            },
          },
        },
      }),
    ];
  },
});
