/**
 * useUndoRedo Hook
 * Story 4.4 AC13: React hook for undo/redo functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { undoRedoManager, Command } from '../services/undo/UndoRedoManager';
import { Platform } from 'react-native';

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  undoStackSize: number;
  redoStackSize: number;
}

export const useUndoRedo = () => {
  const [state, setState] = useState<UndoRedoState>({
    canUndo: false,
    canRedo: false,
    undoDescription: null,
    redoDescription: null,
    undoStackSize: 0,
    redoStackSize: 0,
  });

  const updateState = useCallback(() => {
    setState({
      canUndo: undoRedoManager.canUndo(),
      canRedo: undoRedoManager.canRedo(),
      undoDescription: undoRedoManager.getUndoDescription(),
      redoDescription: undoRedoManager.getRedoDescription(),
      undoStackSize: undoRedoManager.getUndoStackSize(),
      redoStackSize: undoRedoManager.getRedoStackSize(),
    });
  }, []);

  useEffect(() => {
    // Register callback for stack changes
    undoRedoManager.onStackChangeCallback(updateState);
    
    // Initial state
    updateState();
  }, [updateState]);

  const executeCommand = useCallback(async (command: Command) => {
    await undoRedoManager.executeCommand(command);
  }, []);

  const undo = useCallback(async () => {
    return await undoRedoManager.undo();
  }, []);

  const redo = useCallback(async () => {
    return await undoRedoManager.redo();
  }, []);

  const clearHistory = useCallback(() => {
    undoRedoManager.clearHistory();
  }, []);

  return {
    ...state,
    executeCommand,
    undo,
    redo,
    clearHistory,
  };
};

/**
 * useKeyboardShortcuts Hook
 * Registers keyboard shortcuts for undo/redo
 */
export const useKeyboardShortcuts = (enabled: boolean = true) => {
  const { undo, redo } = useUndoRedo();

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') {
      return;
    }

    const handleKeyDown = async (event: KeyboardEvent) => {
      // Check for Cmd/Ctrl modifier
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && event.key === 'z') {
        event.preventDefault();
        
        if (event.shiftKey) {
          // Cmd+Shift+Z or Ctrl+Shift+Z = Redo
          await redo();
        } else {
          // Cmd+Z or Ctrl+Z = Undo
          await undo();
        }
      }
      
      // Alternative redo shortcut: Cmd+Y
      if (isMod && event.key === 'y') {
        event.preventDefault();
        await redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, undo, redo]);
};
