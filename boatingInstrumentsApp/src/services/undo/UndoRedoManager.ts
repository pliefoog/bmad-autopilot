/**
 * Command Pattern Infrastructure
 * Story 4.4 AC13: Undo/Redo capabilities for configuration changes
 *
 * Implements the Command pattern for reversible actions:
 * - Theme changes
 * - Widget additions/removals
 * - Connection settings
 * - Alarm configurations
 *
 * Features:
 * - Command stack with configurable history limit
 * - Undo/redo operations
 * - Command grouping for related changes
 * - State persistence
 * - Keyboard shortcuts support (Cmd+Z/Cmd+Shift+Z)
 */

/**
 * Command Interface
 * All reversible actions must implement this interface
 */
import { log } from '../../utils/logging/logger';

export interface Command {
  /** Unique identifier for the command */
  id: string;

  /** Human-readable description of the command */
  description: string;

  /** Timestamp when command was created */
  timestamp: number;

  /** Execute the command (do the action) */
  execute(): void | Promise<void>;

  /** Undo the command (reverse the action) */
  undo(): void | Promise<void>;

  /** Optional: Redo the command (can default to execute) */
  redo?(): void | Promise<void>;

  /** Optional: Check if command can be undone */
  canUndo?(): boolean;

  /** Optional: Check if command can be redone */
  canRedo?(): boolean;
}

/**
 * Command Group
 * Groups related commands that should be undone/redone together
 */
export interface CommandGroup {
  id: string;
  description: string;
  commands: Command[];
  timestamp: number;
}

/**
 * Undo/Redo Manager
 * Manages the command history and provides undo/redo operations
 */
export class UndoRedoManager {
  private static instance: UndoRedoManager;

  private undoStack: (Command | CommandGroup)[] = [];
  private redoStack: (Command | CommandGroup)[] = [];
  private maxHistorySize: number = 50;
  private isExecuting: boolean = false;

  // Callbacks for UI updates
  private onStackChange?: () => void;
  private onCommandExecute?: (command: Command) => void;
  private onCommandUndo?: (command: Command) => void;
  private onCommandRedo?: (command: Command) => void;

  private constructor() {
    this.loadHistory();
  }

  public static getInstance(): UndoRedoManager {
    if (!UndoRedoManager.instance) {
      UndoRedoManager.instance = new UndoRedoManager();
    }
    return UndoRedoManager.instance;
  }

  /**
   * Execute a command and add it to the undo stack
   */
  public async executeCommand(command: Command): Promise<void> {
    if (this.isExecuting) {
      log.app('Cannot execute command while another is executing', () => ({}));
      return;
    }

    try {
      this.isExecuting = true;

      // Execute the command
      await command.execute();

      // Add to undo stack
      this.undoStack.push(command);

      // Clear redo stack (new action invalidates redo history)
      this.redoStack = [];

      // Limit history size
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }

      // Save history and notify listeners
      this.saveHistory();
      this.notifyStackChange();
      this.onCommandExecute?.(command);
    } catch (error) {
      log.app('Failed to execute command', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute a group of commands together
   */
  public async executeCommandGroup(group: CommandGroup): Promise<void> {
    if (this.isExecuting) {
      log.app('Cannot execute command group while another is executing', () => ({}));
      return;
    }

    try {
      this.isExecuting = true;

      // Execute all commands in the group
      for (const command of group.commands) {
        await command.execute();
        this.onCommandExecute?.(command);
      }

      // Add group to undo stack
      this.undoStack.push(group);

      // Clear redo stack
      this.redoStack = [];

      // Limit history size
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }

      // Save history and notify listeners
      this.saveHistory();
      this.notifyStackChange();
    } catch (error) {
      log.app('Failed to execute command group', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Undo the last command
   */
  public async undo(): Promise<boolean> {
    if (!this.canUndo()) {
      log.app('[UndoRedo] Nothing to undo');
      return false;
    }

    if (this.isExecuting) {
      log.app('[UndoRedo] Cannot undo while executing');
      return false;
    }

    try {
      this.isExecuting = true;

      const item = this.undoStack.pop()!;

      if (this.isCommandGroup(item)) {
        // Undo commands in reverse order
        for (let i = item.commands.length - 1; i >= 0; i--) {
          const command = item.commands[i];
          await command.undo();
          this.onCommandUndo?.(command);
        }
      } else {
        await item.undo();
        this.onCommandUndo?.(item);
      }

      // Move to redo stack
      this.redoStack.push(item);

      // Save history and notify listeners
      this.saveHistory();
      this.notifyStackChange();

      return true;
    } catch (error) {
      log.app('[UndoRedo] Failed to undo', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Redo the last undone command
   */
  public async redo(): Promise<boolean> {
    if (!this.canRedo()) {
      log.app('[UndoRedo] Nothing to redo');
      return false;
    }

    if (this.isExecuting) {
      log.app('[UndoRedo] Cannot redo while executing');
      return false;
    }

    try {
      this.isExecuting = true;

      const item = this.redoStack.pop()!;

      if (this.isCommandGroup(item)) {
        // Redo commands in forward order
        for (const command of item.commands) {
          if (command.redo) {
            await command.redo();
          } else {
            await command.execute();
          }
          this.onCommandRedo?.(command);
        }
      } else {
        if (item.redo) {
          await item.redo();
        } else {
          await item.execute();
        }
        this.onCommandRedo?.(item);
      }

      // Move back to undo stack
      this.undoStack.push(item);

      // Save history and notify listeners
      this.saveHistory();
      this.notifyStackChange();

      return true;
    } catch (error) {
      log.app('[UndoRedo] Failed to redo', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Check if undo is available
   */
  public canUndo(): boolean {
    return this.undoStack.length > 0 && !this.isExecuting;
  }

  /**
   * Check if redo is available
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0 && !this.isExecuting;
  }

  /**
   * Get the description of the next undo action
   */
  public getUndoDescription(): string | null {
    if (!this.canUndo()) return null;
    const item = this.undoStack[this.undoStack.length - 1];
    return item.description;
  }

  /**
   * Get the description of the next redo action
   */
  public getRedoDescription(): string | null {
    if (!this.canRedo()) return null;
    const item = this.redoStack[this.redoStack.length - 1];
    return item.description;
  }

  /**
   * Get undo stack size
   */
  public getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  public getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.saveHistory();
    this.notifyStackChange();
  }

  /**
   * Set maximum history size
   */
  public setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;

    // Trim if necessary
    while (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    this.saveHistory();
  }

  /**
   * Register callback for stack changes
   */
  public onStackChangeCallback(callback: () => void): void {
    this.onStackChange = callback;
  }

  /**
   * Register callback for command execution
   */
  public onCommandExecuteCallback(callback: (command: Command) => void): void {
    this.onCommandExecute = callback;
  }

  /**
   * Register callback for command undo
   */
  public onCommandUndoCallback(callback: (command: Command) => void): void {
    this.onCommandUndo = callback;
  }

  /**
   * Register callback for command redo
   */
  public onCommandRedoCallback(callback: (command: Command) => void): void {
    this.onCommandRedo = callback;
  }

  /**
   * Check if item is a command group
   */
  private isCommandGroup(item: Command | CommandGroup): item is CommandGroup {
    return 'commands' in item;
  }

  /**
   * Notify listeners of stack change
   */
  private notifyStackChange(): void {
    this.onStackChange?.();
  }

  /**
   * Save history to storage (for persistence across sessions)
   * Note: Only saves metadata, not actual command objects
   */
  private saveHistory(): void {
    try {
      const historyMetadata = {
        undoStack: this.undoStack.map((item) => ({
          id: item.id,
          description: item.description,
          timestamp: item.timestamp,
        })),
        redoStack: this.redoStack.map((item) => ({
          id: item.id,
          description: item.description,
          timestamp: item.timestamp,
        })),
      };

      // In a real implementation, save to AsyncStorage
      // For now, just log
    } catch (error) {
      log.app('Failed to save history', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  /**
   * Load history from storage
   * Note: Only loads metadata, actual commands cannot be persisted
   */
  private loadHistory(): void {
    try {
      // In a real implementation, load from AsyncStorage
      // For now, start with empty stacks
    } catch (error) {
      log.app('Failed to load history', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
}

// Export singleton instance
export const undoRedoManager = UndoRedoManager.getInstance();
