/**
 * Tests for Undo/Redo System (Story 4.4 AC13)
 * Tests Command pattern and UndoRedoManager functionality
 */

import { undoRedoManager, Command } from "../../../src/services/undo/UndoRedoManager";

// Mock command for testing
class MockCommand implements Command {
  id = `mock-${Date.now()}`;
  description = 'Mock Command';
  timestamp = Date.now();
  executed = false;
  undone = false;
  
  execute(): void {
    this.executed = true;
  }
  
  undo(): void {
    this.undone = true;
  }
  
  canUndo(): boolean {
    return true;
  }
  
  canRedo(): boolean {
    return true;
  }
}

// Mock zustand stores
jest.mock('../../../src/store/themeStore', () => ({
  useThemeStore: {
    getState: jest.fn(() => ({
      mode: 'day',
      themeSettings: {
        fontSize: 'medium',
        highContrast: false,
        reducedMotion: false,
      },
      setMode: jest.fn(),
      updateThemeSettings: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      display: {
        screenTimeout: 300,
        keepScreenOn: true,
      },
      units: {
        depth: 'feet',
        speed: 'knots',
      },
      updateDisplaySettings: jest.fn(),
      setUnit: jest.fn(),
    })),
  },
}));

describe('UndoRedoManager', () => {
  beforeEach(() => {
    undoRedoManager.clearHistory();
  });

  describe('Basic Operations', () => {
    it('should execute a command', () => {
      const command = new MockCommand();

      undoRedoManager.executeCommand(command);

      expect(command.executed).toBe(true);
      expect(undoRedoManager.canUndo()).toBe(true);
      expect(undoRedoManager.canRedo()).toBe(false);
    });

    it('should undo a command', () => {
      const command = new MockCommand();

      undoRedoManager.executeCommand(command);
      undoRedoManager.undo();

      expect(command.undone).toBe(true);
      expect(undoRedoManager.canUndo()).toBe(false);
      expect(undoRedoManager.canRedo()).toBe(true);
    });

    it('should redo a command', () => {
      const command = new MockCommand();

      undoRedoManager.executeCommand(command);
      undoRedoManager.undo();
      
      // Reset executed flag for redo
      command.executed = false;
      undoRedoManager.redo();

      expect(command.executed).toBe(true);
      expect(undoRedoManager.canUndo()).toBe(true);
      expect(undoRedoManager.canRedo()).toBe(false);
    });

    it('should clear redo stack when executing new command after undo', () => {
      const command1 = new MockCommand();
      const command2 = new MockCommand();

      undoRedoManager.executeCommand(command1);
      undoRedoManager.undo();
      undoRedoManager.executeCommand(command2);

      expect(undoRedoManager.canRedo()).toBe(false);
      expect(undoRedoManager.canUndo()).toBe(true);
    });
  });

  describe('Stack Management', () => {
    it('should respect max history size', () => {
      undoRedoManager.setMaxHistorySize(3);

      for (let i = 0; i < 5; i++) {
        undoRedoManager.executeCommand(new ThemeChangeCommand('night'));
      }

      expect(undoRedoManager.getUndoStackSize()).toBe(3);
    });

    it('should clear all history', () => {
      undoRedoManager.executeCommand(new ThemeChangeCommand('night'));
      undoRedoManager.executeCommand(new ThemeChangeCommand('red-night'));
      undoRedoManager.clearHistory();

      expect(undoRedoManager.canUndo()).toBe(false);
      expect(undoRedoManager.canRedo()).toBe(false);
      expect(undoRedoManager.getUndoStackSize()).toBe(0);
      expect(undoRedoManager.getRedoStackSize()).toBe(0);
    });

    it('should provide descriptions for undo/redo operations', () => {
      const command = new ThemeChangeCommand('night');
      undoRedoManager.executeCommand(command);

      expect(undoRedoManager.getUndoDescription()).toContain('night');
      
      undoRedoManager.undo();
      expect(undoRedoManager.getRedoDescription()).toContain('night');
    });
  });

  describe('Command Groups', () => {
    it('should execute command group atomically', () => {
      const setModeMock = useThemeStore.getState().setMode as jest.Mock;
      const updateSettingsMock = useThemeStore.getState().updateThemeSettings as jest.Mock;

      const commands = [
        new ThemeChangeCommand('night'),
        new ThemeSettingsChangeCommand({ fontSize: 'large' }),
      ];

      undoRedoManager.executeCommandGroup({
        id: 'group-1',
        description: 'Theme changes',
        commands,
        timestamp: Date.now(),
      });

      expect(setModeMock).toHaveBeenCalled();
      expect(updateSettingsMock).toHaveBeenCalled();
      expect(undoRedoManager.getUndoStackSize()).toBe(1);
    });

    it('should undo command group atomically', () => {
      const setModeMock = useThemeStore.getState().setMode as jest.Mock;
      const updateSettingsMock = useThemeStore.getState().updateThemeSettings as jest.Mock;

      const commands = [
        new ThemeChangeCommand('night'),
        new ThemeSettingsChangeCommand({ fontSize: 'large' }),
      ];

      undoRedoManager.executeCommandGroup({
        id: 'group-1',
        description: 'Theme changes',
        commands,
        timestamp: Date.now(),
      });

      undoRedoManager.undo();

      // Both should be undone
      expect(setModeMock).toHaveBeenCalledWith('day');
      expect(updateSettingsMock).toHaveBeenCalled();
    });

    it('should rollback on error in command group', () => {
      const command1 = new ThemeChangeCommand('night');
      const errorCommand = {
        id: 'error-cmd',
        description: 'Error command',
        timestamp: Date.now(),
        execute: jest.fn(() => { throw new Error('Test error'); }),
        undo: jest.fn(),
        redo: jest.fn(),
        canUndo: () => true,
        canRedo: () => true,
      };

      const commandGroup = {
        id: 'group-error',
        description: 'Error group',
        commands: [command1, errorCommand],
        timestamp: Date.now(),
      };

      undoRedoManager.executeCommandGroup(commandGroup);

      // Should not be on stack due to rollback
      expect(undoRedoManager.getUndoStackSize()).toBe(0);
    });
  });

  describe('Callbacks', () => {
    it('should call onStackChange callback', () => {
      const callback = jest.fn();
      undoRedoManager.onStackChange(callback);

      undoRedoManager.executeCommand(new ThemeChangeCommand('night'));

      expect(callback).toHaveBeenCalled();
    });

    it('should call onCommandExecute callback', () => {
      const callback = jest.fn();
      undoRedoManager.onCommandExecute(callback);

      const command = new ThemeChangeCommand('night');
      undoRedoManager.executeCommand(command);

      expect(callback).toHaveBeenCalledWith(command);
    });

    it('should call onCommandUndo callback', () => {
      const callback = jest.fn();
      undoRedoManager.onCommandUndo(callback);

      const command = new ThemeChangeCommand('night');
      undoRedoManager.executeCommand(command);
      undoRedoManager.undo();

      expect(callback).toHaveBeenCalledWith(command);
    });

    it('should call onCommandRedo callback', () => {
      const callback = jest.fn();
      undoRedoManager.onCommandRedo(callback);

      const command = new ThemeChangeCommand('night');
      undoRedoManager.executeCommand(command);
      undoRedoManager.undo();
      undoRedoManager.redo();

      expect(callback).toHaveBeenCalledWith(command);
    });
  });
});

describe('ThemeChangeCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useThemeStore.getState as jest.Mock).mockReturnValue({
      mode: 'day',
      setMode: jest.fn(),
    });
  });

  it('should execute theme change', () => {
    const setModeMock = useThemeStore.getState().setMode as jest.Mock;
    const command = new ThemeChangeCommand('night');

    command.execute();

    expect(setModeMock).toHaveBeenCalledWith('night');
  });

  it('should undo theme change', () => {
    const setModeMock = useThemeStore.getState().setMode as jest.Mock;
    const command = new ThemeChangeCommand('night');

    command.execute();
    command.undo();

    expect(setModeMock).toHaveBeenCalledWith('day');
  });

  it('should redo theme change', () => {
    const setModeMock = useThemeStore.getState().setMode as jest.Mock;
    const command = new ThemeChangeCommand('night');

    command.execute();
    command.undo();
    command.redo();

    expect(setModeMock).toHaveBeenCalledWith('night');
  });

  it('should have descriptive text', () => {
    const command = new ThemeChangeCommand('red-night');
    expect(command.description).toContain('red-night');
  });
});

describe('ThemeSettingsChangeCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useThemeStore.getState as jest.Mock).mockReturnValue({
      themeSettings: {
        fontSize: 'medium',
        highContrast: false,
        reducedMotion: false,
      },
      updateThemeSettings: jest.fn(),
    });
  });

  it('should execute theme settings change', () => {
    const updateMock = useThemeStore.getState().updateThemeSettings as jest.Mock;
    const command = new ThemeSettingsChangeCommand({ fontSize: 'large' });

    command.execute();

    expect(updateMock).toHaveBeenCalledWith({ fontSize: 'large' });
  });

  it('should undo theme settings change', () => {
    const updateMock = useThemeStore.getState().updateThemeSettings as jest.Mock;
    const command = new ThemeSettingsChangeCommand({ fontSize: 'large' });

    command.execute();
    command.undo();

    expect(updateMock).toHaveBeenLastCalledWith({
      fontSize: 'medium',
      highContrast: false,
      reducedMotion: false,
    });
  });

  it('should support custom description', () => {
    const command = new ThemeSettingsChangeCommand(
      { highContrast: true },
      'Enable high contrast'
    );

    expect(command.description).toBe('Enable high contrast');
  });
});

describe('useUndoRedo Hook', () => {
  beforeEach(() => {
    undoRedoManager.clearHistory();
    jest.clearAllMocks();
  });

  it('should provide initial state', () => {
    const { result } = renderHook(() => useUndoRedo());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoStackSize).toBe(0);
    expect(result.current.redoStackSize).toBe(0);
  });

  it('should update state after command execution', () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.executeCommand(new ThemeChangeCommand('night'));
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoStackSize).toBe(1);
  });

  it('should execute undo', () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.executeCommand(new ThemeChangeCommand('night'));
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should execute redo', () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.executeCommand(new ThemeChangeCommand('night'));
      result.current.undo();
    });

    act(() => {
      result.current.redo();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.executeCommand(new ThemeChangeCommand('night'));
    });

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.undoStackSize).toBe(0);
  });

  it('should provide descriptions', () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.executeCommand(new ThemeChangeCommand('night'));
    });

    expect(result.current.undoDescription).toContain('night');
  });

  it('should update on undo/redo operations', () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.executeCommand(new ThemeChangeCommand('night'));
      result.current.executeCommand(new ThemeChangeCommand('red-night'));
    });

    expect(result.current.undoStackSize).toBe(2);

    act(() => {
      result.current.undo();
    });

    expect(result.current.undoStackSize).toBe(1);
    expect(result.current.redoStackSize).toBe(1);

    act(() => {
      result.current.redo();
    });

    expect(result.current.undoStackSize).toBe(2);
    expect(result.current.redoStackSize).toBe(0);
  });
});
