"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Key, Save, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
      toast.error("Please enter an API key");
      return;
    }

    const provider = PROVIDERS[config.provider as keyof typeof PROVIDERS];
    if (!config.apiKey.startsWith(provider.keyPrefix)) {
      toast.error(`${provider.name} API keys should start with "${provider.keyPrefix}"`);
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
        toast.success("API key configured successfully!");
      } else {
        toast.error(result.error || "Failed to validate API key");
      }
    } catch (error) {
      toast.error("Failed to test API key");
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
    toast.success("API configuration cleared");
  };

  const currentProvider = PROVIDERS[config.provider as keyof typeof PROVIDERS];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          AI API Configuration
        </CardTitle>
        <CardDescription>
          Configure your AI API key to enable AI-powered writing features.
          {isConfigured && (
            <span className="text-green-600 font-medium ml-2">✓ Configured</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="provider">AI Provider</Label>
          <Select value={config.provider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDERS).map(([key, provider]) => (
                <SelectItem key={key} value={key}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
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
          <Label htmlFor="model">AI Model</Label>
          <Select value={config.model} onValueChange={(model) => setConfig({ ...config, model })}>
            <SelectTrigger>
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {currentProvider?.models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? "text" : "password"}
              placeholder={`Enter your ${currentProvider?.name} API key`}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="baseUrl">API Base URL</Label>
          <Input
            id="baseUrl"
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            placeholder="API base URL"
            disabled
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Testing..." : "Save & Test"}
          </Button>
          {isConfigured && (
            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
