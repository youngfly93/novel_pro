"use client";

import { ApiKeyManager } from "@/components/api-key-manager";
import BackgroundSettings from "@/components/background-settings";
import { useBackground } from "@/contexts/background-context";

export default function SettingsPage() {
  const { backgroundImage } = useBackground();

  return (
    <div className={`min-h-screen py-12 px-4 ${!backgroundImage ? "bg-gradient-to-br from-gray-50 to-gray-100" : ""}`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-700 text-lg">Configure your AI API settings and customize your editor experience</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ApiKeyManager />
          <BackgroundSettings />
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            ← Back to Editor
          </a>
        </div>
      </div>
    </div>
  );
}
