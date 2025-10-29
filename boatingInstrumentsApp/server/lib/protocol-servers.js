#!/usr/bin/env node

/**
 * Protocol Servers Component
 * 
 * Manages TCP, UDP, and WebSocket server infrastructure for NMEA Bridge Simulator.
 * Handles client connections, message routing, and connection lifecycle management.
 * 
 * Implements SimulatorComponent interface for lifecycle management.
 */

const net = require('net');
const dgram = require('dgram');
const WebSocket = require('ws');
const { SimulatorComponent } = require('./types');

class ProtocolServers {
  constructor() {
    this.tcpServer = null;
    this.udpServer = null;
    this.wsServer = null;
    this.clients = new Map();
    this.config = null;
    this.isRunning = false;
    this.startTime = null;
    this.messageHandlers = new Map();
    this.stats = {
      messagesProcessed: 0,
      messagesPerSecond: 0,
      activeConnections: 0,
      totalConnections: 0,
      lastSecondMessages: 0,
      lastSecondTime: Date.now()
    };

    // Bind event handlers to maintain 'this' context
    this.handleTCPConnection = this.handleTCPConnection.bind(this);
    this.handleUDPMessage = this.handleUDPMessage.bind(this);
    this.handleWebSocketConnection = this.handleWebSocketConnection.bind(this);
  }

  /**
   * Start all protocol servers
   * @param {SimulatorConfig} config - Server configuration
   */
  async start(config) {
    if (this.isRunning) {
      throw new Error('Protocol servers are already running');
    }

    this.config = config;
    this.startTime = Date.now();

    try {
      // Start all servers in parallel
      await Promise.all([
        this.startTCPServer(),
        this.startUDPServer(), 
        this.startWebSocketServer()
      ]);

      this.isRunning = true;
      console.log('✅ All protocol servers started successfully');
    } catch (error) {
      // Cleanup any partially started servers
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop all protocol servers gracefully
   */
  async stop() {
    console.log('🔌 Shutting down protocol servers...');

    const shutdownPromises = [];

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        if (client.type === 'tcp' && client.socket) {
          client.socket.destroy();
        } else if (client.type === 'websocket' && client.socket) {
          client.socket.close();
        }
      } catch (error) {
        console.warn(`Warning: Error closing client ${clientId}:`, error.message);
      }
    }
    this.clients.clear();

    // Close TCP server
    if (this.tcpServer) {
      shutdownPromises.push(new Promise((resolve) => {
        this.tcpServer.close(() => {
          console.log('✅ TCP server closed');
          resolve();
        });
      }));
    }

    // Close UDP server
    if (this.udpServer) {
      shutdownPromises.push(new Promise((resolve) => {
        this.udpServer.close(() => {
          console.log('✅ UDP server closed');
          resolve();
        });
      }));
    }

    // Close WebSocket server
    if (this.wsServer) {
      shutdownPromises.push(new Promise((resolve) => {
        this.wsServer.close(() => {
          console.log('✅ WebSocket server closed');
          resolve();
        });
      }));
    }

    await Promise.all(shutdownPromises);
    
    this.tcpServer = null;
    this.udpServer = null;
    this.wsServer = null;
    this.isRunning = false;
    this.startTime = null;
    
    console.log('✅ All protocol servers shut down');
  }

  /**
   * Get current server status
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
   * Get server performance metrics
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    this.updateThroughputMetrics();
    
    return {
      messagesProcessed: this.stats.messagesProcessed,
      messagesPerSecond: this.stats.messagesPerSecond,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      activeConnections: this.clients.size,
      customMetrics: {
        totalConnections: this.stats.totalConnections,
        tcpConnections: Array.from(this.clients.values()).filter(c => c.type === 'tcp').length,
        udpConnections: Array.from(this.clients.values()).filter(c => c.type === 'udp').length,
        wsConnections: Array.from(this.clients.values()).filter(c => c.type === 'websocket').length
      }
    };
  }

  /**
   * Register message handler callback
   * @param {string} type - Handler type ('message', 'autopilot', 'connection')
   * @param {Function} handler - Handler function
   */
  registerMessageHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Broadcast message to all connected clients
   * @param {string} message - Message to broadcast
   */
  broadcast(message) {
    let successCount = 0;
    let errorCount = 0;

    for (const [clientId, client] of this.clients) {
      try {
        if (client.type === 'tcp' && client.socket && !client.socket.destroyed) {
          client.socket.write(message + '\r\n');
          successCount++;
        } else if (client.type === 'udp' && client.remote) {
          this.udpServer.send(message + '\r\n', client.remote.port, client.remote.address);
          successCount++;
        } else if (client.type === 'websocket' && client.socket && client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(message);
          successCount++;
        }
      } catch (error) {
        console.warn(`Warning: Failed to send message to ${clientId}:`, error.message);
        errorCount++;
        
        // Remove dead connections
        if (client.type === 'tcp' && client.socket && client.socket.destroyed) {
          this.clients.delete(clientId);
        } else if (client.type === 'websocket' && client.socket && client.socket.readyState === WebSocket.CLOSED) {
          this.clients.delete(clientId);
        }
      }
    }

    this.stats.messagesProcessed += successCount;
    return { successCount, errorCount };
  }

  /**
   * Start TCP server
   * @private
   */
  async startTCPServer() {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer(this.handleTCPConnection);
      
      this.tcpServer.listen(this.config.server.ports.tcp, this.config.server.bindHost, () => {
        console.log(`✅ TCP server listening on ${this.config.server.bindHost}:${this.config.server.ports.tcp}`);
        resolve();
      });
      
      this.tcpServer.on('error', (err) => {
        console.error(`❌ TCP server error:`, err.message);
        reject(err);
      });
    });
  }

  /**
   * Start UDP server
   * @private
   */
  async startUDPServer() {
    return new Promise((resolve, reject) => {
      this.udpServer = dgram.createSocket('udp4');
      
      this.udpServer.on('message', this.handleUDPMessage);
      
      this.udpServer.on('listening', () => {
        console.log(`✅ UDP server listening on ${this.config.server.bindHost}:${this.config.server.ports.udp}`);
        resolve();
      });
      
      this.udpServer.on('error', (err) => {
        console.error(`❌ UDP server error:`, err.message);
        reject(err);
      });
      
      this.udpServer.bind(this.config.server.ports.udp, this.config.server.bindHost);
    });
  }

  /**
   * Start WebSocket server
   * @private
   */
  async startWebSocketServer() {
    return new Promise((resolve, reject) => {
      this.wsServer = new WebSocket.Server({ 
        port: this.config.server.ports.websocket, 
        host: this.config.server.bindHost 
      });
      
      this.wsServer.on('listening', () => {
        console.log(`✅ WebSocket server listening on ${this.config.server.bindHost}:${this.config.server.ports.websocket}`);
        resolve();
      });
      
      this.wsServer.on('connection', this.handleWebSocketConnection);
      
      this.wsServer.on('error', (err) => {
        console.error(`❌ WebSocket server error:`, err.message);
        reject(err);
      });
    });
  }

  /**
   * Handle new TCP connection
   * @private
   */
  handleTCPConnection(socket) {
    const clientId = `tcp-${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`📱 TCP client connected: ${clientId}`);
    
    this.clients.set(clientId, {
      type: 'tcp',
      socket: socket,
      connected: true,
      connectedAt: new Date()
    });
    
    this.stats.totalConnections++;
    this.notifyConnectionHandler('connect', clientId);
    
    socket.on('data', (data) => {
      this.handleClientMessage(clientId, data.toString());
    });
    
    socket.on('close', () => {
      console.log(`📱 TCP client disconnected: ${clientId}`);
      this.clients.delete(clientId);
      this.notifyConnectionHandler('disconnect', clientId);
    });
    
    socket.on('error', (err) => {
      console.error(`❌ TCP client error ${clientId}:`, err.message);
      this.clients.delete(clientId);
      this.notifyConnectionHandler('error', clientId, err);
    });
  }

  /**
   * Handle UDP message
   * @private
   */
  handleUDPMessage(message, remote) {
    const clientId = `udp-${remote.address}:${remote.port}`;
    
    if (!this.clients.has(clientId)) {
      console.log(`📱 UDP client connected: ${clientId}`);
      this.clients.set(clientId, {
        type: 'udp',
        remote: remote,
        connected: true,
        connectedAt: new Date()
      });
      
      this.stats.totalConnections++;
      this.notifyConnectionHandler('connect', clientId);
    }
    
    this.handleClientMessage(clientId, message.toString());
  }

  /**
   * Handle new WebSocket connection
   * @private
   */
  handleWebSocketConnection(ws, req) {
    const clientId = `ws-${req.socket.remoteAddress}:${req.socket.remotePort}`;
    console.log(`📱 WebSocket client connected: ${clientId}`);
    
    this.clients.set(clientId, {
      type: 'websocket',
      socket: ws,
      connected: true,
      connectedAt: new Date()
    });
    
    this.stats.totalConnections++;
    this.notifyConnectionHandler('connect', clientId);
    
    ws.on('message', (message) => {
      this.handleClientMessage(clientId, message.toString());
    });
    
    ws.on('close', () => {
      console.log(`📱 WebSocket client disconnected: ${clientId}`);
      this.clients.delete(clientId);
      this.notifyConnectionHandler('disconnect', clientId);
    });
    
    ws.on('error', (err) => {
      console.error(`❌ WebSocket client error ${clientId}:`, err.message);
      this.clients.delete(clientId);
      this.notifyConnectionHandler('error', clientId, err);
    });
  }

  /**
   * Handle client message
   * @private
   */
  handleClientMessage(clientId, message) {
    const handler = this.messageHandlers.get('message');
    if (handler) {
      handler(clientId, message);
    } else {
      console.log(`📡 Message from ${clientId}: ${message.trim().substring(0, 50)}...`);
    }
  }

  /**
   * Notify connection handler
   * @private
   */
  notifyConnectionHandler(event, clientId, error = null) {
    const handler = this.messageHandlers.get('connection');
    if (handler) {
      handler(event, clientId, error);
    }
  }

  /**
   * Update throughput metrics
   * @private
   */
  updateThroughputMetrics() {
    const now = Date.now();
    const timeDiff = now - this.stats.lastSecondTime;
    
    if (timeDiff >= 1000) {
      this.stats.messagesPerSecond = Math.round(
        (this.stats.messagesProcessed - this.stats.lastSecondMessages) / (timeDiff / 1000)
      );
      this.stats.lastSecondMessages = this.stats.messagesProcessed;
      this.stats.lastSecondTime = now;
    }
  }
}

module.exports = ProtocolServers;