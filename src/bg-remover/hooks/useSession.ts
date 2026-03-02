'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getFromStore, putInStore, deleteFromStore } from '@/bg-remover/lib/indexedDB';
import { DeviceType, ModelType, ImageInfo, DEFAULT_IMAGE_INFO, EditorState } from '@/types';

const STORE_NAME = 'settings';
const CURRENT_SESSION_KEY = 'currentSession';

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
  device: 'gpu',
  model: 'isnet_quint8',
  imageInfo: DEFAULT_IMAGE_INFO,
  editorState: {},
  timestamp: 0,
};

export function useSession() {
  const [session, setSession] = useState<SessionData>(DEFAULT_SESSION);
  const sessionRef = useRef<SessionData>(DEFAULT_SESSION);
  const isMountedRef = useRef(true);
  const hasLocalWriteRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Load session from IndexedDB on mount
  useEffect(() => {
    isMountedRef.current = true;
    const loadSession = async () => {
      const writeVersionAtStart = hasLocalWriteRef.current;
      try {
        const saved = await getFromStore<SessionData>(STORE_NAME, CURRENT_SESSION_KEY);
        if (isMountedRef.current && saved && !writeVersionAtStart && !hasLocalWriteRef.current) {
          sessionRef.current = saved;
          setSession(saved);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        if (isMountedRef.current) {
          setIsLoaded(true);
        }
      }
    };

    loadSession();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Save session to IndexedDB — rolls back in-memory state if persistence fails
  const saveSession = useCallback(async (data: Partial<SessionData>) => {
    const prev = sessionRef.current;
    hasLocalWriteRef.current = true;
    const newSession = {
      ...prev,
      ...data,
      key: CURRENT_SESSION_KEY,
      timestamp: Date.now(),
    };
    sessionRef.current = newSession;
    setSession(newSession);

    try {
      await putInStore(STORE_NAME, newSession);
    } catch (error) {
      console.error('Failed to save session, rolling back:', error);
      sessionRef.current = prev;
      setSession(prev);
      hasLocalWriteRef.current = false;
    }
  }, []);

  // Clear session — rolls back if IndexedDB delete fails
  const clearSession = useCallback(async () => {
    const prev = sessionRef.current;
    const hadWrite = hasLocalWriteRef.current;
    hasLocalWriteRef.current = true;
    sessionRef.current = DEFAULT_SESSION;
    setSession(DEFAULT_SESSION);
    try {
      await deleteFromStore(STORE_NAME, CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session, rolling back:', error);
      sessionRef.current = prev;
      setSession(prev);
      hasLocalWriteRef.current = hadWrite;
    }
  }, []);

  return {
    session,
    saveSession,
    clearSession,
    isLoaded,
  };
}
