import fs from 'fs';
import { PlaybackService } from '../../src/services/playbackService';
import { useNmeaStore } from '../../src/core/nmeaStore';

describe('PlaybackService stopPlayback', () => {
  const sample = '$GPVTG,120.5,T,,M,5.2,N,9.6,K,A*3E\r\n$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n';

  beforeEach(() => {
    jest.useFakeTimers();
    useNmeaStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    useNmeaStore.getState().reset();
  });

  it('stops emitting sentences after stopPlayback is called', () => {
    // Mock readFileSync to return our sample sentences
    const readMock = jest.spyOn(fs, 'readFileSync' as any).mockImplementation(() => sample as any);

    const svc = new PlaybackService();

    // Spy on addRawSentence to count emissions
    const addRaw = useNmeaStore.getState().addRawSentence;
    const addSpy = jest.spyOn(useNmeaStore.getState(), 'addRawSentence');

    svc.startPlayback('demo.nmea', { speed: 1 });
    expect(svc.isPlaybackActive()).toBe(true);

    // Advance one interval (1000ms) - should emit at least one sentence
    jest.advanceTimersByTime(1100);
    expect(addSpy).toHaveBeenCalled();
    const callsBeforeStop = addSpy.mock.calls.length;

    // Now stop playback
    svc.stopPlayback();
    expect(svc.isPlaybackActive()).toBe(false);

    // Advance more time - no new calls should be made
    jest.advanceTimersByTime(5000);
    const callsAfter = addSpy.mock.calls.length;
    expect(callsAfter).toBe(callsBeforeStop);

    // Cleanup
    readMock.mockRestore();
    addSpy.mockRestore();
  });
});
