import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

interface AutoCompleteState {
  ghostText: string;
  isLoading: boolean;
  abortController?: AbortController;
  requestId?: string;
}

const AUTOCOMPLETE_PLUGIN_KEY = new PluginKey("autoComplete");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    autoComplete: {
      setGhostText: (text: string) => ReturnType;
      clearGhostText: () => ReturnType;
      acceptGhostText: () => ReturnType;
    };
  }
}

export interface AutoCompleteOptions {
  delay: number;
  minLength: number;
  maxTokens: number;
  onRequest?: (prompt: string, abortController: AbortController) => Promise<ReadableStream | null>;
}

export const AutoComplete = Extension.create<AutoCompleteOptions>({
  name: "autoComplete",

  addOptions() {
    return {
      delay: 500,
      minLength: 15,
      maxTokens: 50,
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
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;
    let debounceTimer: NodeJS.Timeout | null = null;
    let activeRequestId: string | null = null;

    const triggerCompletion = (view: EditorView) => {
      const { from } = view.state.selection;
      const textBefore = view.state.doc.textBetween(Math.max(0, from - 100), from);

      // Check minimum length requirement
      if (textBefore.trim().length < options.minLength) {
        return;
      }

      // Don't trigger if we're in a code block or similar
      const $pos = view.state.selection.$from;
      if ($pos.parent.type.name === "codeBlock") {
        return;
      }
      requestCompletion(view, textBefore.trim());
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
          } catch (e) {
            // Ignore localStorage errors
          }

          // Default API request
          const requestBody: {
            prompt: string;
            option: string;
            stream: boolean;
            apiConfig?: unknown;
          } = {
            prompt,
            option: "autocomplete",
            stream: true,
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
                } catch (e) {
                  continue;
                }
              } else if (line.trim()?.startsWith("{")) {
                // Direct JSON format (OpenRouter stream)
                try {
                  dataToProcess = JSON.parse(line.trim());
                } catch (e) {
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
                    // Update ghost text in real-time, keep loading state until stream completes
                    view.dispatch(
                      view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                        ghostText: accumulatedText,
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

          // Cancel any pending debounce timers to prevent them from clearing our ghost text
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }

          // Only finalize if this is still the active request
          if (activeRequestId === requestId) {
            if (accumulatedText) {
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  ghostText: accumulatedText,
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
      } catch (error) {
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
            return { ghostText: "", isLoading: false };
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

            if (!pluginState?.ghostText) {
              return DecorationSet.empty;
            }

            const { from } = state.selection;

            try {
              const ghostText = pluginState.ghostText;

              // Create a widget decoration to display the ghost text after the cursor
              // Use a unique key to force recreation when text changes
              const uniqueKey = `ghost-text-${ghostText.length}-${Date.now()}`;
              const widget = Decoration.widget(
                from,
                () => {
                  const span = document.createElement("span");
                  span.className = "ghost-text";
                  span.style.cssText = `
                  color: #ef4444 !important; 
                  pointer-events: none; 
                  font-style: normal; 
                  font-weight: bold !important;
                  opacity: 1 !important; 
                  background: rgba(239, 68, 68, 0.1) !important; 
                  padding: 2px 6px !important; 
                  border-radius: 4px !important;
                  user-select: none !important;
                  position: relative !important;
                  z-index: 999 !important;
                  border: 2px solid #ef4444 !important;
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
            } catch (error) {
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

            return false;
          },

          handleTextInput(view) {
            const pluginState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;

            // Clear existing ghost text immediately when user continues typing
            if (pluginState.ghostText && !pluginState.isLoading) {
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  ghostText: "",
                  isLoading: false,
                  requestId: Date.now().toString(),
                }),
              );
            }

            // Don't trigger new completion if we're currently loading
            if (pluginState.isLoading) {
              return false;
            }

            // Clear existing timer
            if (debounceTimer) {
              clearTimeout(debounceTimer);
            }

            // Set up debounced completion trigger
            debounceTimer = setTimeout(() => {
              // Check again if we're still not loading before triggering
              const currentState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;
              if (currentState.isLoading) {
                return;
              }

              triggerCompletion(view);
            }, options.delay);

            return false;
          },
        },
      }),
    ];
  },
});
