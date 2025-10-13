// Mock UDP Socket for web
export const createSocket = (type) => {
  console.log('[Web Mock UDP] Socket created:', type);

  return {
    bind: (port, address) => {
      console.log(`[Web Mock UDP] Bound to ${address || '0.0.0.0'}:${port}`);
    },

    send: (data, offset, length, port, address, callback) => {
      console.log(`[Web Mock UDP] Send to ${address}:${port}`, data);
      if (callback) callback(null);
    },

    close: (callback) => {
      console.log('[Web Mock UDP] Socket closed');
      if (callback) callback();
    },

    on: (event, listener) => {
      console.log('[Web Mock UDP] Event listener added:', event);
    },
  };
};

export default { createSocket };
