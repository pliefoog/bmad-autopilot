/**
 * Undo/Redo Controls Component
 * Story 4.4 AC13: UI controls for undo/redo actions
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';
import { useUndoRedo, useKeyboardShortcuts } from '../../hooks/useUndoRedo';

export interface UndoRedoControlsProps {
  /** Show keyboard shortcut hints */
  showShortcutHints?: boolean;

  /** Compact mode (smaller buttons) */
  compact?: boolean;

  /** Position in header or footer */
  position?: 'header' | 'footer' | 'floating';

  /** Enable keyboard shortcuts */
  enableKeyboardShortcuts?: boolean;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  showShortcutHints = Platform.OS === 'web',
  compact = false,
  position = 'header',
  enableKeyboardShortcuts = true,
}) => {
  const theme = useTheme();
  const { canUndo, canRedo, undoDescription, redoDescription, undo, redo } = useUndoRedo();

  // Register keyboard shortcuts
  useKeyboardShortcuts(enableKeyboardShortcuts);

  const handleUndo = async () => {
    const success = await undo();
    if (!success) {
      console.warn('[UndoRedo] Undo failed');
    }
  };

  const handleRedo = async () => {
    const success = await redo();
    if (!success) {
      console.warn('[UndoRedo] Redo failed');
    }
  };

  const containerStyle = [
    styles.container,
    position === 'floating' && styles.floating,
    compact && styles.compact,
  ];

  const buttonSize = compact ? 36 : 44;
  const iconSize = compact ? 20 : 24;

  return (
    <View style={containerStyle}>
      {/* Undo Button */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: canUndo ? theme.surface : theme.border + '40',
          },
        ]}
        onPress={handleUndo}
        disabled={!canUndo}
        accessibilityLabel={undoDescription || 'Undo'}
        accessibilityHint={showShortcutHints ? 'Press Cmd+Z to undo' : undefined}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canUndo }}
      >
        <Ionicons
          name="arrow-undo"
          size={iconSize}
          color={canUndo ? theme.primary : theme.textSecondary}
        />
      </TouchableOpacity>

      {/* Redo Button */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: canRedo ? theme.surface : theme.border + '40',
            marginLeft: 8,
          },
        ]}
        onPress={handleRedo}
        disabled={!canRedo}
        accessibilityLabel={redoDescription || 'Redo'}
        accessibilityHint={showShortcutHints ? 'Press Cmd+Shift+Z to redo' : undefined}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canRedo }}
      >
        <Ionicons
          name="arrow-redo"
          size={iconSize}
          color={canRedo ? theme.primary : theme.textSecondary}
        />
      </TouchableOpacity>

      {/* Keyboard shortcut hints */}
      {showShortcutHints && Platform.OS === 'web' && !compact ? (
        <View style={styles.hints}>
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            {typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent) ? '⌘Z' : 'Ctrl+Z'}
          </Text>
          <Text style={[styles.hintSeparator, { color: theme.border }]}>•</Text>
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            {typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent)
              ? '⌘⇧Z'
              : 'Ctrl+Shift+Z'}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

/**
 * Undo/Redo Menu Items
 * For use in settings or menus
 */
export const UndoRedoMenuItems: React.FC = () => {
  const theme = useTheme();
  const { canUndo, canRedo, undoDescription, redoDescription, undo, redo, clearHistory } =
    useUndoRedo();

  return (
    <View style={styles.menuContainer}>
      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: theme.surface }]}
        onPress={undo}
        disabled={!canUndo}
      >
        <Ionicons
          name="arrow-undo"
          size={24}
          color={canUndo ? theme.text : theme.textSecondary}
          style={styles.menuIcon}
        />
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuTitle, { color: canUndo ? theme.text : theme.textSecondary }]}>
            Undo
          </Text>
          {undoDescription && (
            <Text style={[styles.menuDescription, { color: theme.textSecondary }]}>
              {undoDescription}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: theme.surface }]}
        onPress={redo}
        disabled={!canRedo}
      >
        <Ionicons
          name="arrow-redo"
          size={24}
          color={canRedo ? theme.text : theme.textSecondary}
          style={styles.menuIcon}
        />
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuTitle, { color: canRedo ? theme.text : theme.textSecondary }]}>
            Redo
          </Text>
          {redoDescription && (
            <Text style={[styles.menuDescription, { color: theme.textSecondary }]}>
              {redoDescription}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: theme.surface }]}
        onPress={clearHistory}
      >
        <Ionicons name="trash-outline" size={24} color={theme.error} style={styles.menuIcon} />
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuTitle, { color: theme.error }]}>Clear History</Text>
          <Text style={[styles.menuDescription, { color: theme.textSecondary }]}>
            Remove all undo/redo history
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compact: {
    marginHorizontal: 4,
  },
  floating: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    flexDirection: 'column',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hints: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  hintText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hintSeparator: {
    marginHorizontal: 6,
    fontSize: 10,
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
});
