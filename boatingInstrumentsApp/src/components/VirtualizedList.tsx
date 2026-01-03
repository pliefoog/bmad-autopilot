/**
 * Virtualized List Component
 *
 * Efficient list rendering for large datasets:
 * - Only renders visible items
 * - Smooth scrolling with windowing
 * - Optimized for marine data lists (alarms, logs, waypoints)
 * - Memory-efficient item recycling
 *
 * Story 4.5 AC4: Implement efficient list virtualization for large datasets
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';

export interface VirtualizedListProps<T> {
  /** Array of data items */
  data: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Optional key extractor */
  keyExtractor?: (item: T, index: number) => string;
  /** Container height (optional, will use parent if not provided) */
  height?: number;
  /** Number of items to render outside visible area (overscan) */
  overscan?: number;
  /** Optional empty state component */
  emptyComponent?: React.ReactNode;
  /** Container style */
  style?: ViewStyle;
  /** Initial scroll index */
  initialScrollIndex?: number;
}

/**
 * Virtualized list component for efficient rendering of large datasets
 *
 * @example
 * ```tsx
 * <VirtualizedList
 *   data={alarms}
 *   itemHeight={60}
 *   renderItem={(alarm) => <AlarmListItem alarm={alarm} />}
 *   keyExtractor={(alarm) => alarm.id}
 *   overscan={5}
 * />
 * ```
 */
export function VirtualizedList<T>({
  data,
  itemHeight,
  renderItem,
  keyExtractor = (_, index) => index.toString(),
  height,
  overscan = 3,
  emptyComponent,
  style,
  initialScrollIndex = 0,
}: VirtualizedListProps<T>) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerHeight, setContainerHeight] = useState(height || 0);
  const [scrollOffset, setScrollOffset] = useState(initialScrollIndex * itemHeight);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const effectiveHeight = height || containerHeight;
    if (effectiveHeight === 0) {
      return { start: 0, end: 0 };
    }

    const visibleStart = Math.floor(scrollOffset / itemHeight);
    const visibleEnd = Math.ceil((scrollOffset + effectiveHeight) / itemHeight);

    // Add overscan
    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(data.length, visibleEnd + overscan);

    return { start, end };
  }, [scrollOffset, itemHeight, height, containerHeight, data.length, overscan]);

  // Calculate total content height
  const contentHeight = useMemo(() => {
    return data.length * itemHeight;
  }, [data.length, itemHeight]);

  // Handle scroll events
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newScrollOffset = event.nativeEvent.contentOffset.y;
    setScrollOffset(newScrollOffset);
  }, []);

  // Handle container layout
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!height) {
        const newH = event.nativeEvent.layout.height;
        setContainerHeight((prev) => (prev !== newH ? newH : prev));
      }
    },
    [height],
  );

  // Render visible items
  const visibleItems = useMemo(() => {
    const items: React.ReactNode[] = [];

    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const item = data[i];
      if (!item) continue;

      const key = keyExtractor(item, i);
      const top = i * itemHeight;

      items.push(
        <View
          key={key}
          style={[
            styles.item,
            {
              position: 'absolute',
              top,
              height: itemHeight,
              left: 0,
              right: 0,
            },
          ]}
        >
          {renderItem(item, i)}
        </View>,
      );
    }

    return items;
  }, [data, visibleRange, itemHeight, keyExtractor, renderItem]);

  // Show empty state
  if (data.length === 0 && emptyComponent) {
    return <View style={[styles.container, style]}>{emptyComponent}</View>;
  }

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        scrollEventThrottle={16} // 60fps
        onScroll={handleScroll}
        showsVerticalScrollIndicator={true}
      >
        <View style={[styles.content, { height: contentHeight }]}>{visibleItems}</View>
      </ScrollView>
    </View>
  );
}

/**
 * Virtualized list with sections
 * Useful for grouped data (e.g., alarms by date, waypoints by route)
 */
export interface VirtualizedSectionListProps<T> {
  sections: {
    title: string;
    data: T[];
  }[];
  itemHeight: number;
  sectionHeaderHeight: number;
  renderItem: (item: T, index: number, sectionIndex: number) => React.ReactNode;
  renderSectionHeader: (title: string, sectionIndex: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number, sectionIndex: number) => string;
  height?: number;
  overscan?: number;
  emptyComponent?: React.ReactNode;
  style?: ViewStyle;
}

export function VirtualizedSectionList<T>({
  sections,
  itemHeight,
  sectionHeaderHeight,
  renderItem,
  renderSectionHeader,
  keyExtractor = (_, index, sectionIndex) => `${sectionIndex}-${index}`,
  height,
  overscan = 3,
  emptyComponent,
  style,
}: VirtualizedSectionListProps<T>) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerHeight, setContainerHeight] = useState(height || 0);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Flatten sections into single array with metadata
  const flatData = useMemo(() => {
    const items: {
      type: 'header' | 'item';
      sectionIndex: number;
      itemIndex?: number;
      data?: T;
      title?: string;
      offset: number;
      height: number;
    }[] = [];

    let currentOffset = 0;

    sections.forEach((section, sectionIndex) => {
      // Add section header
      items.push({
        type: 'header',
        sectionIndex,
        title: section.title,
        offset: currentOffset,
        height: sectionHeaderHeight,
      });
      currentOffset += sectionHeaderHeight;

      // Add section items
      section.data.forEach((item, itemIndex) => {
        items.push({
          type: 'item',
          sectionIndex,
          itemIndex,
          data: item,
          offset: currentOffset,
          height: itemHeight,
        });
        currentOffset += itemHeight;
      });
    });

    return { items, totalHeight: currentOffset };
  }, [sections, itemHeight, sectionHeaderHeight]);

  // Calculate visible range
  const visibleItems = useMemo(() => {
    const effectiveHeight = height || containerHeight;
    if (effectiveHeight === 0) return [];

    const visibleStart = scrollOffset;
    const visibleEnd = scrollOffset + effectiveHeight;

    return flatData.items.filter((item) => {
      const itemEnd = item.offset + item.height;
      return (
        itemEnd >= visibleStart - overscan * itemHeight &&
        item.offset <= visibleEnd + overscan * itemHeight
      );
    });
  }, [flatData, scrollOffset, height, containerHeight, overscan, itemHeight]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!height) {
        const newH = event.nativeEvent.layout.height;
        setContainerHeight((prev) => (prev !== newH ? newH : prev));
      }
    },
    [height],
  );

  const renderedItems = useMemo(() => {
    return visibleItems.map((item) => {
      const key =
        item.type === 'header'
          ? `header-${item.sectionIndex}`
          : keyExtractor(item.data!, item.itemIndex!, item.sectionIndex);

      return (
        <View
          key={key}
          style={[
            styles.item,
            {
              position: 'absolute',
              top: item.offset,
              height: item.height,
              left: 0,
              right: 0,
            },
          ]}
        >
          {item.type === 'header'
            ? renderSectionHeader(item.title!, item.sectionIndex)
            : renderItem(item.data!, item.itemIndex!, item.sectionIndex)}
        </View>
      );
    });
  }, [visibleItems, keyExtractor, renderItem, renderSectionHeader]);

  if (sections.length === 0 && emptyComponent) {
    return <View style={[styles.container, style]}>{emptyComponent}</View>;
  }

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsVerticalScrollIndicator={true}
      >
        <View style={[styles.content, { height: flatData.totalHeight }]}>{renderedItems}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    position: 'relative',
  },
  item: {
    overflow: 'hidden',
  },
});
