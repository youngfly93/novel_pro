// Tauri utilities for desktop app integration

// Check if running in Tauri desktop environment
export const isDesktop = (): boolean => {
  return typeof window !== "undefined" && !!(window as any).__TAURI__;
};

// Safe import of Tauri API functions
export const getTauriAPI = async () => {
  if (!isDesktop()) {
    return null;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return { invoke };
  } catch (error) {
    console.warn("Failed to load Tauri API:", error);
    return null;
  }
};

// Secure key storage for desktop app
export const saveApiKey = async (key: string, value: string): Promise<boolean> => {
  if (!isDesktop()) {
    // Fallback to localStorage for web
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const tauri = await getTauriAPI();
    if (!tauri) return false;

    await tauri.invoke("save_key", { key, value });
    return true;
  } catch (error) {
    console.error("Failed to save key:", error);
    return false;
  }
};

export const getApiKey = async (key: string): Promise<string | null> => {
  if (!isDesktop()) {
    // Fallback to localStorage for web
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  try {
    const tauri = await getTauriAPI();
    if (!tauri) return null;

    const value = await tauri.invoke<string>("get_key", { key });
    return value;
  } catch (error) {
    console.error("Failed to get key:", error);
    return null;
  }
};

export const deleteApiKey = async (key: string): Promise<boolean> => {
  if (!isDesktop()) {
    // Fallback to localStorage for web
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const tauri = await getTauriAPI();
    if (!tauri) return false;

    await tauri.invoke("delete_key", { key });
    return true;
  } catch (error) {
    console.error("Failed to delete key:", error);
    return false;
  }
};
