import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Dimensions,
  PanResponder 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WidgetCard } from '../widgets/WidgetCard';
import { WidgetRegistry } from '../widgets/WidgetRegistry';
import { registerAllWidgets } from '../widgets/registerWidgets';
import { WidgetErrorBoundary } from '../widgets/WidgetErrorBoundary';
import { useTheme } from '../core/themeStore';

// Import all widgets directly for now
import { DepthWidget } from '../widgets/DepthWidget';
import { SpeedWidget } from '../widgets/SpeedWidget';
import { WindWidget } from '../widgets/WindWidget';
import { GPSWidget } from '../widgets/GPSWidget';
import { CompassWidget } from '../widgets/CompassWidget';
import { EngineWidget } from '../widgets/EngineWidget';
import { BatteryWidget } from '../widgets/BatteryWidget';
import { TanksWidget } from '../widgets/TanksWidget';
import { AutopilotStatusWidget } from '../widgets/AutopilotStatusWidget';

interface PaginatedDashboardProps {
  selectedWidgets: string[];
  onWidgetRemove?: (widgetId: string) => void;
  headerHeight?: number;
  footerHeight?: number;
}

interface WidgetLayout {
  id: string;
  component: React.ReactElement;
}

const WIDGET_WIDTH = 180;
const WIDGET_HEIGHT = 180;
const WIDGET_MARGIN = 8;
const PAGE_INDICATOR_HEIGHT = 30;

export const PaginatedDashboard: React.FC<PaginatedDashboardProps> = ({
  selectedWidgets,
  onWidgetRemove,
  headerHeight = 60,
  footerHeight = 88,
}) => {
  const theme = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<WidgetLayout[][]>([]);
  const [scrollViewWidth, setScrollViewWidth] = useState(0);

  // Initialize widget registry
  useEffect(() => {
    registerAllWidgets();
  }, []);

  // Calculate dashboard dimensions - responsive to window changes
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const availableHeight = screenDimensions.height - headerHeight - footerHeight - PAGE_INDICATOR_HEIGHT;
  const availableWidth = screenDimensions.width;

  // Calculate widgets per page - ensure at least 1 widget per row/column
  const widgetsPerRow = Math.max(1, Math.floor(availableWidth / (WIDGET_WIDTH + WIDGET_MARGIN * 2)));
  const widgetRows = Math.max(1, Math.floor(availableHeight / (WIDGET_HEIGHT + WIDGET_MARGIN * 2)));
  const widgetsPerPage = widgetsPerRow * widgetRows;
  
  // Calculate actual spacing for even distribution
  const totalWidgetWidth = widgetsPerRow * WIDGET_WIDTH;
  const remainingWidth = availableWidth - totalWidgetWidth;
  const actualMargin = Math.max(WIDGET_MARGIN, remainingWidth / (widgetsPerRow + 1));

  // Direct widget mapping (bypass registry for now)
  const widgetMap: { [key: string]: React.ComponentType<any> } = {
    depth: DepthWidget,
    speed: SpeedWidget,
    wind: WindWidget,
    gps: GPSWidget,
    compass: CompassWidget,
    engine: EngineWidget,
    battery: BatteryWidget,
    tanks: TanksWidget,
    autopilot: AutopilotStatusWidget,
  };

  // Simple test widget
  const TestWidget: React.FC<{ id: string }> = ({ id }) => (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.surface, 
      borderRadius: 8, 
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border
    }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>{id.toUpperCase()}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Test Widget</Text>
    </View>
  );

  // Render widget component directly
  const renderWidget = useCallback((widgetId: string): React.ReactElement => {
    const WidgetComponent = widgetMap[widgetId];
    if (WidgetComponent) {
      try {
        // Try rendering the actual widget
        return <WidgetComponent key={widgetId} />;
      } catch (error) {
        console.error(`Error rendering widget ${widgetId}:`, error);
        // Fallback to test widget if there's an error
        return <TestWidget key={widgetId} id={widgetId + ' (ERROR)'} />;
      }
    }
    
    // Fallback for unknown widgets
    return (
      <WidgetCard
        key={widgetId}
        title={widgetId.toUpperCase()}
        icon="help-outline"
        value="--"
        state="no-data"
      />
    );
  }, [theme]);

  // Organize widgets into pages
  useEffect(() => {
    const widgetLayouts: WidgetLayout[] = selectedWidgets.map(widgetId => ({
      id: widgetId,
      component: (
        <WidgetErrorBoundary
          key={widgetId}
          widgetId={widgetId}
          onReload={() => {
            // Force re-render by updating selected widgets
            // This would be handled by parent component
          }}
          onRemove={() => onWidgetRemove?.(widgetId)}
        >
          {renderWidget(widgetId)}
        </WidgetErrorBoundary>
      ),
    }));

    // Split widgets into pages
    const paginatedWidgets: WidgetLayout[][] = [];
    for (let i = 0; i < widgetLayouts.length; i += widgetsPerPage) {
      paginatedWidgets.push(widgetLayouts.slice(i, i + widgetsPerPage));
    }

    setPages(paginatedWidgets);
    
    // Reset to first page if current page no longer exists
    if (currentPage >= paginatedWidgets.length && paginatedWidgets.length > 0) {
      setCurrentPage(0);
    }
  }, [selectedWidgets, widgetsPerPage]);

  // Reset to first page when screen dimensions change and pagination changes
  useEffect(() => {
    if (currentPage >= pages.length && pages.length > 0) {
      setCurrentPage(0);
    }
  }, [pages.length]);

  // Pan responder for swipe gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes when there are multiple pages
      return pages.length > 1 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx } = gestureState;
      const threshold = 80; // Increased threshold for more deliberate swipes

      if (dx > threshold && currentPage > 0) {
        // Swipe right - previous page
        setCurrentPage(currentPage - 1);
      } else if (dx < -threshold && currentPage < pages.length - 1) {
        // Swipe left - next page
        setCurrentPage(currentPage + 1);
      }
    },
  });

  // Navigation handlers
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const renderPage = (pageWidgets: WidgetLayout[], pageIndex: number) => {
    return (
      <View key={pageIndex} style={[styles.page, { width: availableWidth, height: availableHeight }]}>
        <View style={[styles.evenGrid, { paddingHorizontal: actualMargin / 2 }]}>
          {pageWidgets.map((widget, index) => {
            const row = Math.floor(index / widgetsPerRow);
            const col = index % widgetsPerRow;
            
            return (
              <View
                key={widget.id}
                style={[
                  styles.evenWidgetContainer,
                  {
                    width: WIDGET_WIDTH,
                    height: WIDGET_HEIGHT,
                    marginHorizontal: actualMargin / 2,
                    marginVertical: WIDGET_MARGIN,
                  }
                ]}
              >
                {widget.component}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (pages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.appBackground }]}>
        <View style={styles.emptyState}>
          <Ionicons name="boat-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No widgets selected
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Add instruments to your dashboard
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View 
      style={[styles.container, { backgroundColor: theme.appBackground }]}
      {...panResponder.panHandlers}
    >
      {/* Dashboard Content - Show only current page */}
      <View style={styles.pageContainer}>
        {pages.length > 0 && pages[currentPage] && renderPage(pages[currentPage], currentPage)}
      </View>

      {/* Page Navigation - Only show when there are multiple pages */}
      {pages.length > 1 && (
        <View style={[styles.pageNavigation, { backgroundColor: theme.surface }]}>
          {/* Previous Page Button */}
          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: theme.background, opacity: currentPage === 0 ? 0.3 : 1 }
            ]}
            onPress={goToPreviousPage}
            disabled={currentPage === 0}
          >
            <Ionicons 
              name="chevron-back" 
              size={20} 
              color={currentPage === 0 ? theme.textSecondary : theme.primary} 
            />
          </TouchableOpacity>

          {/* Page Indicators */}
          <View style={styles.pageIndicators}>
            {pages.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pageIndicator,
                  {
                    backgroundColor: index === currentPage ? theme.primary : theme.border,
                  }
                ]}
                onPress={() => setCurrentPage(index)}
              />
            ))}
          </View>

          {/* Next Page Button */}
          <TouchableOpacity
            style={[
              styles.navButton,
              { 
                backgroundColor: theme.background, 
                opacity: currentPage === pages.length - 1 ? 0.3 : 1 
              }
            ]}
            onPress={goToNextPage}
            disabled={currentPage === pages.length - 1}
          >
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={currentPage === pages.length - 1 ? theme.textSecondary : theme.primary} 
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  page: {
    flex: 1,
  },
  widgetGrid: {
    flex: 1,
    position: 'relative',
  },
  widgetContainer: {
    position: 'absolute',
  },
  simpleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    padding: WIDGET_MARGIN,
    flex: 1,
  },
  simpleWidgetContainer: {
    // Size will be set inline
  },
  evenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignContent: 'flex-start',
    flex: 1,
    paddingVertical: WIDGET_MARGIN,
  },
  evenWidgetContainer: {
    // Size and margins will be set inline for even distribution
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: PAGE_INDICATOR_HEIGHT,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  navButtonLeft: {
    // Additional styles for left button if needed
  },
  navButtonRight: {
    // Additional styles for right button if needed
  },
  pageIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});