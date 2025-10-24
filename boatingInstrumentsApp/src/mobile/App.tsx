import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNmeaStore } from '../store/nmeaStore';
import { useThemeStore, useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { PlaybackService } from '../services/playbackService';
import { StressTestService } from '../services/stressTestService';
import { PlatformStyles } from '../utils/animationUtils';
import { TextNodeCatcher } from '../debug/TextNodeCatcher';
import { DepthWidget } from '../widgets/DepthWidget';
import { SpeedWidget } from '../widgets/SpeedWidget';
import { WindWidget } from '../widgets/WindWidget';
import { GPSWidget } from '../widgets/GPSWidget';
import { CompassWidget } from '../widgets/CompassWidget';
import { EngineWidget } from '../widgets/EngineWidget';
import { BatteryWidget } from '../widgets/BatteryWidget';
import { TanksWidget } from '../widgets/TanksWidget';
import { RudderPositionWidget } from '../widgets/RudderPositionWidget';
import { WaterTemperatureWidget } from '../widgets/WaterTemperatureWidget';
import { ThemeSwitcher } from '../widgets/ThemeSwitcher';
import { AutopilotStatusWidget } from '../widgets/AutopilotStatusWidget';
import { AutopilotControlScreen } from '../widgets/AutopilotControlScreen';
import { WidgetSelector } from '../widgets/WidgetSelector';
import { AlarmBanner } from '../widgets/AlarmBanner';
import { LayoutManager, LayoutWidget } from '../widgets/LayoutManager';
import { WidgetShell } from '../components/WidgetShell';
import HeaderBar from '../components/HeaderBar';
import ToastMessage, { ToastMessageData } from '../components/ToastMessage';
import { ConnectionConfigDialog } from '../widgets/ConnectionConfigDialog';
import { 
  getConnectionDefaults, 
  loadConnectionSettings, 
  connectNmea, 
  disconnectNmea, 
  shouldEnableConnectButton, 
  getCurrentConnectionConfig, 
  initializeConnection,
  type ConnectionConfig 
} from '../services/connectionDefaults';
import { AutopilotFooter } from '../components/organisms/AutopilotFooter';

// Developer services (only loaded in development)
let playbackService: any = null;
let stressTestService: any = null;

if (__DEV__ || process.env.NODE_ENV === 'development') {
  try {
    playbackService = require('../services/playbackService').playbackService;
    stressTestService = require('../services/stressTestService').stressTestService;
  } catch (e) {
    console.warn('Developer services not available:', e);
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected':
      return 'green';
    case 'no-data':
      return 'orange';
    case 'connecting':
      return 'blue';
    default:
      return 'red';
  }
};

const STORAGE_KEY = 'nmea-connection-config';
const WIDGET_STATE_KEY = 'widget-expanded-state';
const THEME_PREFERENCE_KEY = 'theme-preference';

// Calculate proper heights for dashboard layout
const { height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = 60; // HeaderBar height
const FOOTER_HEIGHT = 88; // Autopilot Control (70) + Bottom Nav (18)
const DASHBOARD_HEIGHT = screenHeight - HEADER_HEIGHT - FOOTER_HEIGHT;

// Load persisted widget states
const loadWidgetStates = async (): Promise<Record<string, boolean>> => {
  try {
    const stored = await AsyncStorage.getItem(WIDGET_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load widget states:', error);
  }
  return {};
};

// Save widget states
const saveWidgetStates = async (states: Record<string, boolean>) => {
  try {
    await AsyncStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to save widget states:', error);
  }
};

const App = () => {
  const { connectionStatus, nmeaData, alarms, lastError } = useNmeaStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const { toggleWidgetPin, isWidgetPinned } = useWidgetStore();
  const theme = useTheme();
  const defaults = getConnectionDefaults();
  const [ip, setIp] = useState(defaults.ip);
  const [port, setPort] = useState(defaults.port.toString());
  const [protocol, setProtocol] = useState<'tcp' | 'udp' | 'websocket'>(defaults.protocol);
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([
    'depth', 'speed', 'wind', 'gps', 'compass', 'engine', 'battery', 'tanks', 'autopilot', 
    'rudder', 'water-temp', 'theme'
  ]);
  
  // Track detected instances for dynamic widget creation
  const [detectedInstances, setDetectedInstances] = useState<{
    batteries: string[];
    engines: string[];
    tanks: string[];
  }>({
    batteries: [],
    engines: [],
    tanks: []
  });
  const [showAutopilotControl, setShowAutopilotControl] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessageData | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  
  // Widget expansion state management
  const [expandedWidgets, setExpandedWidgets] = useState<Record<string, boolean>>({
    depth: false,
    speed: false,
    wind: false,
    gps: false,
    compass: false,
    engine: false,
    battery: false,
    tanks: false,
    autopilot: false,
  });

  // Show toast for errors
  useEffect(() => {
    if (lastError) {
      setToastMessage({
        message: lastError,
        type: 'error',
        duration: 5000,
      });
    }
  }, [lastError]);

  // Helper function to show success toasts
  const showSuccessToast = (message: string) => {
    setToastMessage({
      message,
      type: 'success',
      duration: 3000,
    });
  };

  // Helper function to show warning toasts
  const showWarningToast = (message: string) => {
    setToastMessage({
      message,
      type: 'warning',
      duration: 5000,
    });
  };

  // Helper function to show error toasts
  const showErrorToast = (message: string) => {
    setToastMessage({
      message,
      type: 'error',
      duration: 5000,
    });
  };

  const playbackService = new PlaybackService();
  const stressTestService = new StressTestService();

  // Initialize widget states from storage
  useEffect(() => {
    const initializeWidgetStates = async () => {
      const savedStates = await loadWidgetStates();
      if (Object.keys(savedStates).length > 0) {
        setExpandedWidgets(prev => ({ ...prev, ...savedStates }));
      }
    };
    initializeWidgetStates();
  }, []);

  // Toggle widget expanded state
  const toggleWidgetExpanded = useCallback((widgetKey: string) => {
    setExpandedWidgets(prev => {
      const newState = {
        ...prev,
        [widgetKey]: !prev[widgetKey],
      };
      saveWidgetStates(newState); // Persist to storage
      return newState;
    });
  }, []);

  // Lock widget in expanded state (long-press functionality)
  const lockWidgetExpanded = useCallback((widgetKey: string) => {
    setExpandedWidgets(prev => {
      const newState = {
        ...prev,
        [widgetKey]: true, // Always expand on lock
      };
      saveWidgetStates(newState);

      // Show visual feedback
      showSuccessToast(`${widgetKey.toUpperCase()} widget locked in expanded mode`);
      return newState;
    });
  }, []);

  // Navigation Session Management
  const [navigationSession, setNavigationSession] = useState<{
    isRecording: boolean;
    startTime?: Date;
    sessionId?: string;
  }>({
    isRecording: false
  });

  // Auto-detect session start based on NMEA data
  useEffect(() => {
    if (!navigationSession.isRecording && nmeaData) {
      const shouldAutoStart = 
        (nmeaData.sog && nmeaData.sog > 2.0) ||                    // Speed over ground > 2 knots
        (nmeaData.engine?.rpm && nmeaData.engine.rpm > 800) ||     // Engine running
        (nmeaData.speed && nmeaData.speed > 2.0);                  // Any speed > 2 knots

      if (shouldAutoStart) {
        startNavigationSession(true); // Auto-start
      }
    }
  }, [nmeaData, navigationSession.isRecording]);

  // Start navigation session
  const startNavigationSession = useCallback((autoStart = false) => {
    const sessionId = `session-${Date.now()}`;
    setNavigationSession({
      isRecording: true,
      startTime: new Date(),
      sessionId
    });
    
    const message = autoStart 
      ? 'Navigation session auto-started' 
      : 'Navigation session started';
    showSuccessToast(message);
  }, []);

  // Stop navigation session
  const stopNavigationSession = useCallback(() => {
    if (navigationSession.startTime) {
      const duration = Date.now() - navigationSession.startTime.getTime();
      const minutes = Math.round(duration / 60000);
      
      setNavigationSession({ isRecording: false });
      showSuccessToast(`Navigation session stopped (${minutes} min)`);
    }
  }, [navigationSession]);

  // Toggle navigation session
  const toggleNavigationSession = useCallback(() => {
    if (navigationSession.isRecording) {
      stopNavigationSession();
    } else {
      startNavigationSession(false); // Manual start
    }
  }, [navigationSession.isRecording, startNavigationSession, stopNavigationSession]);

  // Battery Bank Auto-Detection Management
  interface BatteryBank {
    id: string;
    name: string;
    instance: number;
    voltage: number;
    current: number;
    stateOfCharge?: number;
    temperature?: number;
    type: string; // DC_SOURCE from PGN 127506
    chemistry?: string; // BATTERY_CHEMISTRY from PGN 127513
    capacity?: number; // Ah from PGN 127513
    autoDetected: boolean;
    detectionSource: string;
    pgns: string[];
    lastSeen?: number;
  }

  const [detectedBatteryBanks, setDetectedBatteryBanks] = useState<BatteryBank[]>([]);

  // Auto-detect battery banks from NMEA data
  const detectBatteryBanks = useCallback(() => {
    if (!nmeaData || !nmeaData.battery) return [];
    
    const detectedBanks: BatteryBank[] = [];
    
    // NMEA 2000 Battery Bank Detection Strategy:
    // PGN 127508 (Battery Status): Instance field identifies different battery banks
    // PGN 127506 (DC Detailed Status): Provides detailed status including DC Type and State of Charge
    // PGN 127513 (Battery Configuration Status): Battery type, chemistry, capacity information
    
    // Check if we have extended NMEA 2000 battery data (future enhancement)
    const extendedBatteryData = (nmeaData as any).batteryBanks;
    if (Array.isArray(extendedBatteryData)) {
      // Multiple battery banks detected via NMEA 2000 proper PGNs
      extendedBatteryData.forEach((bank: any, index: number) => {
        if (bank.voltage && bank.voltage > 0) {
          const bankInstance = bank.instance !== undefined ? bank.instance : index;
          const bankName = getBatteryBankName(bankInstance, bank.dcType);
          
          detectedBanks.push({
            id: `bank_${bankInstance}`,
            name: bankName,
            instance: bankInstance,
            voltage: bank.voltage,
            current: bank.current || 0,
            stateOfCharge: bank.stateOfCharge,
            temperature: bank.temperature,
            type: bank.dcType || 'battery',
            chemistry: bank.chemistry,
            capacity: bank.capacity,
            autoDetected: true,
            detectionSource: 'NMEA2000',
            pgns: determinePGNs(bank),
            lastSeen: Date.now()
          });
        }
      });
    } else {
      // Current simplified battery structure - detect available banks
      const battery = nmeaData.battery;
      
      // House battery detection
      if (battery.house && battery.house > 0) {
        detectedBanks.push({
          id: 'bank_house',
          name: 'House Battery',
          instance: 0,
          voltage: battery.house,
          current: 0, // Not available in current structure
          stateOfCharge: undefined,
          temperature: undefined,
          type: 'battery',
          chemistry: undefined,
          capacity: undefined,
          autoDetected: true,
          detectionSource: 'NMEA0183/Simplified',
          pgns: ['127508'], // Assume basic battery status
          lastSeen: Date.now()
        });
      }
      
      // Engine/Start battery detection
      if (battery.engine && battery.engine > 0) {
        detectedBanks.push({
          id: 'bank_engine',
          name: 'Start Battery',
          instance: 1,
          voltage: battery.engine,
          current: 0, // Not available in current structure
          stateOfCharge: undefined,
          temperature: undefined,
          type: 'battery',
          chemistry: undefined,
          capacity: undefined,
          autoDetected: true,
          detectionSource: 'NMEA0183/Simplified',
          pgns: ['127508'], // Assume basic battery status
          lastSeen: Date.now()
        });
      }
    }
    
    // Filter out stale detections (older than 30 seconds)
    const currentTime = Date.now();
    return detectedBanks.filter(bank => 
      currentTime - (bank.lastSeen || 0) < 30000
    );
  }, [nmeaData]);

  // Helper function to determine appropriate battery bank name based on instance and type
  const getBatteryBankName = (instance: number, dcType?: string): string => {
    // NMEA 2000 DC_SOURCE lookup values:
    // 0: Battery, 1: Alternator, 2: Convertor, 3: Solar cell, 4: Wind generator
    const typeNames: Record<string, string> = {
      '0': 'Battery',
      '1': 'Alternator',
      '2': 'Converter',
      '3': 'Solar',
      '4': 'Wind Generator',
      'battery': 'Battery',
      'alternator': 'Alternator',
      'converter': 'Converter',
      'solar': 'Solar',
      'wind': 'Wind Generator'
    };
    
    const baseType = typeNames[dcType || '0'] || 'Battery';
    
    // Common marine battery bank naming conventions
    if (instance === 0) return `House ${baseType}`;
    if (instance === 1) return `Start ${baseType}`;
    if (instance === 2) return `Bow Thruster ${baseType}`;
    if (instance === 3) return `Stern Thruster ${baseType}`;
    
    return `${baseType} ${instance + 1}`;
  };

  // Helper function to determine which PGNs are providing data
  const determinePGNs = (bankData: any): string[] => {
    const pgns: string[] = [];
    
    // PGN 127508 - Battery Status (voltage, current, temperature)
    if (bankData.voltage || bankData.current || bankData.temperature) {
      pgns.push('127508');
    }
    
    // PGN 127506 - DC Detailed Status (SOC, dcType, remaining capacity)
    if (bankData.stateOfCharge || bankData.dcType || bankData.remainingCapacity) {
      pgns.push('127506');
    }
    
    // PGN 127513 - Battery Configuration Status (chemistry, capacity, type)
    if (bankData.chemistry || bankData.capacity || bankData.batteryType) {
      pgns.push('127513');
    }
    
    return pgns.length > 0 ? pgns : ['127508']; // Default to basic battery status
  };

  // Effect to continuously detect battery banks
  useEffect(() => {
    const banks = detectBatteryBanks();
    if (banks.length > 0) {
      setDetectedBatteryBanks(banks);
      
      // Show toast for newly detected banks
      const newBanks = banks.filter(bank => 
        !detectedBatteryBanks.some(existing => existing.id === bank.id)
      );
      
      if (newBanks.length > 0) {
        const bankNames = newBanks.map(bank => bank.name).join(', ');
        showSuccessToast(`Detected battery banks: ${bankNames}`);
      }
    }
  }, [nmeaData, detectBatteryBanks]);

  // VMG (Velocity Made Good) Management
  const [vmgData, setVmgData] = useState<{
    vmg?: number;
    vmgToWind?: number;
    targetVmg?: number;
    efficiency?: number;
    available: boolean;
    source: string;
  }>({
    available: false,
    source: 'Unknown'
  });

  // Calculate or extract VMG from NMEA data
  const calculateVMG = useCallback(() => {
    if (!nmeaData) {
      setVmgData(prev => ({ ...prev, available: false }));
      return;
    }

    // Option 1: Direct VMG from NMEA 2000 (if available)
    const directVmg = (nmeaData as any).vmg;
    if (directVmg !== undefined && directVmg !== null) {
      setVmgData({
        vmg: directVmg,
        vmgToWind: (nmeaData as any).vmgToWind,
        targetVmg: (nmeaData as any).targetVmg,
        efficiency: (nmeaData as any).vmgEfficiency,
        available: true,
        source: 'NMEA2000_Direct'
      });
      return;
    }

    // Option 2: Calculate VMG from COG, SOG, and target waypoint
    if (nmeaData.cog !== undefined && nmeaData.sog !== undefined && nmeaData.gpsPosition) {
      // VMG = SOG * cos(angle between COG and desired track)
      // For now, assume we're calculating VMG to current course
      const calculatedVmg = nmeaData.sog; // Simplified - would need target bearing for true VMG
      
      setVmgData({
        vmg: calculatedVmg,
        vmgToWind: undefined,
        targetVmg: undefined,
        efficiency: undefined,
        available: true,
        source: 'Calculated_COG_SOG'
      });
      return;
    }

    // Option 3: VMG to wind (sailing performance)
    if (nmeaData.windAngle !== undefined && nmeaData.windSpeed !== undefined && nmeaData.sog) {
      // VMG to wind = SOG * cos(wind angle)
      const vmgToWind = nmeaData.sog * Math.cos(nmeaData.windAngle * Math.PI / 180);
      
      setVmgData({
        vmg: vmgToWind,
        vmgToWind: vmgToWind,
        targetVmg: undefined,
        efficiency: undefined,
        available: true,
        source: 'Calculated_Wind'
      });
      return;
    }

    // Option 4: VMG using relative wind data (more accurate for sailing)
    if (nmeaData.relativeWindAngle !== undefined && nmeaData.relativeWindSpeed !== undefined && nmeaData.sog) {
      // VMG to relative wind = SOG * cos(relative wind angle)
      const vmgToWind = nmeaData.sog * Math.cos(nmeaData.relativeWindAngle * Math.PI / 180);
      
      setVmgData({
        vmg: vmgToWind,
        vmgToWind: vmgToWind,
        targetVmg: undefined,
        efficiency: undefined,
        available: true,
        source: 'Calculated_RelativeWind'
      });
      return;
    }

    // No VMG data available
    setVmgData({
      available: false,
      source: 'Unavailable'
    });
  }, [nmeaData]);

  // Effect to continuously calculate VMG
  useEffect(() => {
    calculateVMG();
  }, [calculateVMG]);

  // Auto-detect NMEA instances and create appropriate widgets
  useEffect(() => {
    if (!nmeaData) return;
    
    const newInstances = {
      batteries: [] as string[],
      engines: [] as string[],
      tanks: [] as string[]
    };
    
    // Detect battery instances from basic and PGN data
    if (nmeaData.battery) {
      if (nmeaData.battery.house !== undefined) newInstances.batteries.push('battery-house');
      if (nmeaData.battery.engine !== undefined) newInstances.batteries.push('battery-engine');
    }
    
    // Check PGN data for additional battery instances
    if (nmeaData.pgnData) {
      // PGN 127508 - DC Detailed Status
      const batteryPgn = nmeaData.pgnData['127508'] as any;
      if (batteryPgn) {
        const instances = Array.isArray(batteryPgn) ? batteryPgn : [batteryPgn];
        instances.forEach((data: any) => {
          if (data.instance === 0 && !newInstances.batteries.includes('battery-house')) {
            newInstances.batteries.push('battery-house');
          } else if (data.instance === 1 && !newInstances.batteries.includes('battery-engine')) {
            newInstances.batteries.push('battery-engine');
          } else if (data.instance === 2 && !newInstances.batteries.includes('battery-thruster')) {
            newInstances.batteries.push('battery-thruster');
          }
        });
      }
    }
    
    // Detect engine instances from basic and PGN data
    if (nmeaData.engine?.rpm !== undefined) {
      newInstances.engines.push('engine-main');
    }
    
    // Check PGN data for additional engine instances
    if (nmeaData.pgnData) {
      // PGN 127488 - Engine Parameters, Rapid Update
      const enginePgn = nmeaData.pgnData['127488'] as any;
      if (enginePgn) {
        const instances = Array.isArray(enginePgn) ? enginePgn : [enginePgn];
        instances.forEach((data: any) => {
          if (data.instance === 0 && !newInstances.engines.includes('engine-port')) {
            newInstances.engines.push('engine-port');
          } else if (data.instance === 1 && !newInstances.engines.includes('engine-starboard')) {
            newInstances.engines.push('engine-starboard');
          } else if (data.instance === 2 && !newInstances.engines.includes('engine-main')) {
            newInstances.engines.push('engine-main');
          }
        });
      }
    }
    
    // Detect tank instances from basic and PGN data
    if (nmeaData.tanks) {
      if (nmeaData.tanks.fuel !== undefined) newInstances.tanks.push('tank-fuel');
      if (nmeaData.tanks.water !== undefined) newInstances.tanks.push('tank-water');
      if (nmeaData.tanks.waste !== undefined) newInstances.tanks.push('tank-waste');
    }
    
    // Check PGN data for additional tank instances
    if (nmeaData.pgnData) {
      // PGN 127505 - Fluid Level
      const tankPgn = nmeaData.pgnData['127505'] as any;
      if (tankPgn) {
        const instances = Array.isArray(tankPgn) ? tankPgn : [tankPgn];
        instances.forEach((data: any) => {
          if (data.fluidType === 0 && !newInstances.tanks.includes('tank-fuel')) {
            newInstances.tanks.push('tank-fuel');
          } else if (data.fluidType === 1 && !newInstances.tanks.includes('tank-water')) {
            newInstances.tanks.push('tank-water');
          } else if (data.fluidType === 3 && !newInstances.tanks.includes('tank-waste')) {
            newInstances.tanks.push('tank-waste');
          }
        });
      }
    }
    
    // Update detected instances if changed
    const instancesChanged = 
      JSON.stringify(newInstances) !== JSON.stringify(detectedInstances);
      
    if (instancesChanged) {
      setDetectedInstances(newInstances);
      
      // Auto-add detected instances to selectedWidgets (but don't remove existing ones)
      const allDetected = [
        ...newInstances.batteries,
        ...newInstances.engines, 
        ...newInstances.tanks
      ];
      
      const newWidgets = allDetected.filter(widget => !selectedWidgets.includes(widget));
      
      if (newWidgets.length > 0) {
        setSelectedWidgets(prev => [...prev, ...newWidgets]);
        showSuccessToast(`Auto-detected: ${newWidgets.join(', ')}`);
      }
    }
  }, [nmeaData, detectedInstances, selectedWidgets]);

  // Theme cycling logic
  const cycleTheme = useCallback(() => {
    const nextTheme = 
      themeMode === 'day' ? 'night' :
      themeMode === 'night' ? 'red-night' : 'day';

    setThemeMode(nextTheme);
    showSuccessToast(`Theme: ${nextTheme.toUpperCase().replace('-', ' ')}`);
  }, [themeMode, setThemeMode]);

  // Developer tool handlers (only available in development)
  const handleStartPlayback = useCallback(() => {
    if (playbackService) {
      try {
        playbackService.startPlayback('demo.nmea');
        setToastMessage({
          message: 'NMEA playback started',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        setToastMessage({
          message: 'Failed to start playback',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, []);

  const handleStopPlayback = useCallback(() => {
    if (playbackService) {
      try {
        playbackService.stopPlayback();
        setToastMessage({
          message: 'NMEA playback stopped',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        setToastMessage({
          message: 'Failed to stop playback',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, []);

  const handleStartStressTest = useCallback(() => {
    if (stressTestService) {
      try {
        stressTestService.start(500); // 500ms interval
        setToastMessage({
          message: 'Stress test started',
          type: 'warning',
          duration: 2000,
        });
      } catch (error) {
        setToastMessage({
          message: 'Failed to start stress test',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, []);

  const handleStopStressTest = useCallback(() => {
    if (stressTestService) {
      try {
        stressTestService.stop();
        setToastMessage({
          message: 'Stress test stopped',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        setToastMessage({
          message: 'Failed to stop stress test',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, []);

  const widgetMap: { [key: string]: () => React.ReactNode } = {
    depth: () => (
      <TextNodeCatcher widgetName="DepthWidget">
        <DepthWidget id="depth" title="DEPTH" />
      </TextNodeCatcher>
    ),
    speed: () => (
      <TextNodeCatcher widgetName="SpeedWidget">
        <SpeedWidget id="speed" title="SPEED" />
      </TextNodeCatcher>
    ),
    wind: () => (
      <TextNodeCatcher widgetName="WindWidget">
        <WindWidget id="wind" title="WIND" />
      </TextNodeCatcher>
    ),
    gps: () => (
      <TextNodeCatcher widgetName="GPSWidget">
        <GPSWidget id="gps" title="GPS" />
      </TextNodeCatcher>
    ),
    compass: () => (
      <TextNodeCatcher widgetName="CompassWidget">
        <CompassWidget id="compass" title="COMPASS" />
      </TextNodeCatcher>
    ),
    engine: () => (
      <TextNodeCatcher widgetName="EngineWidget">
        <EngineWidget id="engine" title="ENGINE" />
      </TextNodeCatcher>
    ),
    'engine-port': () => (
      <TextNodeCatcher widgetName="EngineWidget-Port">
        <EngineWidget id="engine-port" title="PORT ENGINE" />
      </TextNodeCatcher>
    ),
    'engine-starboard': () => (
      <TextNodeCatcher widgetName="EngineWidget-Starboard">
        <EngineWidget id="engine-starboard" title="STBD ENGINE" />
      </TextNodeCatcher>
    ),
    'engine-main': () => (
      <TextNodeCatcher widgetName="EngineWidget-Main">
        <EngineWidget id="engine-main" title="MAIN ENGINE" />
      </TextNodeCatcher>
    ),
    battery: () => (
      <TextNodeCatcher widgetName="BatteryWidget">
        <BatteryWidget id="battery" title="BATTERY" batteryInstance="house" />
      </TextNodeCatcher>
    ),
    'battery-house': () => (
      <TextNodeCatcher widgetName="BatteryWidget-House">
        <BatteryWidget id="battery-house" title="HOUSE BATTERY" batteryInstance="house" />
      </TextNodeCatcher>
    ),
    'battery-engine': () => (
      <TextNodeCatcher widgetName="BatteryWidget-Engine">
        <BatteryWidget id="battery-engine" title="START BATTERY" batteryInstance="engine" />
      </TextNodeCatcher>
    ),
    'battery-thruster': () => (
      <TextNodeCatcher widgetName="BatteryWidget-Thruster">
        <BatteryWidget id="battery-thruster" title="THRUSTER BATTERY" batteryInstance="thruster" />
      </TextNodeCatcher>
    ),
    tanks: () => (
      <TextNodeCatcher widgetName="TanksWidget">
        <TanksWidget id="tanks" title="TANKS" />
      </TextNodeCatcher>
    ),
    'tank-fuel': () => (
      <TextNodeCatcher widgetName="TanksWidget-Fuel">
        <TanksWidget id="tank-fuel" title="FUEL TANK" />
      </TextNodeCatcher>
    ),
    'tank-water': () => (
      <TextNodeCatcher widgetName="TanksWidget-Water">
        <TanksWidget id="tank-water" title="WATER TANK" />
      </TextNodeCatcher>
    ),
    'tank-waste': () => (
      <TextNodeCatcher widgetName="TanksWidget-Waste">
        <TanksWidget id="tank-waste" title="WASTE TANK" />
      </TextNodeCatcher>
    ),
    autopilot: () => (
      <TextNodeCatcher widgetName="AutopilotStatusWidget">
        <WidgetShell
          expanded={expandedWidgets.autopilot}
          onToggle={() => toggleWidgetExpanded('autopilot')}
          onLongPress={() => lockWidgetExpanded('autopilot')}
          testID="autopilot-shell"
        >
          <AutopilotStatusWidget />
        </WidgetShell>
      </TextNodeCatcher>
    ),
    rudder: () => (
      <TextNodeCatcher widgetName="RudderPositionWidget">
        <RudderPositionWidget id="rudder" title="RUDDER" />
      </TextNodeCatcher>
    ),
    'water-temp': () => (
      <TextNodeCatcher widgetName="WaterTemperatureWidget">
        <WaterTemperatureWidget id="water-temp" title="WATER TEMP" />
      </TextNodeCatcher>
    ),
    theme: () => (
      <TextNodeCatcher widgetName="ThemeSwitcher">
        <ThemeSwitcher id="theme" title="THEME" />
      </TextNodeCatcher>
    ),
  };

  useEffect(() => {
    console.log('[App] useEffect for connection initialization triggered');
    
    // Initialize connection service with auto-connect
    const initializeConnectionService = async () => {
      console.log('[App] Starting auto-connection initialization...');
      
      try {
        await initializeConnection();
        console.log('[App] Connection service initialized successfully');
        
        // Update local state with current connection options
        const currentConfig = getCurrentConnectionConfig();
        if (currentConfig) {
          console.log('[App] Using connection config:', currentConfig);
          setIp(currentConfig.ip);
          setPort(currentConfig.port.toString());
          setProtocol(currentConfig.protocol);
        }

        // Show success toast to indicate auto-connection attempt
        showSuccessToast('Auto-connecting to NMEA Bridge...');
        
      } catch (error) {
        console.error('[App] Failed to initialize connection:', error);
        showErrorToast('Failed to auto-connect to NMEA Bridge');
      }
    };

    console.log('[App] Setting up initialization timer...');
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      console.log('[App] Timer fired, calling initializeConnectionService...');
      initializeConnectionService();
    }, 1000);

    return () => {
      console.log('[App] Cleaning up connection initialization timer');
      clearTimeout(timer);
    };
  }, []);

  const saveConfig = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ip, port, protocol }));
    // TODO: Trigger connection manager to reconnect with new config
  };

  const handleConnectionConnect = async (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => {
    setIp(config.ip);
    setPort(config.port.toString());
    setProtocol(config.protocol as 'tcp' | 'udp');
    
    try {
      // Use the new connection utility
      const success = await connectNmea({
        ip: config.ip,
        port: config.port,
        protocol: config.protocol as 'tcp' | 'udp' | 'websocket'
      });
      
      if (success) {
        showSuccessToast(`Connected to ${config.ip}:${config.port} (${config.protocol.toUpperCase()})`);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      showErrorToast('Failed to establish connection');
    }
  };

  // Check if connect button should be enabled (config different from current)
  const isConnectButtonEnabled = (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => {
    return shouldEnableConnectButton(config);
  };

  const handleConnectionDisconnect = async () => {
    try {
      // Disconnect using utility function
      disconnectNmea();
      
      showSuccessToast('Disconnected from NMEA source');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      showErrorToast('Failed to disconnect');
    }
  };

  const layoutWidgets: LayoutWidget[] = selectedWidgets.map(key => ({ key, render: widgetMap[key] }));

  // Professional Marine Button Component
  const MarineButton: React.FC<{
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
  }> = ({ title, onPress, variant = 'primary', size = 'medium', disabled = false }) => {
    const buttonStyles = [
      styles.marineButton,
      variant === 'primary' && styles.marineButtonPrimary,
      variant === 'secondary' && styles.marineButtonSecondary,
      variant === 'danger' && styles.marineButtonDanger,
      size === 'small' && styles.marineButtonSmall,
      size === 'large' && styles.marineButtonLarge,
      disabled && styles.marineButtonDisabled,
    ];

    const textStyles = [
      styles.marineButtonText,
      variant === 'primary' && styles.marineButtonTextPrimary,
      variant === 'secondary' && styles.marineButtonTextSecondary,
      variant === 'danger' && styles.marineButtonTextDanger,
      disabled && styles.marineButtonTextDisabled,
    ];

    return (
      <TouchableOpacity
        style={buttonStyles}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={textStyles}>{title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.appBackground }]}>
      {/* Professional Header with Navigation */}
      <HeaderBar
        onShowConnectionSettings={() => setShowConnectionDialog(true)}
        toastMessage={toastMessage}
        navigationSession={navigationSession}
        onToggleNavigationSession={toggleNavigationSession}
        onStartPlayback={handleStartPlayback}
        onStopPlayback={handleStopPlayback}
        onStartStressTest={handleStartStressTest}
        onStopStressTest={handleStopStressTest}
      />

      {/* Toast Message Overlay */}
      <ToastMessage
        toast={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />


      {/* Error Banner */}
      {lastError && (
        <View style={styles.errorBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="warning-outline" size={16} color={theme.warning} style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{lastError}</Text>
          </View>
        </View>
      )}

      {/* Main Content Area - Takes remaining space */}
      <View style={styles.contentArea}>
        {/* Main Instrument Dashboard - Responsive Flow */}
        <View style={[styles.instrumentPanel, { backgroundColor: theme.appBackground }]}>
          <WidgetSelector
            selected={selectedWidgets}
            onChange={setSelectedWidgets}
            visible={showWidgetSelector}
            onClose={() => setShowWidgetSelector(false)}
          />

          {/* Widgets Flow Layout - Auto-sizing */}
          <View style={styles.widgetsFlow}>
            {selectedWidgets.map(key => {
              const WidgetComponent = widgetMap[key];
              if (!WidgetComponent) return <React.Fragment key={key} />;
              return (
                <View key={key} style={styles.widgetWrapper}>
                  {WidgetComponent()}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Fixed Autopilot Footer */}
      <AutopilotFooter
        onOpenAutopilotControl={() => setShowAutopilotControl(true)}
      />
      
      {/* Autopilot Control Screen Modal */}
      <AutopilotControlScreen
        visible={showAutopilotControl}
        onClose={() => setShowAutopilotControl(false)}
      />

      {/* Connection Configuration Dialog */}
      <ConnectionConfigDialog
        visible={showConnectionDialog}
        onClose={() => setShowConnectionDialog(false)}
        onConnect={handleConnectionConnect}
        onDisconnect={handleConnectionDisconnect}
        currentConfig={{ 
          ip, 
          port: parseInt(port, 10), 
          protocol: protocol as 'tcp' | 'udp' | 'websocket'
        }}
        shouldEnableConnectButton={isConnectButtonEnabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    marginBottom: 88, // Account for fixed autopilot footer height
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1a2332',
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
    elevation: 3,
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 2 }, 4, 0.1),
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    elevation: 2,
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 1 }, 2, 0.3),
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    flex: 1,
  },
  configContainer: {
    backgroundColor: '#1a2332',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 2 }, 8, 0.15),
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f7fafc',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2d3748',
    borderWidth: 1,
    borderColor: '#4a5568',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    color: '#e2e8f0',
  },
  controlsContainer: {
    marginBottom: 20,
  },
  dataContainer: {
    backgroundColor: '#1a2332',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    maxHeight: 200,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0aec0',
    marginBottom: 8,
  },
  dataText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontFamily: 'monospace',
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f7fafc',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#dc2626',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  errorText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a2332',
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  widgetsContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0f1419',
  },
  addInstrumentFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
    backgroundColor: '#1a2332',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
  },
  // Marine Button Styles
  marineButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 4,
  },
  marineButtonPrimary: {
    backgroundColor: '#3182ce',
  },
  marineButtonSecondary: {
    backgroundColor: '#4a5568',
  },
  marineButtonDanger: {
    backgroundColor: '#e53e3e',
  },
  marineButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  marineButtonLarge: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 52,
  },
  marineButtonDisabled: {
    backgroundColor: '#718096',
    opacity: 0.6,
  },
  marineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  marineButtonTextPrimary: {
    color: '#ffffff',
  },
  marineButtonTextSecondary: {
    color: '#e2e8f0',
  },
  marineButtonTextDanger: {
    color: '#ffffff',
  },
  marineButtonTextDisabled: {
    color: '#a0aec0',
  },
  // Connection Settings Panel
  settingsPanel: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  configInput: {
    flex: 1,
    backgroundColor: '#334155',
    color: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  portInput: {
    flex: 0.3,
  },
  connectButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  connectButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  devControls: {
    marginTop: 8,
  },
  devButtonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  devButton: {
    backgroundColor: '#64748b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  devButtonActive: {
    backgroundColor: '#16a34a',
  },
  devButtonDanger: {
    backgroundColor: '#dc2626',
  },
  devButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  instrumentPanel: {
    flex: 1,
    overflow: 'scroll', // Allow scrolling if widgets exceed viewport
  },
  widgetsFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    justifyContent: 'flex-start',
    padding: 8,
    minHeight: '100%', // Ensure widgets fill available height
  },
  widgetWrapper: {
    // Responsive width - allow widgets to size based on content
    // but constrain to reasonable bounds for mobile/desktop
    minWidth: 180,    // Smaller minimum for better fit
    maxWidth: 450,    // Larger maximum to accommodate content
    flexShrink: 1,    // Allow shrinking when space is tight
    flexGrow: 1,      // Allow growing to fill available space
    flexBasis: 'auto', // Auto-size based on content
    margin: 4,        // Space between widgets
  },
  autopilotAccess: {
    backgroundColor: '#1e40af',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 18,
    borderRadius: 0, // No rounded corners
    flexDirection: 'row',
    justifyContent: 'center', // Center the text
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
  },
  autopilotAccessText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center', // Center text
  },
  autopilotArrow: {
    display: 'none', // Remove arrow
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: '#0ea5e9',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navButtonIcon: {
    fontSize: 20,
    color: '#0ea5e9',
    marginBottom: 4,
  },
  navButtonText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  navDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
});

export default App;
