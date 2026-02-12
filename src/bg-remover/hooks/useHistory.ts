"use client";

import { useState, useCallback, useEffect } from "react";
import { HistoryItem } from "@/types";
import {
  getAllFromStore,
  putInStore,
  deleteFromStore,
  clearStore,
} from "@/bg-remover/lib/indexedDB";

const MAX_HISTORY = 10;
const STORE_NAME = "history";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from IndexedDB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const items = await getAllFromStore<HistoryItem>(STORE_NAME);
        // Sort by timestamp descending
        items.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(items.slice(0, MAX_HISTORY));
      } catch (error) {
        console.error("Failed to load history from IndexedDB:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadHistory();
  }, []);

  const addToHistory = useCallback(async (item: HistoryItem) => {
    setHistory((prev) => {
      // Don't add duplicates
      if (prev.some((h) => h.id === item.id)) {
        return prev;
      }
      const newHistory = [item, ...prev].slice(0, MAX_HISTORY);
      return newHistory;
    });

    // Persist to IndexedDB
    try {
      await putInStore(STORE_NAME, item);
    } catch (error) {
      console.error("Failed to save to IndexedDB:", error);
    }
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));

    // Remove from IndexedDB
    try {
      await deleteFromStore(STORE_NAME, id);
    } catch (error) {
      console.error("Failed to remove from IndexedDB:", error);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);

    // Clear IndexedDB store
    try {
      await clearStore(STORE_NAME);
    } catch (error) {
      console.error("Failed to clear IndexedDB:", error);
    }
  }, []);

  const getFromHistory = useCallback(
    (id: string): HistoryItem | undefined => {
      return history.find((item) => item.id === id);
    },
    [history]
  );

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getFromHistory,
    isLoaded,
  };
}
