"use client";

import { useState, useEffect } from "react";

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
}

export function useApiConfig() {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load configuration from localStorage on client side
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("novel-api-config");
      if (saved) {
        try {
          const parsedConfig = JSON.parse(saved);
          setConfig(parsedConfig);
        } catch (error) {
          console.error("Failed to parse saved API config:", error);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  const updateConfig = (newConfig: ApiConfig) => {
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem("novel-api-config", JSON.stringify(newConfig));
    }
  };

  const clearConfig = () => {
    setConfig(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("novel-api-config");
    }
  };

  const hasValidConfig = () => {
    return config && config.apiKey && config.baseUrl && config.model;
  };

  return {
    config,
    isLoaded,
    updateConfig,
    clearConfig,
    hasValidConfig: hasValidConfig(),
  };
}
