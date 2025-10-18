/**
 * Secure Storage Service
 * Handles secure persistence of sensitive data like WiFi credentials
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WiFiCredentials {
  host: string;
  port: number;
  password?: string;
  ssid?: string;
}

export interface SecureStorageService {
  saveWiFiCredentials(credentials: WiFiCredentials): Promise<void>;
  loadWiFiCredentials(): Promise<WiFiCredentials | null>;
  clearCredentials(): Promise<void>;
  saveConnectionHistory(host: string, port: number): Promise<void>;
  getConnectionHistory(): Promise<WiFiCredentials[]>;
  clearConnectionHistory(): Promise<void>;
}

class SecureStorageServiceImpl implements SecureStorageService {
  private static instance: SecureStorageServiceImpl;
  private readonly WIFI_CREDENTIALS_KEY = 'wifi_credentials';
  private readonly CONNECTION_HISTORY_KEY = 'connection_history';
  private readonly MAX_HISTORY_ITEMS = 10;

  static getInstance(): SecureStorageServiceImpl {
    if (!SecureStorageServiceImpl.instance) {
      SecureStorageServiceImpl.instance = new SecureStorageServiceImpl();
    }
    return SecureStorageServiceImpl.instance;
  }

  async saveWiFiCredentials(credentials: WiFiCredentials): Promise<void> {
    try {
      // Validate credentials
      if (!credentials.host || !credentials.port) {
        throw new Error('Invalid credentials: host and port are required');
      }

      if (credentials.port < 1 || credentials.port > 65535) {
        throw new Error('Invalid port number: must be between 1 and 65535');
      }

      const credentialsData = JSON.stringify(credentials);
      await AsyncStorage.setItem(this.WIFI_CREDENTIALS_KEY, credentialsData);
      
      // Also save to connection history
      await this.saveConnectionHistory(credentials.host, credentials.port);
      
      console.log(`WiFi credentials saved for ${credentials.host}:${credentials.port}`);
    } catch (error) {
      console.error('Failed to save WiFi credentials:', error);
      throw new Error(`WiFi credentials save failed: ${error}`);
    }
  }

  async loadWiFiCredentials(): Promise<WiFiCredentials | null> {
    try {
      const credentialsData = await AsyncStorage.getItem(this.WIFI_CREDENTIALS_KEY);
      
      if (!credentialsData) {
        console.log('No saved WiFi credentials found');
        return null;
      }
      
      const credentials = JSON.parse(credentialsData) as WiFiCredentials;
      console.log(`Loaded WiFi credentials for ${credentials.host}:${credentials.port}`);
      return credentials;
    } catch (error) {
      console.error('Failed to load WiFi credentials:', error);
      throw new Error(`WiFi credentials load failed: ${error}`);
    }
  }

  async clearCredentials(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.WIFI_CREDENTIALS_KEY);
      console.log('WiFi credentials cleared');
    } catch (error) {
      console.error('Failed to clear WiFi credentials:', error);
      throw new Error(`WiFi credentials clear failed: ${error}`);
    }
  }

  async saveConnectionHistory(host: string, port: number): Promise<void> {
    try {
      const newConnection: WiFiCredentials = { host, port };
      
      // Load existing history
      const historyData = await AsyncStorage.getItem(this.CONNECTION_HISTORY_KEY);
      let history: WiFiCredentials[] = historyData ? JSON.parse(historyData) : [];
      
      // Remove duplicate if exists
      history = history.filter(item => !(item.host === host && item.port === port));
      
      // Add new connection to beginning
      history.unshift(newConnection);
      
      // Limit history size
      if (history.length > this.MAX_HISTORY_ITEMS) {
        history = history.slice(0, this.MAX_HISTORY_ITEMS);
      }
      
      await AsyncStorage.setItem(this.CONNECTION_HISTORY_KEY, JSON.stringify(history));
      console.log(`Connection history updated: ${host}:${port}`);
    } catch (error) {
      console.error('Failed to save connection history:', error);
      // Don't throw here as this is not critical functionality
    }
  }

  async getConnectionHistory(): Promise<WiFiCredentials[]> {
    try {
      const historyData = await AsyncStorage.getItem(this.CONNECTION_HISTORY_KEY);
      
      if (!historyData) {
        return [];
      }
      
      const history = JSON.parse(historyData) as WiFiCredentials[];
      console.log(`Loaded ${history.length} connection history items`);
      return history;
    } catch (error) {
      console.error('Failed to load connection history:', error);
      return [];
    }
  }

  async clearConnectionHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CONNECTION_HISTORY_KEY);
      console.log('Connection history cleared');
    } catch (error) {
      console.error('Failed to clear connection history:', error);
      throw new Error(`Connection history clear failed: ${error}`);
    }
  }
}

// Export singleton instance
export const secureStorageService = SecureStorageServiceImpl.getInstance();