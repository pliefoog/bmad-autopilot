#!/usr/bin/env node

/**
 * Message Scheduler Component
 *
 * Manages timing control for NMEA message generation and transmission.
 * Provides high-precision scheduling with configurable frequencies per message type.
 * Handles scenario timing, recording playback timing, and per-client scheduling.
 *
 * Implements SimulatorComponent interface for lifecycle management.
 */

const { SimulatorComponent } = require('./types');

class MessageScheduler {
  constructor() {
    this.config = null;
    this.isRunning = false;
    this.startTime = null;
    this.messageInterval = null;
    this.scenarioTimers = [];
    this.lastBroadcastTimes = {};

    // Per-client playback tracking
    this.clientSchedulers = new Map(); // clientId -> scheduler state

    // Callback handlers
    this.messageGeneratorCallback = null;
    this.messageBroadcastCallback = null;

    // Timing configuration
    this.scenarioTiming = null;
    this.scenarioSpeed = 1.0;

    // Performance stats
    this.stats = {
      messagesScheduled: 0,
      averageLatency: 0,
      totalLatency: 0,
      schedulingErrors: 0,
    };
  }

  /**
   * Start the message scheduler
   * @param {SimulatorConfig} config - Scheduler configuration
   */
  async start(config) {
    if (this.isRunning) {
      throw new Error('Message scheduler is already running');
    }

    this.config = config;
    this.startTime = Date.now();
    this.isRunning = true;

    console.log('✅ Message Scheduler started');
  }

  /**
   * Stop the message scheduler
   */
  async stop() {
    console.log('🔌 Shutting down message scheduler...');

    // Clear main interval
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }

    // Clear scenario timers
    this.scenarioTimers.forEach((timer) => clearTimeout(timer));
    this.scenarioTimers = [];

    // Clear client schedulers
    for (const [clientId, scheduler] of this.clientSchedulers) {
      if (scheduler.timeoutId) {
        clearTimeout(scheduler.timeoutId);
      }
    }
    this.clientSchedulers.clear();

    this.isRunning = false;
    this.startTime = null;
    this.lastBroadcastTimes = {};

    console.log('✅ Message Scheduler stopped');
  }

  /**
   * Get scheduler status
   * @returns {ComponentStatus}
   */
  getStatus() {
    return {
      running: this.isRunning,
      state: this.isRunning ? 'running' : 'stopped',
      error: null,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Get scheduler metrics
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    return {
      messagesProcessed: this.stats.messagesScheduled,
      messagesPerSecond: this.calculateCurrentThroughput(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      activeConnections: this.clientSchedulers.size,
      customMetrics: {
        averageLatency: this.stats.averageLatency,
        schedulingErrors: this.stats.schedulingErrors,
        activeTimers: this.scenarioTimers.length,
        scenarioSpeed: this.scenarioSpeed,
      },
    };
  }

  /**
   * Register message generation callback
   * @param {Function} callback - Function to call for message generation
   */
  setMessageGenerator(callback) {
    this.messageGeneratorCallback = callback;
  }

  /**
   * Register message broadcast callback
   * @param {Function} callback - Function to call for message broadcasting
   */
  setMessageBroadcaster(callback) {
    this.messageBroadcastCallback = callback;
  }

  /**
   * Start scheduled message generation
   * @param {Object} timing - Timing configuration for message types
   */
  startScheduledGeneration(timing = null) {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }

    this.scenarioTiming = timing;

    if (timing && this.messageGeneratorCallback) {
      // Use selective generation with precise timing
      this.messageInterval = setInterval(() => {
        this.generateSelectiveMessages();
      }, 50); // Check every 50ms for precise timing
    } else if (this.messageGeneratorCallback) {
      // Fallback to basic interval generation
      const interval = this.config?.nmea?.messageInterval || 1000;
      this.messageInterval = setInterval(() => {
        this.generateAllMessages();
      }, interval);
    }
  }

  /**
   * Stop scheduled message generation
   */
  stopScheduledGeneration() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }
  }

  /**
   * Schedule recording playback
   * @param {Array} recordingMessages - Array of recorded messages with timing
   * @param {number} playbackSpeed - Speed multiplier (1.0 = normal speed)
   * @param {boolean} loop - Whether to loop playback
   */
  scheduleRecordingPlayback(recordingMessages, playbackSpeed = 1.0, loop = false) {
    if (!recordingMessages || !recordingMessages.length) {
      throw new Error('No recording messages provided for playback');
    }

    let currentIndex = 0;
    const startTime = Date.now();

    const scheduleNext = () => {
      if (currentIndex >= recordingMessages.length) {
        if (loop) {
          console.log('🔄 Restarting recording playback (loop mode)');
          currentIndex = 0;
        } else {
          console.log('✅ Recording playback completed');
          return;
        }
      }

      const message = recordingMessages[currentIndex];
      let delay;

      if (currentIndex === 0) {
        // First message - use its relative_time from start
        delay = (message.relative_time * 1000) / playbackSpeed;
      } else {
        // Subsequent messages - calculate interval from previous message
        const prevMessage = recordingMessages[currentIndex - 1];
        const interval = (message.relative_time - prevMessage.relative_time) * 1000;
        delay = Math.max(1, interval / playbackSpeed); // Minimum 1ms delay
      }

      const timerId = setTimeout(() => {
        const scheduleTime = Date.now();

        // Extract NMEA message from recording entry
        const nmeaMessage = message.message || message.sentence || message.data || message.raw;

        if (nmeaMessage && this.messageBroadcastCallback) {
          this.messageBroadcastCallback(nmeaMessage);
          this.updateLatencyStats(scheduleTime, Date.now());
          this.stats.messagesScheduled++;
        } else {
          console.warn('⚠️ No NMEA message found in recording entry');
          this.stats.schedulingErrors++;
        }

        currentIndex++;
        scheduleNext();
      }, delay);

      this.scenarioTimers.push(timerId);
    };

    console.log(
      `🎬 Starting recording playback (${recordingMessages.length} messages, speed: ${playbackSpeed}x)`,
    );
    scheduleNext();
  }

  /**
   * Schedule per-client recording playback
   * @param {string} clientId - Client identifier
   * @param {Array} recordingMessages - Array of recorded messages
   * @param {number} playbackSpeed - Speed multiplier
   * @param {boolean} loop - Whether to loop playback
   * @param {Function} clientMessageCallback - Callback for sending message to specific client
   */
  scheduleClientPlayback(
    clientId,
    recordingMessages,
    playbackSpeed = 1.0,
    loop = false,
    clientMessageCallback,
  ) {
    if (!recordingMessages || !recordingMessages.length) {
      throw new Error('No recording messages provided for client playback');
    }

    if (this.clientSchedulers.has(clientId)) {
      this.stopClientPlayback(clientId);
    }

    const scheduler = {
      messages: recordingMessages,
      currentIndex: 0,
      playbackSpeed,
      loop,
      startTime: Date.now(),
      timeoutId: null,
      callback: clientMessageCallback,
    };

    this.clientSchedulers.set(clientId, scheduler);
    console.log(`🎬 Starting per-client playback for ${clientId}`);

    this.scheduleNextClientMessage(clientId);
  }

  /**
   * Stop per-client playback
   * @param {string} clientId - Client identifier
   */
  stopClientPlayback(clientId) {
    const scheduler = this.clientSchedulers.get(clientId);
    if (scheduler) {
      if (scheduler.timeoutId) {
        clearTimeout(scheduler.timeoutId);
      }
      this.clientSchedulers.delete(clientId);
      console.log(`⏹️ Stopped playback for client ${clientId}`);
    }
  }

  /**
   * Set scenario speed multiplier
   * @param {number} speed - Speed multiplier (1.0 = normal speed)
   */
  setScenarioSpeed(speed) {
    this.scenarioSpeed = Math.max(0.1, Math.min(10.0, speed)); // Clamp between 0.1x and 10x
  }

  /**
   * Generate selective messages based on timing configuration
   * @private
   */
  generateSelectiveMessages() {
    if (!this.messageGeneratorCallback || !this.scenarioTiming) {
      return;
    }

    const now = Date.now();
    const timing = this.scenarioTiming;
    const messagesToGenerate = [];

    // Check each message type individually
    const messageTypes = [
      'depth',
      'speed',
      'wind',
      'gps',
      'water_temp',
      'tanks',
      'electrical',
      'engines',
    ];

    for (const messageType of messageTypes) {
      if (
        timing[messageType] &&
        this.shouldGenerateMessage(messageType, timing[messageType], now)
      ) {
        messagesToGenerate.push(messageType);
        this.lastBroadcastTimes[messageType] = now;
      }
    }

    if (messagesToGenerate.length > 0) {
      const scheduleTime = Date.now();
      const messages = this.messageGeneratorCallback(messagesToGenerate, timing);

      if (messages && messages.length > 0 && this.messageBroadcastCallback) {
        messages.forEach((message) => {
          if (message) {
            this.messageBroadcastCallback(message);
          }
        });

        this.updateLatencyStats(scheduleTime, Date.now());
        this.stats.messagesScheduled += messages.length;
      }
    }
  }

  /**
   * Generate all messages using basic interval
   * @private
   */
  generateAllMessages() {
    if (!this.messageGeneratorCallback) {
      return;
    }

    const scheduleTime = Date.now();
    const messages = this.messageGeneratorCallback();

    if (messages && messages.length > 0 && this.messageBroadcastCallback) {
      messages.forEach((message) => {
        if (message) {
          this.messageBroadcastCallback(message);
        }
      });

      this.updateLatencyStats(scheduleTime, Date.now());
      this.stats.messagesScheduled += messages.length;
    }
  }

  /**
   * Check if a message type should be generated based on timing
   * @private
   */
  shouldGenerateMessage(messageType, frequencyHz, now) {
    if (!frequencyHz || frequencyHz <= 0) {
      return false;
    }

    const intervalMs = 1000 / frequencyHz / this.scenarioSpeed;
    const lastTime = this.lastBroadcastTimes[messageType] || 0;
    return now - lastTime >= intervalMs;
  }

  /**
   * Schedule next message for a specific client
   * @private
   */
  scheduleNextClientMessage(clientId) {
    const scheduler = this.clientSchedulers.get(clientId);
    if (!scheduler) {
      return;
    }

    if (scheduler.currentIndex >= scheduler.messages.length) {
      if (scheduler.loop) {
        console.log(`🔄 Restarting playback for client ${clientId} (loop mode)`);
        scheduler.currentIndex = 0;
        scheduler.startTime = Date.now();
      } else {
        console.log(`✅ Playback completed for client ${clientId}`);
        this.clientSchedulers.delete(clientId);
        return;
      }
    }

    const message = scheduler.messages[scheduler.currentIndex];
    let delay;

    if (scheduler.currentIndex === 0) {
      // First message - use its relative_time from start
      delay = (message.relative_time * 1000) / scheduler.playbackSpeed;
    } else {
      // Subsequent messages - calculate interval from previous message
      const prevMessage = scheduler.messages[scheduler.currentIndex - 1];
      const interval = (message.relative_time - prevMessage.relative_time) * 1000;
      delay = Math.max(1, interval / scheduler.playbackSpeed); // Minimum 1ms delay
    }

    scheduler.timeoutId = setTimeout(() => {
      const scheduleTime = Date.now();

      // Extract NMEA message from recording entry
      const nmeaMessage = message.message || message.sentence || message.data || message.raw;

      if (nmeaMessage && scheduler.callback) {
        scheduler.callback(clientId, nmeaMessage);
        this.updateLatencyStats(scheduleTime, Date.now());
        this.stats.messagesScheduled++;
      } else {
        console.warn(`⚠️ No NMEA message found for client ${clientId}`);
        this.stats.schedulingErrors++;
      }

      // Schedule next message
      scheduler.currentIndex++;
      this.scheduleNextClientMessage(clientId);
    }, delay);
  }

  /**
   * Calculate current throughput
   * @private
   */
  calculateCurrentThroughput() {
    if (!this.startTime) {
      return 0;
    }

    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    return uptimeSeconds > 0 ? Math.round(this.stats.messagesScheduled / uptimeSeconds) : 0;
  }

  /**
   * Update latency statistics
   * @private
   */
  updateLatencyStats(scheduleTime, executeTime) {
    const latency = executeTime - scheduleTime;
    this.stats.totalLatency += latency;
    this.stats.averageLatency =
      this.stats.messagesScheduled > 0 ? this.stats.totalLatency / this.stats.messagesScheduled : 0;
  }
}

module.exports = MessageScheduler;
