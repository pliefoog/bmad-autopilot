import MockServer from '../../src/services/mockServer';
import net from 'net';

describe('MockServer', () => {
  let server: MockServer;
  beforeEach(() => {
    server = new MockServer();
  });
  afterEach(() => {
    server.stop();
  });

  it('should serve lines over TCP', (done) => {
    const samplePath = 'vendor/sample-data/sample.nmea';
    server.start(12000, samplePath, 10);

    const client = new net.Socket();
    let received = '';
    client.connect(12000, '127.0.0.1', () => {
      // wait for some data
    });
    client.on('data', (data) => {
      received += data.toString();
      if (received.length > 5) {
        expect(received).toContain('$GPGGA');
        client.destroy();
        done();
      }
    });
    client.on('error', (e) => {
      done(e);
    });
  }, 10000);
});
