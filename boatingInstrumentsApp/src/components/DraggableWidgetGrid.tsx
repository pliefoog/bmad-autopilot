import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useWidgetStore, WidgetConfig } from '../store/widgetStore';
import { WidgetFactory } from '../services/WidgetFactory';
import { WidgetRegistry } from '../widgets/WidgetRegistry';
import { DynamicLayoutService } from '../services/dynamicLayoutService';
import { useTheme } from '../store/themeStore';

interface DraggableWidgetGridProps {
  pageIndex: number;
  onMoveToPage?: (widgetId: string, targetPage: number) => void;
}

// Render widget component with fixed grid dimensions
function renderWidgetComponent(widget: WidgetConfig, width: number, height: number): React.ReactElement | null {
  const { baseType } = WidgetFactory.parseWidgetId(widget.id);
  const registeredWidget = WidgetRegistry.getWidget(baseType);
  
  if (registeredWidget) {
    const Component = registeredWidget.component;
    const title = WidgetFactory.getWidgetTitle(widget.id);
    return <Component key={widget.id} id={widget.id} title={title} width={width} height={height} />;
  }
  
  return null;
}

export const DraggableWidgetGrid: React.FC<DraggableWidgetGridProps> = ({
  pageIndex,
  onMoveToPage,
}) => {
  const theme = useTheme();
  
  // Get current dashboard config
  const currentDashboardId = useWidgetStore(state => state.currentDashboard);
  const dashboard = useWidgetStore(state => 
    state.dashboards.find(d => d.id === state.currentDashboard)
  );
  
  const reorderWidgetsOnPage = useWidgetStore(state => state.reorderWidgetsOnPage);
  const moveWidgetToPage = useWidgetStore(state => state.moveWidgetToPage);
  const widgetExpirationTimeout = useWidgetStore(state => state.widgetExpirationTimeout);
  const enableWidgetAutoRemoval = useWidgetStore(state => state.enableWidgetAutoRemoval);

  // Calculate grid config for consistent widget sizing
  const gridConfig = useMemo(() => {
    const headerHeight = 60;
    const footerHeight = 88;
    const visibleWidgetCount = (dashboard?.widgets || []).filter(w => w.layout?.visible !== false).length;
    return DynamicLayoutService.getGridConfig(headerHeight, footerHeight, visibleWidgetCount);
  }, [dashboard?.widgets]);

  // Get widgets for this page
  const pageWidgets = useMemo(() => {
    if (!dashboard) return [];
    
    const widgets = dashboard.widgets || [];
    
    if (!dashboard.userPositioned) {
      // Auto-discovery mode: all widgets in creation order
      return widgets.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // User-positioned mode: filter by page and sort by positionOrder
    return widgets
      .filter(widget => {
        const layout = widget.layout;
        return layout?.page === pageIndex;
      })
      .sort((a, b) => {
        const aOrder = a.layout?.positionOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.layout?.positionOrder ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });
  }, [dashboard, pageIndex]);

  const renderWidget = ({ item, drag, isActive }: RenderItemParams<WidgetConfig>) => {
    const widgetComponent = renderWidgetComponent(item, gridConfig.widgetWidth, gridConfig.widgetHeight);
    
    if (!widgetComponent) return null;

    // Render widget directly without extra wrappers
    return (
      <View
        style={[
          styles.widgetWrapper,
          { width: gridConfig.widgetWidth, height: gridConfig.widgetHeight },
        ]}
      >
        {widgetComponent}
      </View>
    );
  };

  const handleDragEnd = ({ data }: { data: WidgetConfig[] }) => {
    if (!dashboard?.userPositioned) {
      // First drag in auto-discovery mode: automatically transition to user-positioned mode
      console.log('[DraggableWidgetGrid] First drag detected - transitioning to user-positioned mode');
      
      // Enable user positioning
      const enableUserPositioning = useWidgetStore.getState().enableUserPositioning;
      enableUserPositioning();
      
      // Initialize all widgets with page 0 and sequential positions
      const updatedWidgets = data.map((widget, index) => ({
        ...widget,
        layout: {
          ...widget.layout,
          page: 0,
          positionOrder: index,
        },
      }));
      
      const currentDashboard = useWidgetStore.getState().dashboards.find(
        d => d.id === useWidgetStore.getState().currentDashboard
      );
      if (currentDashboard) {
        useWidgetStore.getState().updateDashboard(currentDashboard.id, {
          widgets: updatedWidgets,
          userPositioned: true,
        });
      }
    } else {
      // User-positioned mode: update page positions
      const newOrder = data.map(widget => widget.id);
      reorderWidgetsOnPage(pageIndex, newOrder);
    }
  };

  // Render drop zone for cross-page drag (if callback provided)
  const renderDropZone = () => {
    if (!onMoveToPage || !dashboard?.userPositioned) return null;

    return (
      <View style={styles.dropZoneContainer}>
        <Pressable
          style={styles.dropZone}
          onPress={() => {
            // TODO: Implement drop zone interaction
            // This would be triggered when dragging a widget from another page
          }}
        >
          <Text style={styles.dropZoneText}>Drop Here to Move to Page {pageIndex + 1}</Text>
        </Pressable>
      </View>
    );
  };

  // Auto-discovery mode: render simple grid (no drag-and-drop yet)
  if (!dashboard?.userPositioned) {
    return (
      <View style={styles.autoDiscoveryContainer}>
        {pageWidgets.map(widget => {
          const widgetComponent = renderWidgetComponent(widget, gridConfig.widgetWidth, gridConfig.widgetHeight);
          if (!widgetComponent) return null;
          
          return (
            <View key={widget.id} style={[styles.autoDiscoveryWidget, { width: gridConfig.widgetWidth, height: gridConfig.widgetHeight }]}>
              {widgetComponent}
            </View>
          );
        })}
      </View>
    );
  }

  // User-positioned mode: render draggable list
  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={pageWidgets}
        onDragEnd={handleDragEnd}
        keyExtractor={(item) => item.id}
        renderItem={renderWidget}
        contentContainerStyle={styles.listContent}
      />
      {renderDropZone()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  autoDiscoveryContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 0,
  },
  autoDiscoveryWidget: {
    margin: 0,
  },
  widgetWrapper: {
    // Simple wrapper for widgets - no styling
  },
  listContent: {
    padding: 8,
  },
  widgetContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  widgetDragging: {
    backgroundColor: '#f8f8f8',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.05 }],
    opacity: 0.9,
  },
  widgetExpiring: {
    borderWidth: 2,
    borderColor: '#FFA500',
    backgroundColor: '#FFF8F0',
  },
  dragHandle: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 8,
    zIndex: 10,
  },
  dragHandleText: {
    fontSize: 20,
    color: '#999',
  },
  systemBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  systemBadgeText: {
    fontSize: 12,
  },
  expirationWarning: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  expirationWarningText: {
    fontSize: 14,
  },
  dropZoneContainer: {
    padding: 16,
  },
  dropZone: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1976d2',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  dropZoneText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
});
