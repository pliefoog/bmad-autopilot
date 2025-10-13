import { PlaybackService } from '../../src/services/playbackService';
import { useNmeaStore } from '../../src/core/nmeaStore';

describe('PlaybackService', () => {
  beforeEach(() => {
    useNmeaStore.getState().reset();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should load sample file and emit sentences updating store', () => {
    const svc = new PlaybackService();
    const samplePath = 'vendor/sample-data/sample.nmea';
    svc.startPlayback(samplePath, { speed: 10, loop: false });

    // Advance timers enough to emit all 5 lines (baseInterval 1000 / speed 10 = 100ms)
    jest.advanceTimersByTime(600);

    const raw = useNmeaStore.getState().rawSentences;
    expect(raw.length).toBeGreaterThanOrEqual(1);
    // Expect speed field updated from GPVTG
    const speed = useNmeaStore.getState().nmeaData.speed;
    expect(speed).toBeCloseTo(5.5, 1);

    svc.stopPlayback();
  });
});
