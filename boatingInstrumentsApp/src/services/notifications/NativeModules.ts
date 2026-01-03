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
    actions?: {
      id: string;
      title: string;
      options?: string[];
    }[];
  }): Promise<void>;

  cancelNotification(id: string): Promise<void>;
  cancelAllNotifications(): Promise<void>;

  setBadgeCount(count: number): Promise<void>;
  getBadgeCount(): Promise<number>;

  registerNotificationCategories(
    categories: {
      id: string;
      actions: {
        id: string;
        title: string;
        options?: string[];
      }[];
    }[],
  ): Promise<void>;
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
    actions?: {
      id: string;
      title: string;
      icon?: string;
    }[];
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
const IOSNotificationsModule: IOSNotifications =
  Platform.OS === 'ios'
    ? NativeModules.IOSNotifications || createMockIOSModule()
    : createMockIOSModule();

const AndroidNotificationsModule: AndroidNotifications =
  Platform.OS === 'android'
    ? NativeModules.AndroidNotifications || createMockAndroidModule()
    : createMockAndroidModule();

// Mock implementations for development (would be replaced by actual native modules)
function createMockIOSModule(): IOSNotifications {
  return {
    async requestPermissions(options) {
      return {
        granted: true,
        alert: true,
        badge: true,
        sound: true,
        criticalAlert: options.criticalAlert,
      };
    },

    async scheduleNotification(notification) {},

    async cancelNotification(id) {},

    async cancelAllNotifications() {},

    async setBadgeCount(count) {},

    async getBadgeCount() {
      return 0;
    },

    async registerNotificationCategories(categories) {},
  };
}

function createMockAndroidModule(): AndroidNotifications {
  return {
    async requestPermissions() {
      return { granted: true, canRequestAgain: true };
    },

    async createNotificationChannel(channel) {},

    async sendNotification(notification) {},

    async cancelNotification(id) {},

    async cancelAllNotifications() {},

    async requestBatteryOptimizationExemption() {
      return true;
    },

    async startForegroundService(config) {},

    async stopForegroundService() {},
  };
}

export { IOSNotificationsModule, AndroidNotificationsModule };
export type { IOSNotifications, AndroidNotifications };
