"use client";

import { useState, useCallback, useEffect } from "react";
import { getFromStore, putInStore, deleteFromStore } from "@/lib/indexedDB";
import { DeviceType, ModelType, ImageInfo, DEFAULT_IMAGE_INFO, EditorState } from "@/types";

const STORE_NAME = "settings";
const CURRENT_SESSION_KEY = "currentSession";

export interface SessionData {
  key: string;
  originalImage: string | null;
  processedImage: string | null;
  finalImage: string | null;
  device: DeviceType;
  model: ModelType;
  imageInfo: ImageInfo;
  editorState: Partial<EditorState>;
  timestamp: number;
}

const DEFAULT_SESSION: SessionData = {
  key: CURRENT_SESSION_KEY,
  originalImage: null,
  processedImage: null,
  finalImage: null,
  device: "gpu",
  model: "isnet_quint8",
  imageInfo: DEFAULT_IMAGE_INFO,
  editorState: {},
  timestamp: 0,
};

export function useSession() {
  const [session, setSession] = useState<SessionData>(DEFAULT_SESSION);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session from IndexedDB on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const saved = await getFromStore<SessionData>(STORE_NAME, CURRENT_SESSION_KEY);
        if (saved) {
          setSession(saved);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSession();
  }, []);

  // Save session to IndexedDB
  const saveSession = useCallback(async (data: Partial<SessionData>) => {
    const newSession = {
      ...session,
      ...data,
      key: CURRENT_SESSION_KEY,
      timestamp: Date.now(),
    };
    setSession(newSession);

    try {
      await putInStore(STORE_NAME, newSession);
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }, [session]);

  // Clear session
  const clearSession = useCallback(async () => {
    setSession(DEFAULT_SESSION);
    try {
      await deleteFromStore(STORE_NAME, CURRENT_SESSION_KEY);
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  }, []);

  return {
    session,
    saveSession,
    clearSession,
    isLoaded,
  };
}
