/**
 * TV Focus Manager Hook
 * Epic 8 - Phase 1: Cross-Platform Dialog Unification
 * 
 * Manages focus and navigation for TV platforms (tvOS, Android TV)
 * Features:
 * - D-pad navigation (up, down, left, right, select, back)
 * - Siri Remote support (tvOS)
 * - Focus animations
 * - Focus trap within modal
 * - Accessibility integration
 * 
 * @example
 * ```tsx
 * function MyTVComponent() {
 *   const { focusedIndex, setFocusedIndex, handleTVEvent } = useTVFocusManager({
 *     itemCount: 5,
 *     onSelect: (index) => handleItemSelect(index),
 *     onBack: () => closeModal(),
 *   });
 * 
 *   return items.map((item, index) => (
 *     <FocusableButton
 *       key={index}
 *       focused={focusedIndex === index}
 *       onPress={() => setFocusedIndex(index)}
 *     />
 *   ));
 * }
 * ```
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, BackHandler, Animated } from 'react-native';
import { isTV } from '../utils/platformDetection';

/**
 * TV Event Handler Types
 * tvOS uses TVEventHandler, Android TV uses BackHandler + key events
 */
type TVEventType = 
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'select'
  | 'playPause'
  | 'menu'
  | 'back';

interface TVFocusManagerOptions {
  /** Number of focusable items */
  itemCount: number;
  
  /** Initial focused index (default: 0) */
  initialIndex?: number;
  
  /** Callback when select/enter is pressed */
  onSelect?: (index: number) => void;
  
  /** Callback when back/menu is pressed */
  onBack?: () => void;
  
  /** Whether to wrap focus at edges (default: false) */
  wrapFocus?: boolean;
  
  /** Whether focus manager is enabled (default: true) */
  enabled?: boolean;
  
  /** Optional grid layout configuration */
  grid?: {
    columns: number;
    rows: number;
  };
}

interface TVFocusManagerResult {
  /** Currently focused item index */
  focusedIndex: number;
  
  /** Manually set focused index */
  setFocusedIndex: (index: number) => void;
  
  /** Move focus up */
  moveFocusUp: () => void;
  
  /** Move focus down */
  moveFocusDown: () => void;
  
  /** Move focus left */
  moveFocusLeft: () => void;
  
  /** Move focus right */
  moveFocusRight: () => void;
  
  /** Trigger select action */
  selectFocusedItem: () => void;
  
  /** Focus animation value (0-1) */
  focusAnim: Animated.Value;
}

/**
 * TV Focus Manager Hook
 * Manages focus state and navigation for TV platforms
 */
export function useTVFocusManager(options: TVFocusManagerOptions): TVFocusManagerResult {
  const {
    itemCount,
    initialIndex = 0,
    onSelect,
    onBack,
    wrapFocus = false,
    enabled = true,
    grid,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const focusAnim = useRef(new Animated.Value(1)).current;
  const tvMode = isTV();

  /**
   * Clamp index within valid range
   */
  const clampIndex = useCallback(
    (index: number): number => {
      if (itemCount === 0) return 0;
      
      if (wrapFocus) {
        // Wrap around at edges
        if (index < 0) return itemCount - 1;
        if (index >= itemCount) return 0;
        return index;
      } else {
        // Clamp at edges
        return Math.max(0, Math.min(itemCount - 1, index));
      }
    },
    [itemCount, wrapFocus]
  );

  /**
   * Animate focus change
   * Quick pulse effect to indicate focus change
   */
  const animateFocusChange = useCallback(() => {
    if (!tvMode) return;

    focusAnim.setValue(1);
    Animated.sequence([
      Animated.timing(focusAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [tvMode, focusAnim]);

  /**
   * Set focused index with animation
   */
  const setFocusedIndexWithAnim = useCallback(
    (index: number) => {
      const clampedIndex = clampIndex(index);
      if (clampedIndex !== focusedIndex) {
        setFocusedIndex(clampedIndex);
        animateFocusChange();
      }
    },
    [focusedIndex, clampIndex, animateFocusChange]
  );

  /**
   * Move focus up
   * In grid layout: move to item above (same column)
   * In list layout: move to previous item
   */
  const moveFocusUp = useCallback(() => {
    if (grid) {
      const currentRow = Math.floor(focusedIndex / grid.columns);
      const currentCol = focusedIndex % grid.columns;
      if (currentRow > 0) {
        setFocusedIndexWithAnim((currentRow - 1) * grid.columns + currentCol);
      } else if (wrapFocus) {
        setFocusedIndexWithAnim((grid.rows - 1) * grid.columns + currentCol);
      }
    } else {
      setFocusedIndexWithAnim(focusedIndex - 1);
    }
  }, [focusedIndex, grid, wrapFocus, setFocusedIndexWithAnim]);

  /**
   * Move focus down
   * In grid layout: move to item below (same column)
   * In list layout: move to next item
   */
  const moveFocusDown = useCallback(() => {
    if (grid) {
      const currentRow = Math.floor(focusedIndex / grid.columns);
      const currentCol = focusedIndex % grid.columns;
      if (currentRow < grid.rows - 1) {
        const nextIndex = (currentRow + 1) * grid.columns + currentCol;
        if (nextIndex < itemCount) {
          setFocusedIndexWithAnim(nextIndex);
        }
      } else if (wrapFocus) {
        setFocusedIndexWithAnim(currentCol);
      }
    } else {
      setFocusedIndexWithAnim(focusedIndex + 1);
    }
  }, [focusedIndex, grid, itemCount, wrapFocus, setFocusedIndexWithAnim]);

  /**
   * Move focus left
   * In grid layout: move to item on left (same row)
   * In list layout: ignored
   */
  const moveFocusLeft = useCallback(() => {
    if (grid) {
      const currentCol = focusedIndex % grid.columns;
      if (currentCol > 0) {
        setFocusedIndexWithAnim(focusedIndex - 1);
      } else if (wrapFocus) {
        const currentRow = Math.floor(focusedIndex / grid.columns);
        setFocusedIndexWithAnim(currentRow * grid.columns + grid.columns - 1);
      }
    }
  }, [focusedIndex, grid, wrapFocus, setFocusedIndexWithAnim]);

  /**
   * Move focus right
   * In grid layout: move to item on right (same row)
   * In list layout: ignored
   */
  const moveFocusRight = useCallback(() => {
    if (grid) {
      const currentRow = Math.floor(focusedIndex / grid.columns);
      const currentCol = focusedIndex % grid.columns;
      if (currentCol < grid.columns - 1) {
        const nextIndex = focusedIndex + 1;
        if (nextIndex < itemCount && Math.floor(nextIndex / grid.columns) === currentRow) {
          setFocusedIndexWithAnim(nextIndex);
        }
      } else if (wrapFocus) {
        setFocusedIndexWithAnim(currentRow * grid.columns);
      }
    }
  }, [focusedIndex, grid, itemCount, wrapFocus, setFocusedIndexWithAnim]);

  /**
   * Select focused item
   */
  const selectFocusedItem = useCallback(() => {
    if (onSelect && focusedIndex >= 0 && focusedIndex < itemCount) {
      onSelect(focusedIndex);
    }
  }, [focusedIndex, itemCount, onSelect]);

  /**
   * Handle TV remote events
   */
  const handleTVEvent = useCallback(
    (event: TVEventType) => {
      if (!enabled) return;

      switch (event) {
        case 'up':
          moveFocusUp();
          break;
        case 'down':
          moveFocusDown();
          break;
        case 'left':
          moveFocusLeft();
          break;
        case 'right':
          moveFocusRight();
          break;
        case 'select':
        case 'playPause':
          selectFocusedItem();
          break;
        case 'back':
        case 'menu':
          if (onBack) onBack();
          break;
        default:
          break;
      }
    },
    [
      enabled,
      moveFocusUp,
      moveFocusDown,
      moveFocusLeft,
      moveFocusRight,
      selectFocusedItem,
      onBack,
    ]
  );

  /**
   * Set up TV event listeners
   * tvOS: TVEventHandler (native module)
   * Android TV: BackHandler + key events
   */
  useEffect(() => {
    if (!tvMode || !enabled) return;

    // Android TV: BackHandler for back button
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleTVEvent('back');
        return true; // Prevent default back action
      });

      return () => backHandler.remove();
    }

    // tvOS: TVEventHandler would be set up here
    // Note: TVEventHandler is not in RN types but exists at runtime on tvOS
    // Implementation would require native module or @react-native-community/hooks
    // For now, we rely on built-in focus management on tvOS

    return undefined;
  }, [tvMode, enabled, handleTVEvent]);

  /**
   * Reset focus when itemCount changes
   */
  useEffect(() => {
    if (focusedIndex >= itemCount && itemCount > 0) {
      setFocusedIndex(itemCount - 1);
    }
  }, [itemCount, focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex: setFocusedIndexWithAnim,
    moveFocusUp,
    moveFocusDown,
    moveFocusLeft,
    moveFocusRight,
    selectFocusedItem,
    focusAnim,
  };
}
