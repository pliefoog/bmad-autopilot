/**
 * File Data Source
 *
 * Streams NMEA data from recorded files with configurable playback rate
 * and loop support. Maintains timing and message ordering.
 *
 * Extracted from nmea-websocket-bridge-enhanced.js for Epic 10.3
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class FileDataSource extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.nmeaLines = [];
    this.currentLineIndex = 0;
    this.playbackTimer = null;
    this.isPlaying = false;
    this.stats = {
      totalLines: 0,
      currentLine: 0,
      messagesStreamed: 0,
      startTime: null,
      loopCount: 0,
    };
  }

  /**
   * Start file playback
   */
  async start() {
    try {
      await this.loadFile();
      this.startPlayback();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load and parse NMEA file
   */
  async loadFile() {
    return new Promise((resolve, reject) => {
      this.emit('status', `Loading file: ${this.config.filePath}`);

      try {
        const fileContent = fs.readFileSync(this.config.filePath, 'utf8');

        // Parse NMEA sentences from file
        this.nmeaLines = fileContent
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && (line.startsWith('$') || line.startsWith('!')));

        this.stats.totalLines = this.nmeaLines.length;
        this.currentLineIndex = 0;

        if (this.nmeaLines.length === 0) {
          reject(new Error('No valid NMEA sentences found in file'));
          return;
        }

        this.emit(
          'status',
          `Loaded ${this.nmeaLines.length} NMEA sentences from ${path.basename(
            this.config.filePath,
          )}`,
        );

        // Show sample message
        if (this.nmeaLines.length > 0) {
          this.emit('status', `Sample: ${this.nmeaLines[0].substring(0, 50)}...`);
        }

        resolve();
      } catch (error) {
        reject(new Error(`Failed to load file: ${error.message}`));
      }
    });
  }

  /**
   * Start streaming NMEA data at configured rate
   */
  startPlayback() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.stats.startTime = Date.now();

    const intervalMs = 1000 / this.config.rate;

    this.emit(
      'status',
      `Starting playback at ${this.config.rate} messages/second (${intervalMs}ms interval)`,
    );
    this.emit('status', `Loop mode: ${this.config.loop ? 'Enabled' : 'Disabled'}`);

    this.playbackTimer = setInterval(() => {
      this.streamNextMessage();
    }, intervalMs);
  }

  /**
   * Stream the next NMEA message
   */
  streamNextMessage() {
    if (this.currentLineIndex >= this.nmeaLines.length) {
      if (this.config.loop) {
        this.stats.loopCount++;
        this.currentLineIndex = 0;
        this.emit('status', `Looping playback (iteration ${this.stats.loopCount + 1})`);
      } else {
        this.emit('status', 'Playback complete');
        this.stopPlayback();
        return;
      }
    }

    const message = this.nmeaLines[this.currentLineIndex];
    this.stats.currentLine = this.currentLineIndex + 1;
    this.stats.messagesStreamed++;

    // Emit the NMEA message
    this.emit('data', message);

    this.currentLineIndex++;

    // Log progress periodically (every 50 messages to avoid spam)
    if (this.stats.messagesStreamed % 50 === 0) {
      const progress = Math.round((this.currentLineIndex / this.nmeaLines.length) * 100);
      this.emit(
        'status',
        `Progress: ${progress}% (${this.currentLineIndex}/${this.nmeaLines.length})`,
      );
    }
  }

  /**
   * Stop playback
   */
  stopPlayback() {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.isPlaying = false;
  }

  /**
   * Stop the file data source
   */
  async stop() {
    this.stopPlayback();
    this.emit('status', 'File playback stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    const progress =
      this.stats.totalLines > 0
        ? Math.round((this.currentLineIndex / this.stats.totalLines) * 100)
        : 0;

    return {
      type: 'file',
      filePath: this.config.filePath,
      fileName: path.basename(this.config.filePath),
      isPlaying: this.isPlaying,
      rate: this.config.rate,
      loop: this.config.loop,
      progress: progress,
      stats: this.stats,
    };
  }

  /**
   * Seek to specific position in file (for external control)
   */
  seek(position) {
    if (position < 0 || position >= this.nmeaLines.length) {
      throw new Error(`Invalid seek position: ${position}`);
    }

    this.currentLineIndex = position;
    this.stats.currentLine = position + 1;
    this.emit(
      'status',
      `Seeked to position ${position} (${Math.round((position / this.nmeaLines.length) * 100)}%)`,
    );
  }

  /**
   * Change playback rate during operation
   */
  setRate(newRate) {
    if (newRate <= 0 || newRate > 1000) {
      throw new Error(`Invalid playback rate: ${newRate}`);
    }

    this.config.rate = newRate;

    if (this.isPlaying) {
      this.stopPlayback();
      this.startPlayback();
    }

    this.emit('status', `Playback rate changed to ${newRate} messages/second`);
  }
}

module.exports = FileDataSource;
