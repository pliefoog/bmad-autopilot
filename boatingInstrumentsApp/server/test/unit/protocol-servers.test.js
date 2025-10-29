/**
 * Unit Tests for Protocol Servers
 * 
 * Epic 10.5 - Test Coverage & Quality
 * AC1: Protocol servers tested for connection handling, message broadcasting, client management
 */

const ProtocolServers = require('../../lib/protocol-servers');
const net = require('net');
const dgram = require('dgram');
const WebSocket = require('ws');

// Mock modules
jest.mock('net');
jest.mock('dgram');
jest.mock('ws');

describe('ProtocolServers', () => {
  let protocolServers;
  let mockTCPServer;
  let mockUDPServer;
  let mockWSServer;
  let config;

  beforeEach(() => {
    config = {
      server: {
        tcpPort: 2000,
        udpPort: 2000,
        wsPort: 8080,
        maxClients: 50
      }
    };

    // Mock TCP server
    mockTCPServer = {
      listen: jest.fn((port, callback) => setTimeout(callback, 10)),
      close: jest.fn((callback) => setTimeout(callback, 10)),
      on: jest.fn(),
      address: jest.fn(() => ({ port: 2000 }))
    };

    // Mock UDP server  
    mockUDPServer = {
      bind: jest.fn((port, callback) => setTimeout(callback, 10)),
      close: jest.fn((callback) => setTimeout(callback, 10)),
      on: jest.fn(),
      address: jest.fn(() => ({ port: 2000 }))
    };

    // Mock WebSocket server
    mockWSServer = {
      on: jest.fn(),
      close: jest.fn((callback) => setTimeout(callback, 10)),
      address: jest.fn(() => ({ port: 8080 }))
    };

    net.createServer.mockReturnValue(mockTCPServer);
    dgram.createSocket.mockReturnValue(mockUDPServer);
    WebSocket.Server.mockImplementation(() => mockWSServer);

    protocolServers = new ProtocolServers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default state', () => {
      expect(protocolServers.tcpServer).toBeNull();
      expect(protocolServers.udpServer).toBeNull();
      expect(protocolServers.wsServer).toBeNull();
      expect(protocolServers.clients).toBeInstanceOf(Map);
      expect(protocolServers.isRunning).toBe(false);
      expect(protocolServers.startTime).toBeNull();
    });

    test('should initialize stats correctly', () => {
      expect(protocolServers.stats).toEqual({
        messagesProcessed: 0,
        messagesPerSecond: 0,
        activeConnections: 0,
        totalConnections: 0,
        lastSecondMessages: 0,
        lastSecondTime: expect.any(Number)
      });
    });

    test('should bind event handlers to maintain context', () => {
      expect(protocolServers.handleTCPConnection).toBeInstanceOf(Function);
      expect(protocolServers.handleUDPMessage).toBeInstanceOf(Function);
      expect(protocolServers.handleWebSocketConnection).toBeInstanceOf(Function);
    });
  });

  describe('start()', () => {
    test('should start all protocol servers successfully', async () => {
      const result = protocolServers.start(config);

      await expect(result).resolves.toBeUndefined();
      expect(protocolServers.isRunning).toBe(true);
      expect(protocolServers.startTime).toBeTruthy();
      expect(protocolServers.config).toEqual(config);
    });

    test('should set up TCP server correctly', async () => {
      await protocolServers.start(config);

      expect(net.createServer).toHaveBeenCalled();
      expect(mockTCPServer.listen).toHaveBeenCalledWith(
        config.server.tcpPort,
        expect.any(Function)
      );
      expect(mockTCPServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('should set up UDP server correctly', async () => {
      await protocolServers.start(config);

      expect(dgram.createSocket).toHaveBeenCalledWith('udp4');
      expect(mockUDPServer.bind).toHaveBeenCalledWith(
        config.server.udpPort,
        expect.any(Function)
      );
      expect(mockUDPServer.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    test('should set up WebSocket server correctly', async () => {
      await protocolServers.start(config);

      expect(WebSocket.Server).toHaveBeenCalledWith({
        port: config.server.wsPort
      });
      expect(mockWSServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('should reject if already running', async () => {
      await protocolServers.start(config);

      await expect(protocolServers.start(config)).rejects.toThrow(
        'Protocol servers are already running'
      );
    });

    test('should cleanup on startup failure', async () => {
      mockTCPServer.listen.mockImplementation((port, callback) => {
        setTimeout(() => callback(new Error('Port in use')), 10);
      });

      await expect(protocolServers.start(config)).rejects.toThrow();
      expect(protocolServers.isRunning).toBe(false);
    });
  });

  describe('stop()', () => {
    beforeEach(async () => {
      await protocolServers.start(config);
    });

    test('should stop all servers gracefully', async () => {
      await protocolServers.stop();

      expect(mockTCPServer.close).toHaveBeenCalled();
      expect(mockUDPServer.close).toHaveBeenCalled();
      expect(mockWSServer.close).toHaveBeenCalled();
      expect(protocolServers.isRunning).toBe(false);
    });

    test('should close all client connections', async () => {
      // Add mock clients
      const mockTCPClient = { socket: { destroy: jest.fn() }, type: 'tcp' };
      const mockWSClient = { socket: { close: jest.fn() }, type: 'websocket' };
      
      protocolServers.clients.set('tcp-1', mockTCPClient);
      protocolServers.clients.set('ws-1', mockWSClient);

      await protocolServers.stop();

      expect(mockTCPClient.socket.destroy).toHaveBeenCalled();
      expect(mockWSClient.socket.close).toHaveBeenCalled();
      expect(protocolServers.clients.size).toBe(0);
    });

    test('should handle errors during client cleanup gracefully', async () => {
      const mockClient = { 
        socket: { 
          destroy: jest.fn(() => { throw new Error('Close error'); })
        }, 
        type: 'tcp' 
      };
      
      protocolServers.clients.set('error-client', mockClient);

      // Should not throw despite client cleanup error
      await expect(protocolServers.stop()).resolves.toBeUndefined();
    });
  });

  describe('broadcastMessage()', () => {
    beforeEach(async () => {
      await protocolServers.start(config);
    });

    test('should broadcast message to all clients', () => {
      const mockTCPSocket = { write: jest.fn() };
      const mockWSSocket = { send: jest.fn(), state: WebSocket.OPEN };
      
      const tcpClient = { socket: mockTCPSocket, type: 'tcp' };
      const wsClient = { socket: mockWSSocket, type: 'websocket' };
      
      protocolServers.clients.set('tcp-1', tcpClient);
      protocolServers.clients.set('ws-1', wsClient);

      const message = '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A';
      protocolServers.broadcastMessage(message);

      expect(mockTCPSocket.write).toHaveBeenCalledWith(message + '\n');
      expect(mockWSSocket.send).toHaveBeenCalledWith(message);
      expect(protocolServers.stats.messagesProcessed).toBe(1);
    });

    test('should handle UDP broadcasts correctly', () => {
      const message = '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A';
      
      mockUDPServer.send = jest.fn();
      protocolServers.broadcastMessage(message);

      expect(mockUDPServer.send).toHaveBeenCalledWith(
        Buffer.from(message + '\n'),
        config.server.udpPort,
        '255.255.255.255'
      );
    });

    test('should skip closed WebSocket connections', () => {
      const mockWSSocket = { send: jest.fn(), state: WebSocket.CLOSED };
      const wsClient = { socket: mockWSSocket, type: 'websocket' };
      
      protocolServers.clients.set('ws-closed', wsClient);

      const message = 'test message';
      protocolServers.broadcastMessage(message);

      expect(mockWSSocket.send).not.toHaveBeenCalled();
    });

    test('should handle client broadcast errors gracefully', () => {
      const mockTCPSocket = { 
        write: jest.fn(() => { throw new Error('Send error'); })
      };
      
      const tcpClient = { socket: mockTCPSocket, type: 'tcp' };
      protocolServers.clients.set('error-client', tcpClient);

      const message = 'test message';
      
      // Should not throw despite client error
      expect(() => protocolServers.broadcastMessage(message)).not.toThrow();
    });
  });

  describe('client connection handling', () => {
    beforeEach(async () => {
      await protocolServers.start(config);
    });

    test('should handle TCP client connections', () => {
      const mockSocket = {
        remoteAddress: '192.168.1.100',
        remotePort: 45678,
        on: jest.fn(),
        write: jest.fn()
      };

      protocolServers.handleTCPConnection(mockSocket);

      const clientId = `${mockSocket.remoteAddress}:${mockSocket.remotePort}`;
      expect(protocolServers.clients.has(clientId)).toBe(true);
      expect(protocolServers.stats.activeConnections).toBe(1);
      expect(protocolServers.stats.totalConnections).toBe(1);

      // Verify event handlers are set up
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should handle WebSocket client connections', () => {
      const mockSocket = {
        _socket: {
          remoteAddress: '192.168.1.101',
          remotePort: 45679
        },
        on: jest.fn(),
        send: jest.fn(),
        state: WebSocket.OPEN
      };

      protocolServers.handleWebSocketConnection(mockSocket);

      const clientId = `${mockSocket._socket.remoteAddress}:${mockSocket._socket.remotePort}`;
      expect(protocolServers.clients.has(clientId)).toBe(true);
      expect(protocolServers.stats.activeConnections).toBe(1);
      expect(protocolServers.stats.totalConnections).toBe(1);

      // Verify event handlers are set up
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should enforce maximum client limit', () => {
      const limitedConfig = {
        ...config,
        server: { ...config.server, maxClients: 2 }
      };

      protocolServers.config = limitedConfig;

      // Add clients up to limit
      for (let i = 0; i < 2; i++) {
        const mockSocket = {
          remoteAddress: `192.168.1.${100 + i}`,
          remotePort: 45678 + i,
          on: jest.fn(),
          write: jest.fn()
        };
        protocolServers.handleTCPConnection(mockSocket);
      }

      expect(protocolServers.stats.activeConnections).toBe(2);

      // Try to add one more (should be rejected)
      const extraSocket = {
        remoteAddress: '192.168.1.102',
        remotePort: 45680,
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      protocolServers.handleTCPConnection(extraSocket);

      expect(protocolServers.stats.activeConnections).toBe(2);
      expect(extraSocket.end).toHaveBeenCalledWith('Server full\n');
    });

    test('should clean up client on disconnection', () => {
      const mockSocket = {
        remoteAddress: '192.168.1.100',
        remotePort: 45678,
        on: jest.fn(),
        write: jest.fn()
      };

      protocolServers.handleTCPConnection(mockSocket);
      
      const clientId = `${mockSocket.remoteAddress}:${mockSocket.remotePort}`;
      expect(protocolServers.clients.has(clientId)).toBe(true);
      expect(protocolServers.stats.activeConnections).toBe(1);

      // Simulate client disconnection
      const closeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();

      expect(protocolServers.clients.has(clientId)).toBe(false);
      expect(protocolServers.stats.activeConnections).toBe(0);
    });
  });

  describe('getStatus()', () => {
    test('should return correct status when stopped', () => {
      const status = protocolServers.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.servers).toEqual({
        tcp: { running: false, port: null },
        udp: { running: false, port: null },
        websocket: { running: false, port: null }
      });
      expect(status.stats).toEqual(protocolServers.stats);
    });

    test('should return correct status when running', async () => {
      await protocolServers.start(config);

      const status = protocolServers.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.servers.tcp.running).toBe(true);
      expect(status.servers.tcp.port).toBe(2000);
      expect(status.servers.udp.running).toBe(true);
      expect(status.servers.udp.port).toBe(2000);
      expect(status.servers.websocket.running).toBe(true);
      expect(status.servers.websocket.port).toBe(8080);
      expect(status.uptime).toBeGreaterThan(0);
    });
  });

  describe('performance stats tracking', () => {
    beforeEach(async () => {
      await protocolServers.start(config);
    });

    test('should update messages per second calculation', () => {
      const initialTime = protocolServers.stats.lastSecondTime;
      
      // Simulate messages over time
      for (let i = 0; i < 5; i++) {
        protocolServers.broadcastMessage('test message');
      }

      // Fast forward time
      protocolServers.stats.lastSecondTime = initialTime + 1000;
      protocolServers.updateMessagesPerSecond();

      expect(protocolServers.stats.messagesPerSecond).toBe(5);
      expect(protocolServers.stats.lastSecondMessages).toBe(0);
    });

    test('should track total messages processed', () => {
      for (let i = 0; i < 10; i++) {
        protocolServers.broadcastMessage('test message');
      }

      expect(protocolServers.stats.messagesProcessed).toBe(10);
    });
  });
});