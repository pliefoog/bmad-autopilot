import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNmeaStore } from '../core/nmeaStore';
import { PlaybackService } from '../services/playbackService';
import { StressTestService } from '../services/stressTestService';
import { DepthWidget } from '../widgets/DepthWidget';
import { SpeedWidget } from '../widgets/SpeedWidget';
import { WindWidget } from '../widgets/WindWidget';
import { GPSWidget } from '../widgets/GPSWidget';
import { CompassWidget } from '../widgets/CompassWidget';
import { EngineWidget } from '../widgets/EngineWidget';
import { BatteryWidget } from '../widgets/BatteryWidget';
import { TanksWidget } from '../widgets/TanksWidget';
import { AutopilotStatusWidget } from '../widgets/AutopilotStatusWidget';
import { AutopilotControlScreen } from '../widgets/AutopilotControlScreen';
import { WidgetSelector } from '../widgets/WidgetSelector';
import { AlarmBanner } from '../widgets/AlarmBanner';
import { LayoutManager, LayoutWidget } from '../widgets/LayoutManager';
import { PlaybackFilePicker } from '../widgets/PlaybackFilePicker';

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

const App = () => {
  const { connectionStatus, nmeaData, alarms, lastError } = useNmeaStore();
  const [ip, setIp] = useState('192.168.0.10');
  const [port, setPort] = useState('2000');
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([
    'depth', 'speed', 'wind', 'gps', 'compass', 'engine', 'battery', 'tanks', 'autopilot'
  ]);
  const [playbackFile, setPlaybackFile] = useState<string>('demo.nmea');
  const [showAutopilotControl, setShowAutopilotControl] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const playbackService = new PlaybackService();
  const stressTestService = new StressTestService();

  const widgetMap: { [key: string]: () => React.ReactNode } = {
    depth: () => <DepthWidget />,
    speed: () => <SpeedWidget />,
    wind: () => <WindWidget />,
    gps: () => <GPSWidget />,
    compass: () => <CompassWidget />,
    engine: () => <EngineWidget />,
    battery: () => <BatteryWidget />,
    tanks: () => <TanksWidget />,
    autopilot: () => <AutopilotStatusWidget showControls={true} />,
  };

  useEffect(() => {
    // Load saved config
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        const cfg = JSON.parse(val);
        setIp(cfg.ip || ip);
        setPort(cfg.port || port);
        setProtocol(cfg.protocol || protocol);
      }
    });
  }, [ip, port, protocol]);

  const saveConfig = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ip, port, protocol }));
    // TODO: Trigger connection manager to reconnect with new config
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
    <View style={styles.container}>
      {/* Minimal Status Header - Raymarine Style */}
      <View style={styles.statusHeader}>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(connectionStatus) }]} />
          <Text style={styles.statusText}>{connectionStatus.toUpperCase()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(!showSettings)}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Collapsible Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.configRow}>
            <TextInput
              style={styles.configInput}
              value={ip}
              onChangeText={setIp}
              placeholder="192.168.1.10"
              placeholderTextColor="#7a8a99"
            />
            <TextInput
              style={[styles.configInput, styles.portInput]}
              value={port}
              onChangeText={setPort}
              placeholder="2000"
              placeholderTextColor="#7a8a99"
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.connectButton} onPress={saveConfig}>
              <Text style={styles.connectButtonText}>CONNECT</Text>
            </TouchableOpacity>
          </View>
          
          {/* Dev Controls - Minimized */}
          <View style={styles.devControls}>
            <PlaybackFilePicker onPick={(file) => setPlaybackFile(file)} />
            <View style={styles.devButtonRow}>
              <TouchableOpacity 
                style={[styles.devButton, playbackService.isPlaybackActive() && styles.devButtonActive]}
                onPress={() => {
                  if (playbackService.isPlaybackActive()) {
                    playbackService.stopPlayback();
                  } else {
                    playbackService.startPlayback(playbackFile);
                  }
                }}
              >
                <Text style={styles.devButtonText}>
                  {playbackService.isPlaybackActive() ? 'STOP' : 'DEMO'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.devButton, stressTestService.isStressTestActive() && styles.devButtonDanger]}
                onPress={() => {
                  if (stressTestService.isStressTestActive()) {
                    stressTestService.stop();
                  } else {
                    stressTestService.start(500);
                  }
                }}
              >
                <Text style={styles.devButtonText}>
                  {stressTestService.isStressTestActive() ? 'STOP' : 'STRESS'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Error Banner */}
      {lastError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {lastError}</Text>
        </View>
      )}

      {/* Main Instrument Dashboard - Responsive Flow */}
      <View style={styles.instrumentPanel}>
        <WidgetSelector 
          selected={selectedWidgets} 
          onChange={setSelectedWidgets} 
          visible={showWidgetSelector}
          onClose={() => setShowWidgetSelector(false)}
        />
        
        {/* Widgets Flow Layout - Auto-sizing */}
        <View style={styles.widgetsFlow}>
          {selectedWidgets.map(key => (
            <View key={key} style={styles.widgetWrapper}>
              {widgetMap[key] && widgetMap[key]()}
            </View>
          ))}
        </View>

        {/* Autopilot Control Access */}
        {selectedWidgets.includes('autopilot') && (
          <TouchableOpacity 
            style={styles.autopilotAccess}
            onPress={() => setShowAutopilotControl(true)}
          >
            <Text style={styles.autopilotAccessText}>AUTOPILOT CONTROL</Text>
            <Text style={styles.autopilotArrow}>▶</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Navigation - Marine Style */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => setShowWidgetSelector(true)}
        >
          <Text style={styles.navButtonIcon}>+</Text>
          <Text style={styles.navButtonText}>ADD</Text>
        </TouchableOpacity>
        
        <View style={styles.navDivider} />
        
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonIcon}>◐</Text>
          <Text style={styles.navButtonText}>DAY</Text>
        </TouchableOpacity>
        
        <View style={styles.navDivider} />
        
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonIcon}>🔔</Text>
          <Text style={styles.navButtonText}>ALARMS</Text>
        </TouchableOpacity>
      </View>
      
      {/* Autopilot Control Screen Modal */}
      {showAutopilotControl && (
        <View style={styles.modalContainer}>
          <AutopilotControlScreen onClose={() => setShowAutopilotControl(false)} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
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
  // Raymarine-Inspired Professional Marine UI Styles
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 2,
    borderBottomColor: '#0ea5e9',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  settingsIcon: {
    fontSize: 20,
    color: '#e2e8f0',
  },
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
    backgroundColor: '#ffffff', // White background for day theme
    padding: 8,
  },
  widgetsFlow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    justifyContent: 'flex-start',
  },
  widgetWrapper: {
    // No fixed size - let widgets size themselves
  },
  autopilotAccess: {
    backgroundColor: '#1e40af',
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autopilotAccessText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  autopilotArrow: {
    color: '#ffffff',
    fontSize: 18,
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
