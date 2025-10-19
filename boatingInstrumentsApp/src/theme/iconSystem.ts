/**
 * Icon System
 * Story 4.4 AC1-5: Standardized icon usage with Ionicons
 * 
 * Provides:
 * - Consistent icon naming
 * - Semantic icon mappings
 * - Icon size helpers
 * - Icon color helpers
 */

import { iconSizes } from './designTokens';

// ============================================================================
// STANDARD ICON NAMES (Ionicons 5.x)
// ============================================================================

export const icons = {
  // Navigation
  menu: 'menu',
  menuOutline: 'menu-outline',
  close: 'close',
  closeOutline: 'close-outline',
  arrowBack: 'arrow-back',
  arrowForward: 'arrow-forward',
  chevronBack: 'chevron-back',
  chevronForward: 'chevron-forward',
  chevronUp: 'chevron-up',
  chevronDown: 'chevron-down',

  // Actions
  add: 'add',
  addCircle: 'add-circle',
  addCircleOutline: 'add-circle-outline',
  remove: 'remove',
  removeCircle: 'remove-circle',
  removeCircleOutline: 'remove-circle-outline',
  create: 'create',
  createOutline: 'create-outline',
  trash: 'trash',
  trashOutline: 'trash-outline',
  save: 'save',
  saveOutline: 'save-outline',
  search: 'search',
  searchOutline: 'search-outline',
  filter: 'filter',
  filterOutline: 'filter-outline',
  refresh: 'refresh',
  refreshOutline: 'refresh-outline',

  // Undo/Redo
  arrowUndo: 'arrow-undo',
  arrowUndoOutline: 'arrow-undo-outline',
  arrowRedo: 'arrow-redo',
  arrowRedoOutline: 'arrow-redo-outline',

  // Status
  checkmark: 'checkmark',
  checkmarkCircle: 'checkmark-circle',
  checkmarkCircleOutline: 'checkmark-circle-outline',
  closeCircle: 'close-circle',
  closeCircleOutline: 'close-circle-outline',
  alert: 'alert',
  alertCircle: 'alert-circle',
  alertCircleOutline: 'alert-circle-outline',
  information: 'information',
  informationCircle: 'information-circle',
  informationCircleOutline: 'information-circle-outline',
  warning: 'warning',
  warningOutline: 'warning-outline',

  // Settings
  settings: 'settings',
  settingsOutline: 'settings-outline',
  options: 'options',
  optionsOutline: 'options-outline',
  construct: 'construct',
  constructOutline: 'construct-outline',

  // Communication
  notifications: 'notifications',
  notificationsOutline: 'notifications-outline',
  notificationsOff: 'notifications-off',
  notificationsOffOutline: 'notifications-off-outline',
  chatbox: 'chatbox',
  chatboxOutline: 'chatbox-outline',
  call: 'call',
  callOutline: 'call-outline',

  // Media
  play: 'play',
  playOutline: 'play-outline',
  pause: 'pause',
  pauseOutline: 'pause-outline',
  stop: 'stop',
  stopOutline: 'stop-outline',
  playCircle: 'play-circle',
  playCircleOutline: 'play-circle-outline',
  pauseCircle: 'pause-circle',
  pauseCircleOutline: 'pause-circle-outline',

  // Marine/Navigation specific
  compass: 'compass',
  compassOutline: 'compass-outline',
  navigate: 'navigate',
  navigateOutline: 'navigate-outline',
  location: 'location',
  locationOutline: 'location-outline',
  map: 'map',
  mapOutline: 'map-outline',
  boat: 'boat',
  boatOutline: 'boat-outline',
  water: 'water',
  waterOutline: 'water-outline',
  speedometer: 'speedometer',
  speedometerOutline: 'speedometer-outline',

  // Weather
  sunny: 'sunny',
  sunnyOutline: 'sunny-outline',
  moon: 'moon',
  moonOutline: 'moon-outline',
  partlySunny: 'partly-sunny',
  partlySunnyOutline: 'partly-sunny-outline',
  cloudy: 'cloudy',
  cloudyOutline: 'cloudy-outline',
  rainy: 'rainy',
  rainyOutline: 'rainy-outline',
  thunderstorm: 'thunderstorm',
  thunderstormOutline: 'thunderstorm-outline',

  // Connectivity
  wifi: 'wifi',
  wifiOutline: 'wifi-outline',
  bluetooth: 'bluetooth',
  bluetoothOutline: 'bluetooth-outline',
  cellular: 'cellular',
  cellularOutline: 'cellular-outline',
  link: 'link',
  linkOutline: 'link-outline',

  // Power/Battery
  battery: 'battery-full',
  batteryHalf: 'battery-half',
  batteryDead: 'battery-dead',
  batteryCharging: 'battery-charging',
  power: 'power',
  powerOutline: 'power-outline',
  flash: 'flash',
  flashOutline: 'flash-outline',

  // Time
  time: 'time',
  timeOutline: 'time-outline',
  timer: 'timer',
  timerOutline: 'timer-outline',
  alarm: 'alarm',
  alarmOutline: 'alarm-outline',
  stopwatch: 'stopwatch',
  stopwatchOutline: 'stopwatch-outline',

  // User
  person: 'person',
  personOutline: 'person-outline',
  people: 'people',
  peopleOutline: 'people-outline',
  personCircle: 'person-circle',
  personCircleOutline: 'person-circle-outline',

  // Document
  document: 'document',
  documentOutline: 'document-outline',
  documentText: 'document-text',
  documentTextOutline: 'document-text-outline',
  clipboard: 'clipboard',
  clipboardOutline: 'clipboard-outline',

  // Accessibility
  eye: 'eye',
  eyeOutline: 'eye-outline',
  eyeOff: 'eye-off',
  eyeOffOutline: 'eye-off-outline',
  reader: 'reader',
  readerOutline: 'reader-outline',
  text: 'text',
  textOutline: 'text-outline',

  // Misc
  heart: 'heart',
  heartOutline: 'heart-outline',
  star: 'star',
  starOutline: 'star-outline',
  bookmark: 'bookmark',
  bookmarkOutline: 'bookmark-outline',
  flag: 'flag',
  flagOutline: 'flag-outline',
  lock: 'lock-closed',
  lockOpen: 'lock-open',
  lockOutline: 'lock-closed-outline',
  lockOpenOutline: 'lock-open-outline',
  key: 'key',
  keyOutline: 'key-outline',
  shield: 'shield',
  shieldOutline: 'shield-outline',
  home: 'home',
  homeOutline: 'home-outline',
  grid: 'grid',
  gridOutline: 'grid-outline',
  list: 'list',
  listOutline: 'list-outline',
  apps: 'apps',
  appsOutline: 'apps-outline',
  layers: 'layers',
  layersOutline: 'layers-outline',
  copy: 'copy',
  copyOutline: 'copy-outline',
  duplicate: 'duplicate',
  duplicateOutline: 'duplicate-outline',
  share: 'share',
  shareOutline: 'share-outline',
  download: 'download',
  downloadOutline: 'download-outline',
  cloud: 'cloud',
  cloudOutline: 'cloud-outline',
  cloudDownload: 'cloud-download',
  cloudDownloadOutline: 'cloud-download-outline',
  cloudUpload: 'cloud-upload',
  cloudUploadOutline: 'cloud-upload-outline',
  folder: 'folder',
  folderOutline: 'folder-outline',
  folderOpen: 'folder-open',
  folderOpenOutline: 'folder-open-outline',
  image: 'image',
  imageOutline: 'image-outline',
  images: 'images',
  imagesOutline: 'images-outline',
  camera: 'camera',
  cameraOutline: 'camera-outline',
  videocam: 'videocam',
  videocamOutline: 'videocam-outline',
  mic: 'mic',
  micOutline: 'mic-outline',
  micOff: 'mic-off',
  micOffOutline: 'mic-off-outline',
  volume: 'volume-high',
  volumeMedium: 'volume-medium',
  volumeLow: 'volume-low',
  volumeMute: 'volume-mute',
  volumeOutline: 'volume-high-outline',
  expand: 'expand',
  expandOutline: 'expand-outline',
  contract: 'contract',
  contractOutline: 'contract-outline',
  resize: 'resize',
  resizeOutline: 'resize-outline',
  swap: 'swap-horizontal',
  swapVertical: 'swap-vertical',
  swapOutline: 'swap-horizontal-outline',
  swapVerticalOutline: 'swap-vertical-outline',
  print: 'print',
  printOutline: 'print-outline',
  qrCode: 'qr-code',
  qrCodeOutline: 'qr-code-outline',
  barcode: 'barcode',
  barcodeOutline: 'barcode-outline',
  calculator: 'calculator',
  calculatorOutline: 'calculator-outline',
  calendar: 'calendar',
  calendarOutline: 'calendar-outline',
  code: 'code',
  codeOutline: 'code-outline',
  terminal: 'terminal',
  terminalOutline: 'terminal-outline',
  bug: 'bug',
  bugOutline: 'bug-outline',
  build: 'build',
  buildOutline: 'build-outline',
  hammer: 'hammer',
  hammerOutline: 'hammer-outline',
  help: 'help',
  helpCircle: 'help-circle',
  helpCircleOutline: 'help-circle-outline',
  helpBuoy: 'help-buoy',
  helpBuoyOutline: 'help-buoy-outline',
  ellipsisHorizontal: 'ellipsis-horizontal',
  ellipsisVertical: 'ellipsis-vertical',
  ellipsisHorizontalCircle: 'ellipsis-horizontal-circle',
  ellipsisVerticalCircle: 'ellipsis-vertical-circle',
};

// ============================================================================
// SEMANTIC ICON MAPPINGS
// ============================================================================

export const semanticIcons = {
  // Status feedback
  success: icons.checkmarkCircle,
  error: icons.closeCircle,
  warning: icons.alertCircle,
  info: icons.informationCircle,

  // Actions
  confirm: icons.checkmark,
  cancel: icons.close,
  delete: icons.trashOutline,
  edit: icons.createOutline,
  save: icons.saveOutline,
  add: icons.addCircleOutline,
  remove: icons.removeCircleOutline,

  // Navigation
  back: icons.arrowBack,
  forward: icons.arrowForward,
  up: icons.chevronUp,
  down: icons.chevronDown,
  menu: icons.menuOutline,
  close: icons.closeOutline,

  // Theme
  lightMode: icons.sunnyOutline,
  darkMode: icons.moonOutline,
  autoMode: icons.partlySunnyOutline,

  // Connectivity
  connected: icons.checkmarkCircle,
  connecting: icons.ellipsisHorizontalCircle,
  disconnected: icons.closeCircle,
  
  // Marine
  depth: icons.waterOutline,
  speed: icons.speedometerOutline,
  compass: icons.compassOutline,
  gps: icons.navigateOutline,
  wind: icons.cloudyOutline,
  autopilot: icons.navigateOutline,
  engine: icons.constructOutline,
  battery: icons.battery,
  tanks: icons.waterOutline,

  // Settings
  settings: icons.settingsOutline,
  configuration: icons.optionsOutline,
  preferences: icons.settingsOutline,

  // Help
  help: icons.helpCircleOutline,
  documentation: icons.documentTextOutline,
  tutorial: icons.helpBuoyOutline,
};

// ============================================================================
// ICON SIZE HELPERS
// ============================================================================

export const getIconSize = (size: keyof typeof iconSizes = 'base'): number => {
  return iconSizes[size];
};

// ============================================================================
// ICON COMPONENT PROPS HELPER
// ============================================================================

export interface StandardIconProps {
  name: string;
  size?: keyof typeof iconSizes | number;
  color?: string;
}

export const getStandardIconProps = (
  iconName: string,
  size: keyof typeof iconSizes | number = 'base',
  color?: string
): { name: string; size: number; color?: string } => {
  return {
    name: iconName,
    size: typeof size === 'number' ? size : iconSizes[size],
    color,
  };
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
  icons,
  semanticIcons,
  getIconSize,
  getStandardIconProps,
};
