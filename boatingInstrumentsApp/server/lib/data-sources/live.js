/**
 * Live Data Source
 *
 * Connects to hardware NMEA WiFi bridge via TCP connection
 * and streams real-time marine instrument data.
 *
 * Extracted from nmea-websocket-bridge-enhanced.js for Epic 10.3
 */

const net = require('net');
const EventEmitter = require('events');

class LiveDataSource extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.tcpSocket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
    this.stats = {
      messagesReceived: 0,
      connectionTime: null,
      lastMessage: null,
    };
  }

  /**
   * Start the live data connection
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.emit('status', `Connecting to ${this.config.host}:${this.config.port}...`);

      this.tcpSocket = new net.Socket();

      // Connection successful
      this.tcpSocket.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.stats.connectionTime = Date.now();

        this.emit(
          'status',
          `Connected to NMEA WiFi bridge at ${this.config.host}:${this.config.port}`,
        );
        resolve();
      });

      // Data received from hardware bridge
      this.tcpSocket.on('data', (data) => {
        const nmeaData = data.toString().trim();
        if (nmeaData) {
          // Split multiple NMEA sentences if received together
          const sentences = nmeaData.split('\n').filter((line) => line.trim().length > 0);

          sentences.forEach((sentence) => {
            if (sentence.startsWith('$') || sentence.startsWith('!')) {
              this.stats.messagesReceived++;
              this.stats.lastMessage = Date.now();
              this.emit('data', sentence.trim());
            }
          });
        }
      });

      // Connection closed
      this.tcpSocket.on('close', () => {
        this.isConnected = false;
        this.emit('status', 'Connection to NMEA bridge closed');

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.emit('error', new Error('Maximum reconnection attempts reached'));
        }
      });

      // Connection error
      this.tcpSocket.on('error', (error) => {
        this.isConnected = false;
        this.emit('error', new Error(`TCP connection error: ${error.message}`));
        reject(error);
      });

      // Initiate connection
      this.tcpSocket.connect(this.config.port, this.config.host);

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error(`Connection timeout to ${this.config.host}:${this.config.port}`));
        }
      }, 10000);

      this.tcpSocket.on('connect', () => {
        clearTimeout(connectionTimeout);
      });
    });
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    this.emit(
      'status',
      `Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${
        this.maxReconnectAttempts
      })`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.start().catch((error) => {
        console.error('Reconnection failed:', error.message);
      });
    }, delay);
  }

  /**
   * Stop the live data connection
   */
  async stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.tcpSocket) {
      this.tcpSocket.destroy();
      this.tcpSocket = null;
    }

    this.isConnected = false;
    this.emit('status', 'Live data source stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      type: 'live',
      isConnected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
      stats: this.stats,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

module.exports = LiveDataSource;
