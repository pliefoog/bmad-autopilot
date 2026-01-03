/**
 * Autopilot Commands Service
 * Handles generation and management of autopilot control commands
 */

import { AutopilotCommand, AutopilotState, NMEAError } from './types';

export interface AutopilotCommandService {
  sendHeadingCommand(heading: number, confirmation?: boolean): Promise<void>;
  sendSpeedCommand(speed: number, confirmation?: boolean): Promise<void>;
  setMode(mode: string): Promise<void>;
  engageAutopilot(): Promise<void>;
  disengageAutopilot(): Promise<void>;
  getState(): AutopilotState;
  validateCommand(command: AutopilotCommand): boolean;
}

class AutopilotCommandServiceImpl implements AutopilotCommandService {
  private static instance: AutopilotCommandServiceImpl;
  private currentState: AutopilotState;
  private commandQueue: AutopilotCommand[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): AutopilotCommandServiceImpl {
    if (!AutopilotCommandServiceImpl.instance) {
      AutopilotCommandServiceImpl.instance = new AutopilotCommandServiceImpl();
    }
    return AutopilotCommandServiceImpl.instance;
  }

  constructor() {
    this.currentState = {
      engaged: false,
      mode: 'standby',
      lastUpdate: Date.now(),
    };
  }

  async sendHeadingCommand(heading: number, confirmation: boolean = true): Promise<void> {
    try {
      // Validate heading range
      if (heading < 0 || heading > 360) {
        throw new Error(`Invalid heading: ${heading}. Must be between 0 and 360 degrees.`);
      }

      const command: AutopilotCommand = {
        type: 'heading',
        value: heading,
        timestamp: Date.now(),
        priority: 'normal',
        confirmation,
      };

      if (!this.validateCommand(command)) {
        throw new Error('Heading command validation failed');
      }

      // Add to command queue
      this.commandQueue.push(command);

      // Generate NMEA sentence for heading command
      const nmeaSentence = this.generateHeadingNMEA(heading);

      // Emit command event
      this.emit('command', { command, nmea: nmeaSentence });

      // Update state
      this.currentState.targetHeading = heading;
      this.currentState.lastUpdate = Date.now();
    } catch (error) {
      console.error('Failed to send heading command:', error);
      throw new Error(`Heading command failed: ${error}`);
    }
  }

  async sendSpeedCommand(speed: number, confirmation: boolean = true): Promise<void> {
    try {
      // Validate speed range (assuming knots)
      if (speed < 0 || speed > 50) {
        throw new Error(`Invalid speed: ${speed}. Must be between 0 and 50 knots.`);
      }

      const command: AutopilotCommand = {
        type: 'speed',
        value: speed,
        timestamp: Date.now(),
        priority: 'normal',
        confirmation,
      };

      if (!this.validateCommand(command)) {
        throw new Error('Speed command validation failed');
      }

      // Add to command queue
      this.commandQueue.push(command);

      // Generate NMEA sentence for speed command
      const nmeaSentence = this.generateSpeedNMEA(speed);

      // Emit command event
      this.emit('command', { command, nmea: nmeaSentence });

      // Update state
      this.currentState.targetSpeed = speed;
      this.currentState.lastUpdate = Date.now();
    } catch (error) {
      console.error('Failed to send speed command:', error);
      throw new Error(`Speed command failed: ${error}`);
    }
  }

  async setMode(mode: string): Promise<void> {
    try {
      const validModes = [
        'STANDBY',
        'AUTO',
        'WIND',
        'NAV',
        'TRACK',
        'standby',
        'auto',
        'wind',
        'nav',
        'track',
      ];
      if (!validModes.includes(mode)) {
        throw new Error(`Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
      }

      const command: AutopilotCommand = {
        type: 'mode',
        value: mode,
        timestamp: Date.now(),
        priority: 'high',
        confirmation: true,
      };

      if (!this.validateCommand(command)) {
        throw new Error('Mode command validation failed');
      }

      // Add to command queue
      this.commandQueue.push(command);

      // Generate NMEA sentence for mode command
      const nmeaSentence = this.generateModeNMEA(mode);

      // Emit command event
      this.emit('command', { command, nmea: nmeaSentence });

      // Update state
      this.currentState.mode = mode as any;
      this.currentState.lastUpdate = Date.now();
    } catch (error) {
      console.error('Failed to set mode:', error);
      throw new Error(`Mode set failed: ${error}`);
    }
  }

  async engageAutopilot(): Promise<void> {
    try {
      if (this.currentState.engaged) {
        console.warn('Autopilot already engaged');
        return;
      }

      const command: AutopilotCommand = {
        type: 'mode',
        value: 'auto',
        timestamp: Date.now(),
        priority: 'high',
        confirmation: true,
      };

      // Add to command queue
      this.commandQueue.push(command);

      // Generate engagement NMEA sentence
      const nmeaSentence = this.generateEngagementNMEA(true);

      // Emit command event
      this.emit('command', { command, nmea: nmeaSentence });

      // Update state
      this.currentState.engaged = true;
      this.currentState.mode = 'auto';
      this.currentState.lastUpdate = Date.now();
    } catch (error) {
      console.error('Failed to engage autopilot:', error);
      throw new Error(`Autopilot engagement failed: ${error}`);
    }
  }

  async disengageAutopilot(): Promise<void> {
    try {
      if (!this.currentState.engaged) {
        console.warn('Autopilot already disengaged');
        return;
      }

      const command: AutopilotCommand = {
        type: 'mode',
        value: 'standby',
        timestamp: Date.now(),
        priority: 'emergency',
        confirmation: false, // Emergency disengagement doesn't require confirmation
      };

      // Add to command queue
      this.commandQueue.push(command);

      // Generate disengagement NMEA sentence
      const nmeaSentence = this.generateEngagementNMEA(false);

      // Emit command event
      this.emit('command', { command, nmea: nmeaSentence });

      // Update state
      this.currentState.engaged = false;
      this.currentState.mode = 'standby';
      this.currentState.targetHeading = undefined;
      this.currentState.targetSpeed = undefined;
      this.currentState.lastUpdate = Date.now();
    } catch (error) {
      console.error('Failed to disengage autopilot:', error);
      throw new Error(`Autopilot disengagement failed: ${error}`);
    }
  }

  getState(): AutopilotState {
    return { ...this.currentState };
  }

  validateCommand(command: AutopilotCommand): boolean {
    try {
      // Basic validation
      if (!command.type || command.value === undefined) {
        return false;
      }

      // Type-specific validation
      switch (command.type) {
        case 'heading':
          return typeof command.value === 'number' && command.value >= 0 && command.value <= 360;
        case 'speed':
          return typeof command.value === 'number' && command.value >= 0 && command.value <= 50;
        case 'mode':
          return ['standby', 'auto', 'wind', 'nav', 'track'].includes(command.value as string);
        case 'wind':
          return typeof command.value === 'number' && command.value >= 0 && command.value <= 360;
        default:
          return false;
      }
    } catch (error) {
      console.error('Command validation error:', error);
      return false;
    }
  }

  // NMEA sentence generation helpers
  private generateHeadingNMEA(heading: number): string {
    // APB - Autopilot Sentence "B"
    const checksum = this.calculateChecksum(
      `APAPB,A,A,0.00,R,N,V,V,${heading.toFixed(1)},M,DEST,${heading.toFixed(
        1,
      )},M,${heading.toFixed(1)},M`,
    );
    return `$APAPB,A,A,0.00,R,N,V,V,${heading.toFixed(1)},M,DEST,${heading.toFixed(
      1,
    )},M,${heading.toFixed(1)},M*${checksum}`;
  }

  private generateSpeedNMEA(speed: number): string {
    // VTG - Track made good and Ground speed
    const checksum = this.calculateChecksum(
      `APVTG,0.0,T,0.0,M,${speed.toFixed(1)},N,${(speed * 1.852).toFixed(1)},K,A`,
    );
    return `$APVTG,0.0,T,0.0,M,${speed.toFixed(1)},N,${(speed * 1.852).toFixed(1)},K,A*${checksum}`;
  }

  private generateModeNMEA(mode: string): string {
    // Custom autopilot mode sentence
    const checksum = this.calculateChecksum(`APMOD,${mode.toUpperCase()}`);
    return `$APMOD,${mode.toUpperCase()}*${checksum}`;
  }

  private generateEngagementNMEA(engaged: boolean): string {
    // Custom autopilot engagement sentence
    const state = engaged ? 'ENG' : 'DIS';
    const checksum = this.calculateChecksum(`APENG,${state}`);
    return `$APENG,${state}*${checksum}`;
  }

  private calculateChecksum(sentence: string): string {
    let checksum = 0;
    for (let i = 0; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }

  // Event handling
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  addEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }
}

// Export singleton instance
export const autopilotCommandService = AutopilotCommandServiceImpl.getInstance();
