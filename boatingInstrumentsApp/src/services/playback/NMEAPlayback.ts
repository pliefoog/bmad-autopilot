/**
 * Enhanced NMEA Playback Service
 * File-based playback mode with enhanced control capabilities
 */

import { sampleDataService, SampleDataSequence, DemoScenario } from './sampleData';

export interface PlaybackOptions {
  speed?: number; // Playback speed multiplier (0.1 - 10.0)
  loop?: boolean; // Loop playback when reaching end
  startIndex?: number; // Start from specific sentence index
  maxMessages?: number; // Maximum number of messages to play
}

export interface PlaybackStatus {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalSentences: number;
  elapsedTime: number; // milliseconds
  remainingTime: number; // milliseconds
  playbackSpeed: number;
  looping: boolean;
}

export interface PlaybackFile {
  name: string;
  path: string;
  size: number;
  sentences: number;
  duration: number; // estimated seconds
  lastModified: Date;
}

export interface PlaybackService {
  loadFile(filename: string): Promise<void>;
  loadSequence(sequence: SampleDataSequence): void;
  loadScenario(scenario: DemoScenario): void;
  startPlayback(options?: PlaybackOptions): void;
  pausePlayback(): void;
  resumePlayback(): void;
  stopPlayback(): void;
  seekTo(index: number): void;
  setSpeed(speed: number): void;
  getStatus(): PlaybackStatus;
  getAvailableFiles(): Promise<PlaybackFile[]>;
  getAvailableSequences(): SampleDataSequence[];
  getAvailableScenarios(): DemoScenario[];
}

class NMEAPlaybackServiceImpl implements PlaybackService {
  private static instance: NMEAPlaybackServiceImpl;
  private sentences: string[] = [];
  private currentIndex: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private playbackSpeed: number = 1.0;
  private looping: boolean = false;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private baseInterval: number = 1000; // 1 second default
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): NMEAPlaybackServiceImpl {
    if (!NMEAPlaybackServiceImpl.instance) {
      NMEAPlaybackServiceImpl.instance = new NMEAPlaybackServiceImpl();
    }
    return NMEAPlaybackServiceImpl.instance;
  }

  async loadFile(filename: string): Promise<void> {
    try {
      // In React Native, we'll need to handle file loading differently
      // For now, simulate loading from bundled assets or server
      console.log(`Loading NMEA file: ${filename}`);
      
      // Placeholder implementation - in real app would load from filesystem
      // or fetch from server/assets
      if (filename.includes('sample')) {
        // Load sample data instead
        const sequence = sampleDataService.getBasicNavigationDemo();
        this.loadSequence(sequence);
        return;
      }
      
      throw new Error(`File loading not yet implemented for: ${filename}`);
    } catch (error) {
      console.error('Failed to load file:', error);
      throw new Error(`File load failed: ${error}`);
    }
  }

  loadSequence(sequence: SampleDataSequence): void {
    try {
      this.stopPlayback();
      this.sentences = [...sequence.sentences];
      this.currentIndex = 0;
      this.baseInterval = sequence.interval;
      
      console.log(`Loaded sequence "${sequence.name}" with ${this.sentences.length} sentences`);
      this.emit('loaded', { sequence, sentenceCount: this.sentences.length });
    } catch (error) {
      console.error('Failed to load sequence:', error);
      throw new Error(`Sequence load failed: ${error}`);
    }
  }

  loadScenario(scenario: DemoScenario): void {
    try {
      this.stopPlayback();
      
      // Combine all sequences in the scenario
      this.sentences = [];
      scenario.sequences.forEach(sequence => {
        this.sentences.push(...sequence.sentences);
      });
      
      this.currentIndex = 0;
      this.baseInterval = 1000; // Default interval for scenarios
      
      console.log(`Loaded scenario "${scenario.name}" with ${this.sentences.length} sentences`);
      this.emit('loaded', { scenario, sentenceCount: this.sentences.length });
    } catch (error) {
      console.error('Failed to load scenario:', error);
      throw new Error(`Scenario load failed: ${error}`);
    }
  }

  startPlayback(options: PlaybackOptions = {}): void {
    try {
      if (this.sentences.length === 0) {
        throw new Error('No data loaded for playback');
      }

      // Apply options
      this.playbackSpeed = options.speed || 1.0;
      this.looping = options.loop || false;
      this.currentIndex = options.startIndex || 0;

      // Validate speed
      if (this.playbackSpeed < 0.1 || this.playbackSpeed > 10.0) {
        throw new Error('Playback speed must be between 0.1 and 10.0');
      }

      this.isPlaying = true;
      this.isPaused = false;
      this.startTime = Date.now() - this.pausedTime;
      
      this.startTimer();
      
      console.log(`Started playback at ${this.playbackSpeed}x speed, index ${this.currentIndex}`);
      this.emit('started', this.getStatus());
    } catch (error) {
      console.error('Failed to start playback:', error);
      throw new Error(`Playback start failed: ${error}`);
    }
  }

  pausePlayback(): void {
    if (!this.isPlaying || this.isPaused) {
      console.warn('Playback is not active or already paused');
      return;
    }

    this.isPaused = true;
    this.pausedTime = Date.now() - this.startTime;
    this.stopTimer();
    
    console.log('Playback paused');
    this.emit('paused', this.getStatus());
  }

  resumePlayback(): void {
    if (!this.isPlaying || !this.isPaused) {
      console.warn('Playback is not paused');
      return;
    }

    this.isPaused = false;
    this.startTime = Date.now() - this.pausedTime;
    this.startTimer();
    
    console.log('Playback resumed');
    this.emit('resumed', this.getStatus());
  }

  stopPlayback(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.pausedTime = 0;
    this.stopTimer();
    
    console.log('Playback stopped');
    this.emit('stopped', this.getStatus());
  }

  seekTo(index: number): void {
    if (index < 0 || index >= this.sentences.length) {
      throw new Error(`Invalid seek index: ${index}. Must be between 0 and ${this.sentences.length - 1}`);
    }

    this.currentIndex = index;
    console.log(`Seeked to index ${index}`);
    this.emit('seeked', this.getStatus());
  }

  setSpeed(speed: number): void {
    if (speed < 0.1 || speed > 10.0) {
      throw new Error('Playback speed must be between 0.1 and 10.0');
    }

    this.playbackSpeed = speed;
    
    // Restart timer with new speed if playing
    if (this.isPlaying && !this.isPaused) {
      this.stopTimer();
      this.startTimer();
    }
    
    console.log(`Playback speed set to ${speed}x`);
    this.emit('speedChanged', { speed, status: this.getStatus() });
  }

  getStatus(): PlaybackStatus {
    const elapsedTime = this.isPlaying ? Date.now() - this.startTime : this.pausedTime;
    const remainingMessages = this.sentences.length - this.currentIndex;
    const estimatedRemainingTime = (remainingMessages * this.baseInterval) / this.playbackSpeed;

    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalSentences: this.sentences.length,
      elapsedTime,
      remainingTime: estimatedRemainingTime,
      playbackSpeed: this.playbackSpeed,
      looping: this.looping,
    };
  }

  async getAvailableFiles(): Promise<PlaybackFile[]> {
    // Placeholder implementation - in real app would scan filesystem
    // or fetch from server
    return [
      {
        name: 'sample_navigation.nmea',
        path: '/assets/nmea/sample_navigation.nmea',
        size: 2048,
        sentences: 100,
        duration: 100,
        lastModified: new Date(),
      },
      {
        name: 'recorded_session.nmea',
        path: '/assets/nmea/recorded_session.nmea',
        size: 10240,
        sentences: 500,
        duration: 500,
        lastModified: new Date(),
      },
    ];
  }

  getAvailableSequences(): SampleDataSequence[] {
    return sampleDataService.getAllSequences();
  }

  getAvailableScenarios(): DemoScenario[] {
    return sampleDataService.getAllScenarios();
  }

  // Private methods
  private startTimer(): void {
    const interval = this.baseInterval / this.playbackSpeed;
    
    this.timer = setInterval(() => {
      this.playNextSentence();
    }, interval);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private playNextSentence(): void {
    if (this.currentIndex >= this.sentences.length) {
      if (this.looping) {
        this.currentIndex = 0;
        console.log('Looping playback to beginning');
      } else {
        this.stopPlayback();
        this.emit('finished', this.getStatus());
        return;
      }
    }

    const sentence = this.sentences[this.currentIndex];
    this.currentIndex++;

    // Emit the NMEA sentence
    this.emit('sentence', { sentence, index: this.currentIndex - 1 });
    
    // Also emit progress update every 10 sentences
    if (this.currentIndex % 10 === 0) {
      this.emit('progress', this.getStatus());
    }
  }

  // Event handling
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
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
export const nmeaPlaybackService = NMEAPlaybackServiceImpl.getInstance();