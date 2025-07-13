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

// Debug helper function
const debug = (message: string, ...args: any[]) => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log(message, ...args);
  }
};

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

// Helper function to load settings from localStorage with SSR check
const loadAutoCompleteSettings = () => {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return {
      delay: 10,
      minLength: 3,
      maxTokens: 150,
    };
  }

  try {
    const saved = localStorage.getItem("novel-api-config");
    if (saved) {
      const config = JSON.parse(saved);
      return {
        delay: config.delay || 10,
        minLength: config.minLength || 3,
        maxTokens: config.maxTokens || 150,
      };
    }
  } catch (error) {
    console.error("Failed to load autocomplete settings:", error);
  }
  // Return defaults if loading fails
  return {
    delay: 10,
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
              // Use stored marks to preserve formatting
              const storedMarks = state.storedMarks;
              const { from } = state.selection;
              tr.insertText(pluginState.ghostText, from, from);
              if (storedMarks) {
                storedMarks.forEach((mark) => tr.addStoredMark(mark));
              }
              tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                ghostText: "",
                isLoading: false,
                requestId: "accepted", // Special ID to prevent immediate trigger
              });
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

    // Performance metrics
    const performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      prefetchHits: 0,
      avgResponseTime: 0,
      totalRequests: 0,
      print: () => {
        const hitRate =
          (performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100 || 0;
        debug("📊 AutoComplete Performance:", {
          cacheHitRate: `${hitRate.toFixed(1)}%`,
          cacheHits: performanceMetrics.cacheHits,
          cacheMisses: performanceMetrics.cacheMisses,
          prefetchHits: performanceMetrics.prefetchHits,
          avgResponseTime: `${performanceMetrics.avgResponseTime.toFixed(0)}ms`,
          totalRequests: performanceMetrics.totalRequests,
        });
      },
    };

    // Print metrics every 30 seconds in development
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      setInterval(() => performanceMetrics.print(), 30000);
    }

    // Enhanced LRU cache for recent completions with better eviction strategy
    const completionCache = new Map<string, string>();
    const MAX_CACHE_SIZE = 100; // Increased for better hit rate

    // LRU helper function to maintain cache size without clearing everything
    const maintainCacheSize = (cache: Map<string, string>) => {
      while (cache.size > MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
    };

    // Prefetch cache for predictive loading
    const prefetchCache = new Map<string, Promise<string>>();
    const MAX_PREFETCH_SIZE = 20;

    // Prefetch likely next completions
    const prefetchNextCompletions = (_view: EditorView, currentPrompt: string, currentCompletion: string) => {
      // Generate likely next prompts based on current completion
      const firstWords = currentCompletion.split(/\s+/).slice(0, 3).join(" ");
      const potentialPrompts = [
        `${currentPrompt} ${firstWords.split(/\s+/)[0]}`, // Next word
        `${currentPrompt} ${firstWords.split(/\s+/).slice(0, 2).join(" ")}`, // Next 2 words
      ];

      potentialPrompts.forEach((nextPrompt) => {
        const cacheKey = nextPrompt.slice(-30);

        // Skip if already cached or being prefetched
        if (completionCache.has(cacheKey) || prefetchCache.has(cacheKey)) {
          return;
        }

        // Create prefetch promise
        const prefetchPromise = requestCompletionAsync(nextPrompt, options)
          .then((completion) => {
            // Move to main cache when ready
            if (completion) {
              completionCache.set(cacheKey, completion);
              prefetchCache.delete(cacheKey);

              // Maintain cache size
              if (completionCache.size > MAX_CACHE_SIZE) {
                const firstKey = completionCache.keys().next().value;
                if (firstKey) completionCache.delete(firstKey);
              }
            }
            return completion;
          })
          .catch(() => {
            prefetchCache.delete(cacheKey);
            return "";
          });

        prefetchCache.set(cacheKey, prefetchPromise);

        // Maintain prefetch cache size
        if (prefetchCache.size > MAX_PREFETCH_SIZE) {
          const firstKey = prefetchCache.keys().next().value;
          if (firstKey) prefetchCache.delete(firstKey);
        }
      });
    };

    const triggerCompletion = (view: EditorView) => {
      const { from } = view.state.selection;
      const textBefore = view.state.doc.textBetween(Math.max(0, from - 100), from);

      debug("🔍 triggerCompletion called:", {
        textBefore: textBefore.trim(),
        length: textBefore.trim().length,
        minLength: options.minLength,
      });

      // Quick minimum length check
      const trimmedText = textBefore.trim();
      if (trimmedText.length < options.minLength) {
        debug("❌ Text too short, skipping completion");
        return;
      }

      // Quick code block check
      const $pos = view.state.selection.$from;
      if ($pos.parent.type.name === "codeBlock") {
        return;
      }

      const prompt = trimmedText;

      // Enhanced cache key strategies for better hit rate
      const words = textBefore.split(/\s+/);
      const lastWords = words.slice(-6).join(" ");
      const last3Words = words.slice(-3).join(" ");
      const last2Words = words.slice(-2).join(" ");
      const lastWord = words[words.length - 1] || "";

      // More granular cache keys for higher hit rate
      const cacheKeys = [
        lastWords || prompt,
        last3Words || prompt,
        last2Words || prompt,
        prompt.slice(-30), // Last 30 characters
        prompt.slice(-20), // Last 20 characters
        prompt.slice(-15), // Last 15 characters
        prompt,
      ];

      // Check multiple cache keys for instant response
      for (const cacheKey of cacheKeys) {
        const cachedCompletion = completionCache.get(cacheKey);
        if (cachedCompletion) {
          debug("⚡ Cache hit for:", cacheKey);
          performanceMetrics.cacheHits++;

          // Move to end for LRU (delete and re-add)
          completionCache.delete(cacheKey);
          completionCache.set(cacheKey, cachedCompletion);

          // Instantly show cached completion
          view.dispatch(
            view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
              ghostText: cachedCompletion,
              isLoading: false,
              requestId: Date.now().toString(),
            }),
          );

          // Prefetch next likely completions
          if (lastWord.length >= 2) {
            prefetchNextCompletions(view, prompt, cachedCompletion);
          }

          return;
        }
      }

      // Check prefetch cache
      for (const cacheKey of cacheKeys) {
        const prefetchPromise = prefetchCache.get(cacheKey);
        if (prefetchPromise) {
          debug("🔮 Prefetch hit for:", cacheKey);
          performanceMetrics.prefetchHits++;

          prefetchPromise.then((completion) => {
            // Only apply if still relevant
            const currentState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;
            if (!currentState.ghostText && !currentState.isLoading) {
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  ghostText: completion,
                  isLoading: false,
                  requestId: Date.now().toString(),
                }),
              );
            }
          });
          return;
        }
      }

      debug("🌐 Cache miss, requesting new completion");
      performanceMetrics.cacheMisses++;
      requestCompletion(view, prompt);
    };

    // Async version for prefetching (doesn't update UI)
    const requestCompletionAsync = async (prompt: string, opts: AutoCompleteOptions): Promise<string> => {
      const abortController = new AbortController();

      try {
        let apiConfig = null;
        try {
          if (typeof window !== "undefined") {
            const savedConfig = localStorage.getItem("novel-api-config");
            if (savedConfig) apiConfig = JSON.parse(savedConfig);
          }
        } catch (_e) {}

        const requestBody: {
          prompt: string;
          option: string;
          stream: boolean;
          maxTokens?: number;
          apiConfig?: unknown;
        } = {
          prompt,
          option: "autocomplete",
          stream: false, // Non-streaming for prefetch
          maxTokens: opts.maxTokens,
        };

        if (apiConfig) requestBody.apiConfig = apiConfig;

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        return data.text || "";
      } catch (_error) {
        return "";
      }
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
      const startTime = Date.now();

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
        let response: Response | null = null;

        if (options.onRequest) {
          // Use custom request handler if provided
          stream = await options.onRequest(prompt, abortController);
        } else {
          // Load API config from localStorage
          let apiConfig = null;
          try {
            if (typeof window !== "undefined") {
              const savedConfig = localStorage.getItem("novel-api-config");
              if (savedConfig) {
                apiConfig = JSON.parse(savedConfig);
              }
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
            stream: false, // Disable streaming for autocomplete to get complete sentences
            maxTokens: options.maxTokens,
          };

          if (apiConfig) {
            requestBody.apiConfig = apiConfig;
          }

          response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ API Error:", errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          // For non-streaming autocomplete, we don't use the body stream
          if (requestBody.stream) {
            stream = response.body;
          } else {
            stream = null; // We'll handle non-streaming differently
          }
        }

        let accumulatedText = "";

        if (stream) {
          // Streaming response (for other operations)
          const reader = stream.getReader();

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
                    debug("📝 Streaming content:", { chunk: content, total: accumulatedText });

                    // Only update if this is still the active request
                    if (activeRequestId === requestId) {
                      view.dispatch(
                        view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                          ghostText: accumulatedText,
                          isLoading: true,
                          requestId,
                        }),
                      );
                    }
                  }
                }
              }
            }
          } catch (streamError: any) {
            // If stream was aborted but we have accumulated text, still show it
            if (streamError.name === "AbortError" && accumulatedText && activeRequestId === requestId) {
              let cleanedText = accumulatedText;
              const promptLower = prompt.toLowerCase();
              const cleanedLower = cleanedText.toLowerCase();

              if (cleanedLower.startsWith(promptLower)) {
                cleanedText = accumulatedText.substring(prompt.length);
              }

              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  ghostText: cleanedText,
                  isLoading: false,
                  requestId,
                }),
              );
            }
            throw streamError;
          } finally {
            reader.releaseLock();
          }
        } else if (response) {
          // Non-streaming response (for autocomplete)
          // Read the response text from the existing response
          const responseText = await response.text();

          // Parse the response format (should be "0:"content"\n" format)
          const lines = responseText.split("\n").filter((line: string) => line.trim());
          for (const line of lines) {
            if (line.startsWith('0:"') && line.endsWith('"')) {
              // Extract content between 0:" and "
              accumulatedText = line
                .slice(3, -1)
                .replace(/\\"/g, '"')
                .replace(/\\n/g, "\n")
                .replace(/\\r/g, "\r")
                .replace(/\\t/g, "\t")
                .replace(/\\\\/g, "\\");
              break;
            }
          }
          debug("💬 Non-streaming response:", { content: accumulatedText });
        }

        // Process the accumulated text (now from either streaming or non-streaming)
        if (accumulatedText && activeRequestId === requestId) {
          // Clean the response text
          let finalCleanedText = accumulatedText;

          // Only remove if the AI literally repeated the entire prompt
          if (accumulatedText.startsWith(prompt)) {
            finalCleanedText = accumulatedText.substring(prompt.length).trim();
          }

          // Update the UI with the final result
          view.dispatch(
            view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
              ghostText: finalCleanedText || accumulatedText,
              isLoading: false,
              requestId,
            }),
          );

          // Cache the completion for instant future use
          if (accumulatedText && prompt.length >= options.minLength) {
            // Simple cleaning for cache - just remove exact prompt duplication
            let cachedText = accumulatedText;

            if (accumulatedText.startsWith(prompt)) {
              cachedText = accumulatedText.substring(prompt.length).trim();
            }

            // Store with multiple cache keys for better retrieval
            const words = prompt.split(/\s+/);
            const cacheKeysToStore = [
              words.slice(-6).join(" ") || prompt,
              words.slice(-3).join(" ") || prompt,
              words.slice(-2).join(" ") || prompt,
              prompt.slice(-30),
              prompt.slice(-20),
            ];

            // Store under multiple keys for better hit rate
            cacheKeysToStore.forEach((key) => {
              if (key?.trim()) {
                completionCache.set(key, cachedText);
              }
            });

            // Maintain cache size
            while (completionCache.size > MAX_CACHE_SIZE) {
              const firstKey = completionCache.keys().next().value;
              if (firstKey) {
                completionCache.delete(firstKey);
              }
            }
          }

          // Track performance metrics
          const responseTime = Date.now() - startTime;
          performanceMetrics.totalRequests++;
          performanceMetrics.avgResponseTime =
            (performanceMetrics.avgResponseTime * (performanceMetrics.totalRequests - 1) + responseTime) /
            performanceMetrics.totalRequests;

          // Cancel any pending debounce timers to prevent them from clearing our ghost text
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }

          // Clear active request ID after completion
          activeRequestId = null;
        } else if (activeRequestId === requestId) {
          // No content received, clear everything
          view.dispatch(
            view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
              ghostText: "",
              isLoading: false,
              requestId,
            }),
          );
          activeRequestId = null;
        }
      } catch (error: any) {
        // Only log non-abort errors
        if (error.name !== "AbortError") {
          console.error("❌ Autocomplete error:", error);
        }

        // Only clear ghost text on non-abort errors
        if (error.name !== "AbortError" && activeRequestId === requestId) {
          view.dispatch(
            view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
              ghostText: "",
              isLoading: false,
            }),
          );
        }
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

              // Split ghost text into lines if it contains newlines for better wrapping
              const ghostLines = ghostText.split("\n");

              const widget = Decoration.widget(
                from,
                () => {
                  if (ghostLines.length > 1) {
                    // For multi-line ghost text, create a container div
                    const container = document.createElement("div");
                    container.className = "ghost-text-container";

                    ghostLines.forEach((line, index) => {
                      const span = document.createElement("span");
                      span.className = "ghost-text-line";
                      span.style.display = index === 0 ? "inline" : "block";
                      span.textContent = line;
                      container.appendChild(span);

                      if (index < ghostLines.length - 1) {
                        container.appendChild(document.createElement("br"));
                      }
                    });

                    container.setAttribute("data-testid", "ghost-text");
                    container.setAttribute("data-ghost-content", ghostText);
                    container.setAttribute("contenteditable", "false");

                    return container;
                  } else {
                    // For single-line ghost text, use a span
                    const span = document.createElement("span");
                    span.className = "ghost-text";
                    span.textContent = ghostText;
                    span.setAttribute("data-testid", "ghost-text");
                    span.setAttribute("data-ghost-content", ghostText);
                    span.setAttribute("contenteditable", "false");

                    return span;
                  }
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

            // Check if we're in a code block - if so, let Tab work normally for indentation
            const $pos = view.state.selection.$from;
            if ($pos.parent.type.name === "codeBlock") {
              return false; // Let default Tab behavior work in code blocks
            }

            // Accept ghost text with Tab (only outside code blocks)
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
              const isEditingKey = event.key === "Enter" || event.key === "Backspace" || event.key === "Delete";

              const isTypedChar = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

              // Clear on editing keys OR typed characters (when not composing)
              if (isEditingKey || isTypedChar) {
                debug("🧹 Clearing ghost text on keydown:", event.key);
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
              debug("🚫 Skipping handleTextInput during IME composition");
              return false;
            }

            // Skip if we just accepted a completion to prevent immediate re-trigger
            if (pluginState.requestId === "accepted") {
              lastTriggerTime = Date.now(); // Update to prevent immediate trigger
              return false;
            }

            // Reduced throttling for faster response
            const now = Date.now();
            const MIN_TRIGGER_INTERVAL = 200; // Reduced from 500ms to 200ms

            if (now - lastTriggerTime < MIN_TRIGGER_INTERVAL) {
              debug("🕒 Throttling: Too soon since last trigger");
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
              debug("🧹 Clearing ghost text on handleTextInput");
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  ghostText: "",
                  isLoading: false,
                  requestId: Date.now().toString(),
                }),
              );
            }

            // Maintain cache size using LRU eviction instead of clearing everything
            maintainCacheSize(completionCache);

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
              const lastWords = textBefore.split(/\s+/).slice(-6).join(" ");
              const last3Words = textBefore.split(/\s+/).slice(-3).join(" ");
              const cacheKeys = [
                lastWords || trimmedText,
                last3Words || trimmedText,
                trimmedText.slice(-20),
                trimmedText,
              ];

              for (const cacheKey of cacheKeys) {
                const cachedCompletion = completionCache.get(cacheKey);
                if (cachedCompletion) {
                  debug("⚡ Instant cache hit in handleTextInput");

                  // Move to end for LRU (delete and re-add)
                  completionCache.delete(cacheKey);
                  completionCache.set(cacheKey, cachedCompletion);

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

            // Optimized delay for faster response
            const delay = pluginState.isComposing ? options.delay * 5 : options.delay; // Further reduced: 1x for normal, 5x for IME
            debounceTimer = setTimeout(() => {
              // Check again if we're still not loading and not composing before triggering
              const currentState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;
              if (currentState.isLoading || currentState.isComposing) {
                return;
              }

              lastTriggerTime = Date.now(); // Update last trigger time
              triggerCompletion(view);
            }, delay);

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
              debug("🈲 IME composition started");
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
              debug("✅ IME composition ended");
              view.dispatch(
                view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  isComposing: false,
                }),
              );

              // After IME ends, wait before triggering completion
              // This prevents triggering on every Chinese character input
              setTimeout(() => {
                const currentState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state) as AutoCompleteState;
                if (!currentState.isComposing && !currentState.isLoading) {
                  triggerCompletion(view);
                }
              }, options.delay * 3); // Further reduced from 5x to 3x for faster IME response

              return false;
            },
          },
        },
      }),
    ];
  },
});
