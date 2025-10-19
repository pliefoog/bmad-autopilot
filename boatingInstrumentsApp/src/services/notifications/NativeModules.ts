import { NativeModules, Platform } from 'react-native';

// Native module interfaces for platform-specific notification functionality
interface IOSNotifications {
  requestPermissions(options: {
    alert: boolean;
    badge: boolean;
    sound: boolean;
    criticalAlert: boolean;
  }): Promise<{
    granted: boolean;
    alert: boolean;
    badge: boolean;
    sound: boolean;
    criticalAlert: boolean;
  }>;
  
  scheduleNotification(notification: {
    id: string;
    title: string;
    body: string;
    sound?: string;
    badge?: number;
    data?: any;
    criticalAlert?: boolean;
    interruptionLevel?: 'passive' | 'active' | 'timeSensitive' | 'critical';
    actions?: Array<{
      id: string;
      title: string;
      options?: string[];
    }>;
  }): Promise<void>;
  
  cancelNotification(id: string): Promise<void>;
  cancelAllNotifications(): Promise<void>;
  
  setBadgeCount(count: number): Promise<void>;
  getBadgeCount(): Promise<number>;
  
  registerNotificationCategories(categories: Array<{
    id: string;
    actions: Array<{
      id: string;
      title: string;
      options?: string[];
    }>;
  }>): Promise<void>;
}

interface AndroidNotifications {
  requestPermissions(): Promise<{
    granted: boolean;
    canRequestAgain: boolean;
  }>;
  
  createNotificationChannel(channel: {
    id: string;
    name: string;
    description?: string;
    importance: 'min' | 'low' | 'default' | 'high' | 'max';
    sound?: string;
    vibrationPattern?: number[];
    lightColor?: string;
    bypassDnd?: boolean;
  }): Promise<void>;
  
  sendNotification(notification: {
    id: string;
    channelId: string;
    title: string;
    body: string;
    sound?: string;
    vibrationPattern?: number[];
    priority?: 'min' | 'low' | 'default' | 'high' | 'max';
    data?: any;
    actions?: Array<{
      id: string;
      title: string;
      icon?: string;
    }>;
    ongoing?: boolean;
    autoCancel?: boolean;
  }): Promise<void>;
  
  cancelNotification(id: string): Promise<void>;
  cancelAllNotifications(): Promise<void>;
  
  requestBatteryOptimizationExemption(): Promise<boolean>;
  startForegroundService(config: {
    channelId: string;
    title: string;
    body: string;
    icon?: string;
  }): Promise<void>;
  
  stopForegroundService(): Promise<void>;
}

// Get native modules (would be provided by native code in production)
const IOSNotificationsModule: IOSNotifications = Platform.OS === 'ios' ? 
  (NativeModules.IOSNotifications || createMockIOSModule()) : 
  createMockIOSModule();

const AndroidNotificationsModule: AndroidNotifications = Platform.OS === 'android' ? 
  (NativeModules.AndroidNotifications || createMockAndroidModule()) : 
  createMockAndroidModule();

// Mock implementations for development (would be replaced by actual native modules)
function createMockIOSModule(): IOSNotifications {
  return {
    async requestPermissions(options) {
      console.log('[iOS Mock] Requesting permissions:', options);
      return {
        granted: true,
        alert: true,
        badge: true,
        sound: true,
        criticalAlert: options.criticalAlert
      };
    },
    
    async scheduleNotification(notification) {
      console.log('[iOS Mock] Scheduling notification:', notification);
    },
    
    async cancelNotification(id) {
      console.log('[iOS Mock] Canceling notification:', id);
    },
    
    async cancelAllNotifications() {
      console.log('[iOS Mock] Canceling all notifications');
    },
    
    async setBadgeCount(count) {
      console.log('[iOS Mock] Setting badge count:', count);
    },
    
    async getBadgeCount() {
      console.log('[iOS Mock] Getting badge count');
      return 0;
    },
    
    async registerNotificationCategories(categories) {
      console.log('[iOS Mock] Registering categories:', categories);
    }
  };
}

function createMockAndroidModule(): AndroidNotifications {
  return {
    async requestPermissions() {
      console.log('[Android Mock] Requesting permissions');
      return { granted: true, canRequestAgain: true };
    },
    
    async createNotificationChannel(channel) {
      console.log('[Android Mock] Creating channel:', channel);
    },
    
    async sendNotification(notification) {
      console.log('[Android Mock] Sending notification:', notification);
    },
    
    async cancelNotification(id) {
      console.log('[Android Mock] Canceling notification:', id);
    },
    
    async cancelAllNotifications() {
      console.log('[Android Mock] Canceling all notifications');
    },
    
    async requestBatteryOptimizationExemption() {
      console.log('[Android Mock] Requesting battery optimization exemption');
      return true;
    },
    
    async startForegroundService(config) {
      console.log('[Android Mock] Starting foreground service:', config);
    },
    
    async stopForegroundService() {
      console.log('[Android Mock] Stopping foreground service');
    }
  };
}

export { IOSNotificationsModule, AndroidNotificationsModule };
export type { IOSNotifications, AndroidNotifications };