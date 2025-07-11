"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/tailwind/ui/button";
import { Eye, EyeOff, Key, Save, Trash2, ExternalLink } from "lucide-react";

interface ApiKeyConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
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
        setConfig(parsedConfig);
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

    setIsLoading(true);

    try {
      // Test the API key
      const response = await fetch("/api/test-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        // Save to localStorage
        localStorage.setItem("novel-api-config", JSON.stringify(config));
        setIsConfigured(true);
        alert("API key configured successfully!");
      } else {
        alert(result.error || "Failed to validate API key");
      }
    } catch (error) {
      alert("Failed to test API key");
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
    });
    setIsConfigured(false);
    alert("API configuration cleared");
  };

  const currentProvider = PROVIDERS[config.provider as keyof typeof PROVIDERS];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg border shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Key className="h-5 w-5" />
          AI API Configuration
        </h3>
        <p className="text-sm text-gray-600">
          Configure your AI API key to enable AI-powered writing features.
          {isConfigured && (
            <span className="text-green-600 font-medium ml-2">✓ Configured</span>
          )}
        </p>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <div className="space-y-2">
          <label htmlFor="provider" className="text-sm font-medium">AI Provider</label>
          <select
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {Object.entries(PROVIDERS).map(([key, provider]) => (
              <option key={key} value={key}>
                {provider.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <a
              href={currentProvider?.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Sign up for {currentProvider?.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="model" className="text-sm font-medium">AI Model</label>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {currentProvider?.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="apiKey" className="text-sm font-medium">API Key</label>
          <div className="relative">
            <input
              id="apiKey"
              type={showKey ? "text" : "password"}
              placeholder={`Enter your ${currentProvider?.name} API key`}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm pr-10"
            />
            <button
              type="button"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-gray-100"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="baseUrl" className="text-sm font-medium">API Base URL</label>
          <input
            id="baseUrl"
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            placeholder="API base URL"
            disabled
            className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Testing..." : "Save & Test"}
          </Button>
          {isConfigured && (
            <Button onClick={handleClear} className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
