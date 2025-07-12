"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Key, Save, Trash2, ExternalLink } from "lucide-react";

interface ApiKeyConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
  // Autocomplete settings
  maxTokens: number;
  delay: number;
  minLength: number;
}

const PROVIDERS = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B (Free)" },
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
    ],
    signupUrl: "https://openrouter.ai/",
    keyPrefix: "sk-or-",
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
    signupUrl: "https://platform.openai.com/signup",
    keyPrefix: "sk-",
  },
};

export function ApiKeyManager() {
  const [config, setConfig] = useState<ApiKeyConfig>({
    apiKey: "",
    baseUrl: "",
    model: "",
    provider: "openrouter",
    // Default autocomplete settings
    maxTokens: 150,
    delay: 20,
    minLength: 3,
  });
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Load saved configuration from localStorage
    const saved = localStorage.getItem("novel-api-config");
    if (saved) {
      try {
        const parsedConfig = JSON.parse(saved);
        // Ensure baseUrl is set from provider if not present
        const provider = PROVIDERS[parsedConfig.provider as keyof typeof PROVIDERS];
        if (provider && !parsedConfig.baseUrl) {
          parsedConfig.baseUrl = provider.baseUrl;
        }
        // Set default values for new autocomplete settings if not present
        const configWithDefaults = {
          maxTokens: 150,
          delay: 20,
          minLength: 3,
          ...parsedConfig,
        };
        setConfig(configWithDefaults);
        setIsConfigured(!!parsedConfig.apiKey);
      } catch (error) {
        console.error("Failed to parse saved config:", error);
      }
    }
  }, []);

  const handleProviderChange = (provider: string) => {
    const providerConfig = PROVIDERS[provider as keyof typeof PROVIDERS];
    setConfig({
      ...config,
      provider,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.models[0].id,
    });
  };

  const handleSave = async () => {
    if (!config.apiKey.trim()) {
      alert("Please enter an API key");
      return;
    }

    const provider = PROVIDERS[config.provider as keyof typeof PROVIDERS];
    if (!config.apiKey.startsWith(provider.keyPrefix)) {
      alert(`${provider.name} API keys should start with "${provider.keyPrefix}"`);
      return;
    }

    if (!config.model) {
      alert("Please select a model");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare the test configuration with proper baseUrl
      const testConfig = {
        ...config,
        baseUrl: config.baseUrl || provider.baseUrl, // Use provider's baseUrl if not set
        provider: config.provider,
      };

      // Test the API key
      const response = await fetch("/api/test-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testConfig),
      });

      const result = await response.json();

      if (result.success) {
        // Save to localStorage with proper baseUrl
        const configToSave = {
          ...config,
          baseUrl: config.baseUrl || provider.baseUrl,
        };
        localStorage.setItem("novel-api-config", JSON.stringify(configToSave));
        setConfig(configToSave);
        setIsConfigured(true);
        alert("API key and autocomplete settings configured successfully! Changes will take effect when you reload the editor.");
      } else {
        alert(result.error || "Failed to validate API key");
      }
    } catch (error) {
      console.error("API key test error:", error);
      alert("Failed to test API key. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem("novel-api-config");
    setConfig({
      apiKey: "",
      baseUrl: "",
      model: "",
      provider: "openrouter",
      // Reset autocomplete settings to defaults
      maxTokens: 150,
      delay: 20,
      minLength: 3,
    });
    setIsConfigured(false);
    alert("API configuration cleared");
  };

  const currentProvider = PROVIDERS[config.provider as keyof typeof PROVIDERS];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg border shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2 text-gray-900">
          <Key className="h-5 w-5 text-gray-700" />
          AI API Configuration
        </h3>
        <p className="text-sm text-gray-700">
          Configure your AI API key to enable AI-powered writing features.
          {isConfigured && <span className="text-green-600 font-medium ml-2">✓ Configured</span>}
        </p>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <div className="space-y-2">
          <label htmlFor="provider" className="text-sm font-medium text-gray-900">
            AI Provider
          </label>
          <select
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(PROVIDERS).map(([key, provider]) => (
              <option key={key} value={key} className="text-gray-900">
                {provider.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-700">
            Don't have an account?{" "}
            <a
              href={currentProvider?.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Sign up for {currentProvider?.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="model" className="text-sm font-medium text-gray-900">
            AI Model
          </label>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {currentProvider?.models.map((model) => (
              <option key={model.id} value={model.id} className="text-gray-900">
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="apiKey" className="text-sm font-medium text-gray-900">
            API Key
          </label>
          <div className="relative">
            <input
              id="apiKey"
              type={showKey ? "text" : "password"}
              placeholder={`Enter your ${currentProvider?.name} API key`}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 pr-10 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              className="absolute right-0 top-0 h-full px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-r-md"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-sm text-gray-700">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="baseUrl" className="text-sm font-medium text-gray-900">
            API Base URL
          </label>
          <input
            id="baseUrl"
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            placeholder="API base URL"
            disabled
            className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
          />
        </div>

        {/* Autocomplete Settings Section */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Autocomplete Settings</h3>
          <p className="text-sm text-gray-600 mb-4">
            Customize how the AI autocomplete behaves. Changes take effect when you reload the editor.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="maxTokens" className="text-sm font-medium text-gray-900">
                Text Length (tokens)
              </label>
              <input
                id="maxTokens"
                type="number"
                min="10"
                max="500"
                step="10"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 150 })}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600">Controls how much text to predict (10-500)</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="delay" className="text-sm font-medium text-gray-900">
                Delay (ms)
              </label>
              <input
                id="delay"
                type="number"
                min="0"
                max="2000"
                step="10"
                value={config.delay}
                onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) || 20 })}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600">Delay before triggering autocomplete (0-2000ms)</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="minLength" className="text-sm font-medium text-gray-900">
                Min Characters
              </label>
              <input
                id="minLength"
                type="number"
                min="1"
                max="20"
                value={config.minLength}
                onChange={(e) => setConfig({ ...config, minLength: parseInt(e.target.value) || 3 })}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600">Minimum characters before triggering (1-20)</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Testing..." : "Save & Test"}
          </button>
          {isConfigured && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
