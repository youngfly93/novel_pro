"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/tailwind/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/tailwind/ui/card";
import { Upload, X, RotateCcw, Image as ImageIcon } from "lucide-react";
import { useBackground } from "@/contexts/background-context";

export default function BackgroundSettings() {
  const { backgroundImage, opacity, setBackgroundImage, setOpacity } = useBackground();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert file to base64 and store locally
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("请选择有效的图片文件");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("图片文件大小不能超过 5MB");
      return;
    }

    setIsLoading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        
        setBackgroundImage(base64String);
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        alert("读取图片文件失败");
        setIsLoading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("处理图片时出错");
      setIsLoading(false);
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove background
  const handleRemoveBackground = () => {
    setBackgroundImage(null);
  };

  // Update opacity
  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          背景设置
        </CardTitle>
        <CardDescription>
          设置自定义背景图片，支持 JPG、PNG、GIF 等格式
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Background Preview */}
        {backgroundImage && (
          <div className="space-y-3">
            <div className="relative">
              <div 
                className="w-full h-32 rounded-lg border-2 border-dashed border-gray-200 bg-cover bg-center bg-no-repeat"
                style={{ 
                  backgroundImage: `url(${backgroundImage})`,
                  opacity: Math.min(opacity + 0.2, 1) // Preview with slightly higher opacity, max 1
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                <span className="text-white text-sm font-medium">当前背景预览</span>
              </div>
            </div>
            
            {/* Opacity Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                透明度: {Math.round(opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={opacity}
                onChange={(e) => handleOpacityChange(Number.parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>100%</span>
              </div>
              
              {/* Quick opacity presets */}
              <div className="flex gap-2 mt-2">
                <span className="text-xs text-gray-600">快速设置:</span>
                {[0.1, 0.2, 0.3, 0.5, 0.8].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleOpacityChange(preset)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      Math.abs(opacity - preset) < 0.05
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {Math.round(preset * 100)}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Button
            onClick={handleUploadClick}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isLoading ? "上传中..." : "选择背景图片"}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            支持 JPG、PNG、GIF 格式，文件大小不超过 5MB
          </p>
        </div>

        {/* Action Buttons */}
        {backgroundImage && (
          <div className="flex gap-2">
            <Button
              onClick={handleRemoveBackground}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" />
              移除背景
            </Button>
            <Button
              onClick={() => handleOpacityChange(0.2)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              重置透明度
            </Button>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 提示：背景图片会自动保存在本地，下次打开时会记住您的设置
          </p>
        </div>
      </CardContent>
    </Card>
  );
}