import { useMemo } from 'react';
import { useNmeaStore } from '../store/nmeaStore';
import { AutopilotStatus, AutopilotMode } from '../types/autopilot.types';

export interface AutopilotState {
  status: AutopilotStatus;
  mode: AutopilotMode;
  targetHeading?: number;
  actualHeading?: number;
  rudderPosition?: number;
  isActive: boolean;
  isConnected: boolean;
  commandStatus?: 'sending' | 'success' | 'error' | 'timeout';
  commandMessage?: string;
}

export const useAutopilotStatus = (): AutopilotState => {
  // Use specific selectors to prevent unnecessary re-renders
  const nmeaData = useNmeaStore((state) => state.nmeaData);
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);

  return useMemo(() => {
    const autopilot = nmeaData?.autopilot;
    const isConnected = connectionStatus === 'connected';

    // Determine autopilot status based on data availability and connection
    let status: AutopilotStatus = 'off';
    if (!isConnected) {
      status = 'off';
    } else if (autopilot?.active) {
      status = 'engaged';
    } else if (autopilot?.mode && autopilot.mode !== 'off') {
      status = 'standby';
    }

    // Handle error conditions
    if (autopilot?.commandStatus === 'error' || autopilot?.commandStatus === 'timeout') {
      status = 'error';
    }

    return {
      status,
      mode: (autopilot?.mode as AutopilotMode) || 'standby',
      targetHeading: autopilot?.targetHeading,
      actualHeading: autopilot?.actualHeading || nmeaData?.heading,
      rudderPosition: autopilot?.rudderPosition,
      isActive: autopilot?.active || false,
      isConnected,
      commandStatus: autopilot?.commandStatus,
      commandMessage: autopilot?.commandMessage,
    };
  }, [nmeaData, connectionStatus]);
};

export default useAutopilotStatus;
