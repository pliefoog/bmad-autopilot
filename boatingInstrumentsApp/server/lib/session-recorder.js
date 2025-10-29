#!/usr/bin/env node

/**
 * Session Recorder Component
 * 
 * Manages recording file loading, playback control, and session management.
 * Supports both JSON and binary recording formats with compression.
 * Handles global and per-client playback modes with configurable speed and looping.
 * 
 * Implements SimulatorComponent interface for lifecycle management.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { SimulatorComponent } = require('./types');

class SessionRecorder {
  constructor() {
    this.config = null;
    this.isRunning = false;
    this.startTime = null;
    
    // Recording data and playback state
    this.recordingData = null;
    this.playbackSpeed = 1.0;
    this.playbackLoop = false;
    this.playbackMode = 'global'; // 'global' or 'per-client'
    this.currentMessageIndex = 0;
    this.playbackStartTime = null;
    
    // Per-client playback tracking
    this.clientPlaybacks = new Map(); // clientId -> playback state
    
    // Callback handlers for message delivery
    this.messageBroadcastCallback = null;
    this.clientMessageCallback = null;
    
    // Performance stats
    this.stats = {
      messagesPlayed: 0,
      playbackErrors: 0,
      activePlaybacks: 0,
      recordingDuration: 0,
      totalRecordingMessages: 0
    };
  }

  /**
   * Start the session recorder
   * @param {SimulatorConfig} config - Recorder configuration
   */
  async start(config) {
    if (this.isRunning) {
      throw new Error('Session recorder is already running');
    }

    this.config = config;
    this.startTime = Date.now();
    this.isRunning = true;
    
    console.log('✅ Session Recorder started');
  }

  /**
   * Stop the session recorder
   */
  async stop() {
    console.log('🔌 Shutting down session recorder...');
    
    // Stop all active playbacks
    this.stopAllPlaybacks();
    
    // Clear recording data
    this.recordingData = null;
    this.currentMessageIndex = 0;
    this.playbackStartTime = null;
    
    this.isRunning = false;
    this.startTime = null;
    
    console.log('✅ Session Recorder stopped');
  }

  /**
   * Get recorder status
   * @returns {ComponentStatus}
   */
  getStatus() {
    return {
      running: this.isRunning,
      state: this.isRunning ? 'running' : 'stopped',
      error: null,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Get recorder metrics
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    return {
      messagesProcessed: this.stats.messagesPlayed,
      messagesPerSecond: this.calculatePlaybackRate(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      activeConnections: this.clientPlaybacks.size,
      customMetrics: {
        recordingLoaded: !!this.recordingData,
        recordingDuration: this.stats.recordingDuration,
        totalRecordingMessages: this.stats.totalRecordingMessages,
        playbackMode: this.playbackMode,
        playbackSpeed: this.playbackSpeed,
        playbackLoop: this.playbackLoop,
        playbackErrors: this.stats.playbackErrors,
        currentMessageIndex: this.currentMessageIndex
      }
    };
  }

  /**
   * Register message broadcast callback
   * @param {Function} callback - Function to call for broadcasting messages
   */
  setMessageBroadcaster(callback) {
    this.messageBroadcastCallback = callback;
  }

  /**
   * Register client message callback
   * @param {Function} callback - Function to call for sending messages to specific clients
   */
  setClientMessageCallback(callback) {
    this.clientMessageCallback = callback;
  }

  /**
   * Load recording file for playback
   * @param {string} recordingFile - Path to recording file
   * @param {number} speed - Playback speed multiplier (default: 1.0)
   * @param {boolean} loop - Whether to loop playback (default: false)
   * @param {string} playbackMode - Playback mode: 'global' or 'per-client' (default: 'global')
   */
  async loadRecording(recordingFile, speed = 1.0, loop = false, playbackMode = 'global') {
    try {
      // Handle both absolute and relative paths
      const recordingPath = path.isAbsolute(recordingFile) 
        ? recordingFile 
        : path.resolve(process.cwd(), recordingFile);
      
      console.log(`📼 Loading recording: ${recordingFile}`);
      
      // Check if file exists
      if (!fs.existsSync(recordingPath)) {
        throw new Error(`Recording file not found: ${recordingPath}`);
      }
      
      let fileData;
      if (recordingFile.endsWith('.gz')) {
        // Handle compressed files
        const compressed = fs.readFileSync(recordingPath);
        fileData = zlib.gunzipSync(compressed).toString();
      } else {
        // Handle uncompressed files
        fileData = fs.readFileSync(recordingPath, 'utf8');
      }
      
      // Parse JSON recording data
      this.recordingData = JSON.parse(fileData);
      this.playbackSpeed = Math.max(0.1, Math.min(10.0, speed)); // Clamp between 0.1x and 10x
      this.playbackLoop = loop;
      this.playbackMode = playbackMode;
      this.currentMessageIndex = 0;
      this.playbackStartTime = null;
      
      // Validate recording format
      if (!this.recordingData.messages || !Array.isArray(this.recordingData.messages)) {
        throw new Error('Invalid recording format: missing messages array');
      }
      
      // Update stats
      this.stats.totalRecordingMessages = this.recordingData.messages.length;
      this.stats.recordingDuration = this.recordingData.metadata?.duration || 0;
      
      console.log(`✅ Loaded ${this.recordingData.messages.length} messages from recording`);
      console.log(`📊 Duration: ${this.stats.recordingDuration.toFixed(1)}s, Speed: ${speed}x, Loop: ${loop}`);
      console.log(`🎭 Playback Mode: ${playbackMode.toUpperCase()}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to load recording: ${error.message}`);
      this.recordingData = null;
      this.stats.playbackErrors++;
      throw error;
    }
  }

  /**
   * Check if recording is loaded and ready for playback
   * @returns {boolean}
   */
  isRecordingLoaded() {
    return !!this.recordingData && this.recordingData.messages && this.recordingData.messages.length > 0;
  }

  /**
   * Start global recording playback
   * @returns {boolean} True if playback started successfully
   */
  startGlobalPlayback() {
    if (!this.isRecordingLoaded()) {
      console.error('❌ No recording data available for global playback');
      return false;
    }
    
    if (this.playbackMode !== 'global') {
      console.warn('⚠️ Playback mode is not set to global');
      return false;
    }
    
    this.playbackStartTime = Date.now();
    this.currentMessageIndex = 0;
    this.stats.activePlaybacks = 1;
    
    console.log(`🎬 Starting global recording playback (${this.recordingData.messages.length} messages)`);
    
    // Return the recording data and playback parameters for the scheduler
    return {
      messages: this.recordingData.messages,
      speed: this.playbackSpeed,
      loop: this.playbackLoop
    };
  }

  /**
   * Start per-client recording playback for a specific client
   * @param {string} clientId - Client identifier
   * @returns {boolean} True if client playback started successfully
   */
  startClientPlayback(clientId) {
    if (!this.isRecordingLoaded()) {
      console.error('❌ No recording data available for client playback');
      return false;
    }
    
    if (this.playbackMode !== 'per-client') {
      console.warn('⚠️ Playback mode is not set to per-client');
      return false;
    }
    
    // Stop existing playback for this client if any
    this.stopClientPlayback(clientId);
    
    const playbackState = {
      startTime: Date.now(),
      currentIndex: 0,
      active: true
    };
    
    this.clientPlaybacks.set(clientId, playbackState);
    this.stats.activePlaybacks = this.clientPlaybacks.size;
    
    console.log(`🎬 Starting per-client playback for ${clientId}`);
    
    // Return the recording data and playback parameters for the scheduler
    return {
      messages: this.recordingData.messages,
      speed: this.playbackSpeed,
      loop: this.playbackLoop,
      clientCallback: this.clientMessageCallback
    };
  }

  /**
   * Stop per-client playback for a specific client
   * @param {string} clientId - Client identifier
   */
  stopClientPlayback(clientId) {
    const playbackState = this.clientPlaybacks.get(clientId);
    if (playbackState) {
      playbackState.active = false;
      this.clientPlaybacks.delete(clientId);
      this.stats.activePlaybacks = this.clientPlaybacks.size;
      console.log(`🛑 Stopped playback for client ${clientId}`);
    }
  }

  /**
   * Stop all active playbacks
   */
  stopAllPlaybacks() {
    console.log('🛑 Stopping all active playbacks...');
    
    // Stop global playback
    if (this.playbackStartTime) {
      this.playbackStartTime = null;
      this.currentMessageIndex = 0;
    }
    
    // Stop all client playbacks
    for (const clientId of this.clientPlaybacks.keys()) {
      this.stopClientPlayback(clientId);
    }
    
    this.stats.activePlaybacks = 0;
    console.log('✅ All playbacks stopped');
  }

  /**
   * Get current playback progress as percentage
   * @returns {number} Progress percentage (0-100)
   */
  getPlaybackProgress() {
    if (!this.isRecordingLoaded()) {
      return 0;
    }
    
    return Math.round((this.currentMessageIndex / this.recordingData.messages.length) * 100);
  }

  /**
   * Get playback time information
   * @returns {Object} Playback time details
   */
  getPlaybackTime() {
    if (!this.playbackStartTime || !this.isRecordingLoaded()) {
      return {
        elapsed: 0,
        remaining: 0,
        total: this.stats.recordingDuration,
        progress: 0
      };
    }
    
    const elapsed = (Date.now() - this.playbackStartTime) / 1000; // seconds
    const adjustedElapsed = elapsed * this.playbackSpeed;
    const remaining = Math.max(0, this.stats.recordingDuration - adjustedElapsed);
    const progress = this.stats.recordingDuration > 0 
      ? Math.min(100, (adjustedElapsed / this.stats.recordingDuration) * 100)
      : 0;
    
    return {
      elapsed: adjustedElapsed,
      remaining,
      total: this.stats.recordingDuration,
      progress
    };
  }

  /**
   * Set playback speed
   * @param {number} speed - Speed multiplier (0.1 to 10.0)
   */
  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(10.0, speed));
    console.log(`⚡ Playback speed set to ${this.playbackSpeed}x`);
  }

  /**
   * Set playback loop mode
   * @param {boolean} loop - Whether to loop playback
   */
  setPlaybackLoop(loop) {
    this.playbackLoop = loop;
    console.log(`🔄 Playback loop ${loop ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set playback mode
   * @param {string} mode - Playback mode: 'global' or 'per-client'
   */
  setPlaybackMode(mode) {
    if (mode !== 'global' && mode !== 'per-client') {
      throw new Error('Invalid playback mode. Must be "global" or "per-client"');
    }
    
    // Stop all current playbacks when changing mode
    this.stopAllPlaybacks();
    
    this.playbackMode = mode;
    console.log(`🎭 Playback mode set to ${mode.toUpperCase()}`);
  }

  /**
   * Get recording metadata
   * @returns {Object|null} Recording metadata or null if no recording loaded
   */
  getRecordingMetadata() {
    if (!this.recordingData) {
      return null;
    }
    
    return {
      ...this.recordingData.metadata,
      messageCount: this.recordingData.messages.length,
      playbackSpeed: this.playbackSpeed,
      playbackLoop: this.playbackLoop,
      playbackMode: this.playbackMode
    };
  }

  /**
   * Validate recording format
   * @param {string} recordingPath - Path to recording file to validate
   * @returns {Object} Validation result with status and details
   */
  async validateRecording(recordingPath) {
    try {
      const fileData = fs.readFileSync(recordingPath, 'utf8');
      const recordingData = JSON.parse(fileData);
      
      const issues = [];
      
      // Check required fields
      if (!recordingData.messages) {
        issues.push('Missing messages array');
      } else if (!Array.isArray(recordingData.messages)) {
        issues.push('Messages is not an array');
      } else if (recordingData.messages.length === 0) {
        issues.push('Messages array is empty');
      }
      
      // Check message format
      if (recordingData.messages && recordingData.messages.length > 0) {
        const sampleMessage = recordingData.messages[0];
        if (!sampleMessage.relative_time && sampleMessage.relative_time !== 0) {
          issues.push('Messages missing relative_time field');
        }
        
        const messageFields = ['message', 'sentence', 'data', 'raw'];
        if (!messageFields.some(field => sampleMessage[field])) {
          issues.push('Messages missing NMEA data field (message/sentence/data/raw)');
        }
      }
      
      // Check metadata
      if (!recordingData.metadata) {
        issues.push('Missing metadata section');
      }
      
      return {
        valid: issues.length === 0,
        issues,
        messageCount: recordingData.messages?.length || 0,
        duration: recordingData.metadata?.duration || 0,
        metadata: recordingData.metadata || {}
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Failed to parse recording: ${error.message}`],
        messageCount: 0,
        duration: 0,
        metadata: {}
      };
    }
  }

  /**
   * Calculate current playback rate
   * @private
   */
  calculatePlaybackRate() {
    if (!this.playbackStartTime || this.stats.messagesPlayed === 0) {
      return 0;
    }
    
    const uptimeSeconds = (Date.now() - this.playbackStartTime) / 1000;
    return uptimeSeconds > 0 ? Math.round(this.stats.messagesPlayed / uptimeSeconds) : 0;
  }

  /**
   * Extract NMEA message from recording entry
   * @param {Object} recordingEntry - Single recording entry
   * @returns {string|null} NMEA message or null if not found
   */
  extractNmeaMessage(recordingEntry) {
    if (!recordingEntry) {
      return null;
    }
    
    // Check different possible message field names in recording format
    const messageFields = ['message', 'sentence', 'data', 'raw'];
    
    for (const field of messageFields) {
      if (recordingEntry[field] && typeof recordingEntry[field] === 'string') {
        return recordingEntry[field];
      }
    }
    
    return null;
  }
}

module.exports = SessionRecorder;