import MockServer from '@/services/mockServer';
import { NmeaConnectionManager } from '@/services/nmea/nmeaConnection';
import { useNmeaStore } from '@/store/nmeaStore';

// The project mocks 'react-native-tcp-socket' in jest.setup. For this integration test
// we want to use a real Node TCP socket to connect to MockServer. Patch the mock
// implementation to forward to Node's net.createConnection for the duration of the test.
const TcpSocket = require('react-native-tcp-socket');
const net = require('net');
if (TcpSocket && typeof TcpSocket.createConnection === 'function') {
  (TcpSocket.createConnection as any).mockImplementation((opts: any, cb: any) => {
    return net.createConnection({ port: opts.port, host: opts.host }, cb);
  });
}

jest.useRealTimers();

describe('Connection resilience', () => {
  it('recovers after server restart', async () => {
    const port = 10111;
    const server = new MockServer();
    server.start(port, 'vendor/sample-data/multi.nmea', 20);

    const conn = new NmeaConnectionManager({ ip: '127.0.0.1', port, protocol: 'tcp' });
    conn.connect();
    // allow some time to connect and receive data
    await new Promise(res => setTimeout(res, 500));

    // stop the server to simulate failure
    server.stop();
    // wait for connection manager to detect and attempt reconnect
    await new Promise(res => setTimeout(res, 1500));

    // restart server
    server.start(port, 'vendor/sample-data/multi.nmea', 20);
    // wait for reconnect
    await new Promise(res => setTimeout(res, 2500));

    // Ensure store has some data (gpsPosition or depth or speed)
    const data = useNmeaStore.getState().nmeaData;
    const hasData = data && (data.gpsPosition || data.depth || data.speed || data.heading);
    expect(hasData).toBeTruthy();

    conn.disconnect();
    server.stop();
  }, 20000);
});
