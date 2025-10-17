// WebSocket-based TCP Socket replacement for web
export const createConnection = (options, connectListener) => {
  console.log('[Web WebSocket TCP] Connection attempted:', options);
  
  // Default WebSocket connection settings - safe for web environment
  const wsHost = (typeof process !== 'undefined' && process.env?.REACT_NATIVE_WEBSOCKET_HOST) || 'localhost';
  const wsPort = (typeof process !== 'undefined' && process.env?.REACT_NATIVE_WEBSOCKET_PORT) || '8080';
  const wsUrl = `ws://${wsHost}:${wsPort}`;
  
  console.log(`[Web WebSocket TCP] Connecting to NMEA Bridge Simulator at ${wsUrl}`);

  const mockSocket = {
    _listeners: {},
    _ws: null,
    _connected: false,

    on: function(event, listener) {
      console.log('[Web WebSocket TCP] Event listener added:', event);
      if (!this._listeners[event]) {
        this._listeners[event] = [];
      }
      this._listeners[event].push(listener);

      // Initialize WebSocket connection when connect listener is added
      if (event === 'connect' && !this._ws) {
        this._initializeWebSocket();
      }

      return this;
    },

    _initializeWebSocket: function() {
      try {
        console.log(`[Web WebSocket TCP] Creating WebSocket connection to ${wsUrl}`);
        console.log(`[Web WebSocket TCP] Original connection options:`, options);
        this._ws = new WebSocket(wsUrl);
        
        this._ws.onopen = () => {
          console.log('[Web WebSocket TCP] Connected to NMEA Bridge Simulator');
          this._connected = true;
          this._emit('connect');
        };
        
        this._ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'nmea' && message.data) {
              // Emit raw NMEA data to match TCP behavior
              this._emit('data', message.data);
            }
          } catch (error) {
            console.error('[Web WebSocket TCP] Failed to parse message:', error);
          }
        };
        
        this._ws.onclose = () => {
          console.log('[Web WebSocket TCP] WebSocket connection closed');
          this._connected = false;
          this._emit('close');
        };
        
        this._ws.onerror = (error) => {
          console.error('[Web WebSocket TCP] WebSocket error:', error);
          this._emit('error', error);
        };
        
      } catch (error) {
        console.error('[Web WebSocket TCP] Failed to initialize WebSocket:', error);
        setTimeout(() => this._emit('error', error), 10);
      }
    },

    _emit: function(event, ...args) {
      const listeners = this._listeners[event] || [];
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[Web WebSocket TCP] Error in ${event} listener:`, error);
        }
      });
    },

    write: function(data) {
      console.log('[Web WebSocket TCP] Write:', data);
      if (this._ws && this._connected) {
        try {
          // Send autopilot commands as JSON
          this._ws.send(JSON.stringify({
            type: 'autopilot_command',
            data: data
          }));
          return true;
        } catch (error) {
          console.error('[Web WebSocket TCP] Failed to send data:', error);
          return false;
        }
      } else {
        console.warn('[Web WebSocket TCP] Cannot write - WebSocket not connected');
        return false;
      }
    },

    destroy: function() {
      console.log('[Web WebSocket TCP] Socket destroyed');
      if (this._ws) {
        this._ws.close();
        this._ws = null;
      }
      this._connected = false;
    },

    connect: function(port, host, callback) {
      console.log(`[Web WebSocket TCP] Connect called with ${host}:${port}`);
      // Note: We ignore the provided host/port and use WebSocket endpoint
      if (callback) {
        // If already connected, call immediately
        if (this._connected) {
          setTimeout(callback, 10);
        } else {
          // Wait for connection
          this.on('connect', callback);
        }
      }
      return this;
    },
  };

  if (connectListener) {
    setTimeout(() => {
      console.log('[Web Mock TCP] Calling connect listener');
      connectListener();
    }, 100);
  }

  return mockSocket;
};

export default { createConnection };
