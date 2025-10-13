// Mock TCP Socket for web
export const createConnection = (options, connectListener) => {
  console.log('[Web Mock TCP] Connection attempted:', options);
  console.log('[Web Mock TCP] In web mode, TCP sockets are simulated');

  const mockSocket = {
    _listeners: {},

    on: function(event, listener) {
      console.log('[Web Mock TCP] Event listener added:', event);
      if (!this._listeners[event]) {
        this._listeners[event] = [];
      }
      this._listeners[event].push(listener);

      // Simulate connection success
      if (event === 'connect') {
        setTimeout(() => {
          console.log('[Web Mock TCP] Simulating connect event');
          listener();
        }, 100);
      }

      return this;
    },

    write: function(data) {
      console.log('[Web Mock TCP] Write:', data);
      return true;
    },

    destroy: function() {
      console.log('[Web Mock TCP] Socket destroyed');
    },

    connect: function(port, host, callback) {
      console.log(`[Web Mock TCP] Connecting to ${host}:${port}`);
      if (callback) {
        setTimeout(callback, 100);
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
