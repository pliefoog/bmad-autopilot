import { PlaybackService } from '@/services/playbackService';
import { useNmeaStore } from '@/store/nmeaStore';
import path from 'path';

jest.useRealTimers();

describe('Malformed playback handling', () => {
  it('records invalid sentences but does not crash', async () => {
    const svc = new PlaybackService();
    const store = useNmeaStore.getState();
    store.reset();

    const file = path.join('vendor', 'sample-data', 'malformed_checksum.nmea');
    svc.startPlayback(file, { speed: 10, loop: false });
    // wait briefly for sentences to emit
    await new Promise(res => setTimeout(res, 500));
    svc.stopPlayback();

    const raws = useNmeaStore.getState().rawSentences;
    // We expect at least one invalid marker entry starting with 'INVALID:'
    const hasInvalid = raws.some(r => r.startsWith('INVALID:'));
    expect(hasInvalid).toBe(true);
  }, 10000);
});
