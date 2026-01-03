#!/usr/bin/env node

/**
 * Type definitions and interfaces for NMEA Bridge Simulator components
 *
 * Defines the common interface contracts that all simulator components must implement
 * for consistent lifecycle management and dependency injection.
 */

/**
 * @typedef {Object} ComponentStatus
 * @property {boolean} running - Whether the component is currently running
 * @property {string} state - Current state: 'stopped', 'starting', 'running', 'stopping', 'error'
 * @property {string|null} error - Error message if in error state
 * @property {number} uptime - Time since component started (ms)
 */

/**
 * @typedef {Object} ComponentMetrics
 * @property {number} messagesProcessed - Total messages processed
 * @property {number} messagesPerSecond - Current throughput
 * @property {number} memoryUsage - Memory usage in MB
 * @property {number} activeConnections - Number of active connections (if applicable)
 * @property {Object} [customMetrics] - Component-specific metrics
 */

/**
 * @typedef {Object} SimulatorConfig
 * @property {Object} server - Server configuration
 * @property {Object} server.ports - Port configuration
 * @property {number} server.ports.tcp - TCP server port
 * @property {number} server.ports.udp - UDP server port
 * @property {number} server.ports.websocket - WebSocket server port
 * @property {number} server.ports.api - API server port
 * @property {number} server.maxClients - Maximum concurrent clients
 * @property {number} server.timeoutMs - Connection timeout in milliseconds
 * @property {string} server.bindHost - Host to bind servers to
 * @property {Object} nmea - NMEA message configuration
 * @property {number} nmea.messageInterval - Interval between messages (ms)
 * @property {string} nmea.bridgeMode - Bridge mode: 'nmea0183' or 'nmea2000'
 * @property {Object} scenarios - Scenario configuration
 * @property {number} scenarios.speed - Speed multiplier for scenario time progression
 * @property {Object} recording - Recording playback configuration
 * @property {number} recording.speed - Playback speed multiplier
 * @property {boolean} recording.loop - Whether to loop recordings
 * @property {string} recording.mode - Playback mode: 'global' or 'per-client'
 */

/**
 * @typedef {Object} NMEAMessage
 * @property {string} sentence - Complete NMEA sentence
 * @property {Date} timestamp - Message timestamp
 * @property {string} messageType - NMEA message type (e.g., 'GGA', 'VTG')
 * @property {'NMEA_0183'|'NMEA_2000'} protocol - Protocol version
 * @property {Object} [parsed] - Parsed message data
 */

/**
 * Base interface that all simulator components must implement
 * @interface SimulatorComponent
 */
const SimulatorComponent = {
  /**
   * Start the component with given configuration
   * @param {SimulatorConfig} config - Component configuration
   * @returns {Promise<void>}
   */
  async start(config) {
    throw new Error('start() method must be implemented');
  },

  /**
   * Stop the component gracefully
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error('stop() method must be implemented');
  },

  /**
   * Get current component status
   * @returns {ComponentStatus}
   */
  getStatus() {
    throw new Error('getStatus() method must be implemented');
  },

  /**
   * Get component performance metrics
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    throw new Error('getMetrics() method must be implemented');
  },
};

module.exports = {
  SimulatorComponent,
  // Export type definitions for JSDoc
  ComponentStatus: {},
  ComponentMetrics: {},
  SimulatorConfig: {},
  NMEAMessage: {},
};
