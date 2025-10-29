import { PlaybackService } from "../../../src/services/playbackService";
import { useNmeaStore } from "../../../src/store/nmeaStore";

jest.useRealTimers();

describe('PlaybackService with malformed file', () => {
  let svc: PlaybackService;

  beforeEach(() => {
    svc = new PlaybackService();
    const state = useNmeaStore.getState();
    state.data = {} as any;
    state.rawSentences = [];
  });

  afterEach(() => {
    svc.stopPlayback();
  });

  it('does not crash and records raw sentences for malformed input', async () => {
    svc.startPlayback('vendor/sample-data/malformed.nmea', { speed: 1, loop: false });
  // default playback interval is ~1s between sentences, wait slightly longer
  await new Promise((res) => setTimeout(res, 1200));
    svc.stopPlayback();

    const raw = useNmeaStore.getState().rawSentences;
    expect(raw.length).toBeGreaterThan(0);
    // Ensure at least one invalid line is present
    expect(raw.some(r => r.includes('INVALID') || r.includes('not,a,valid'))).toBe(true);
  }, 10000);
});
