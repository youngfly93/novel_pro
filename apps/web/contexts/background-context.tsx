"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface BackgroundContextType {
  backgroundImage: string | null;
  opacity: number;
  setBackgroundImage: (image: string | null) => void;
  setOpacity: (opacity: number) => void;
  applyBackground: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

const BACKGROUND_KEY = "novel-background-image";
const BACKGROUND_OPACITY_KEY = "novel-background-opacity";

interface BackgroundProviderProps {
  children: ReactNode;
}

export function BackgroundProvider({ children }: BackgroundProviderProps) {
  const [backgroundImage, setBackgroundImageState] = useState<string | null>(null);
  const [opacity, setOpacityState] = useState<number>(0.2);

  // Load saved settings on mount (client-side only)
  useEffect(() => {
    // Only run on client side to avoid SSR mismatch
    if (typeof window === "undefined") return;
    
    try {
      const savedBackground = localStorage.getItem(BACKGROUND_KEY);
      const savedOpacity = localStorage.getItem(BACKGROUND_OPACITY_KEY);
      
      if (savedBackground) {
        setBackgroundImageState(savedBackground);
      }
      
      if (savedOpacity) {
        setOpacityState(Number.parseFloat(savedOpacity));
      }
    } catch (error) {
      console.error("Failed to load background settings:", error);
    }
  }, []);

  // Apply background to document body
  const applyBackground = () => {
    // Only run on client side
    if (typeof window === "undefined") return;
    
    try {
      if (backgroundImage) {
        document.body.style.backgroundImage = `url(${backgroundImage})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundAttachment = "fixed";
        
        // Apply opacity using a pseudo-element approach
        const existingOverlay = document.getElementById("background-overlay");
        if (existingOverlay) {
          existingOverlay.remove();
        }
        
        const overlay = document.createElement("div");
        overlay.id = "background-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "white";
        overlay.style.opacity = (1 - opacity).toString();
        overlay.style.pointerEvents = "none";
        overlay.style.zIndex = "0";
        
        document.body.appendChild(overlay);
      } else {
        // Remove background
        document.body.style.backgroundImage = "";
        document.body.style.backgroundSize = "";
        document.body.style.backgroundPosition = "";
        document.body.style.backgroundRepeat = "";
        document.body.style.backgroundAttachment = "";
        
        const existingOverlay = document.getElementById("background-overlay");
        if (existingOverlay) {
          existingOverlay.remove();
        }
      }
    } catch (error) {
      console.error("Failed to apply background:", error);
    }
  };

  // Apply background whenever image or opacity changes
  useEffect(() => {
    applyBackground();
  }, [backgroundImage, opacity]);

  const setBackgroundImage = (image: string | null) => {
    setBackgroundImageState(image);
    
    // Only save to localStorage on client side
    if (typeof window === "undefined") return;
    
    try {
      if (image) {
        localStorage.setItem(BACKGROUND_KEY, image);
      } else {
        localStorage.removeItem(BACKGROUND_KEY);
      }
    } catch (error) {
      console.error("Failed to save background image:", error);
    }
  };

  const setOpacity = (newOpacity: number) => {
    setOpacityState(newOpacity);
    
    // Only save to localStorage on client side
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem(BACKGROUND_OPACITY_KEY, newOpacity.toString());
    } catch (error) {
      console.error("Failed to save background opacity:", error);
    }
  };

  const value: BackgroundContextType = {
    backgroundImage,
    opacity,
    setBackgroundImage,
    setOpacity,
    applyBackground,
  };

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}