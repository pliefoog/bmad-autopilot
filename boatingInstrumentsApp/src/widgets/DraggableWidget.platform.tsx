import { Platform } from 'react-native';

// Platform-specific implementations
const MobileDraggableWidget = require('./DraggableWidget').DraggableWidget;
const WebDraggableWidget = require('./DraggableWidget.web').DraggableWidget;

// Export the appropriate implementation based on platform
export const DraggableWidget = Platform.select({
  web: WebDraggableWidget,
  default: MobileDraggableWidget,
});

export default DraggableWidget;