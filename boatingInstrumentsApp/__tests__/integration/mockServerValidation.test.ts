import MockServer from '@/services/mockServer';

describe('MockServer validation', () => {
  it('records invalid sentences when serving malformed file', async () => {
    const server = new MockServer();
    server.start(10112, 'vendor/sample-data/malformed_checksum.nmea', 10);
    // wait a short while for server to process
    await new Promise(res => setTimeout(res, 200));
    const invalids = server.getInvalidSentences();
    expect(invalids.length).toBeGreaterThan(0);
    server.stop();
  }, 5000);
});
