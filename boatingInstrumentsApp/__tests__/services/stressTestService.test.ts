import { StressTestService } from '@/services/stressTestService';
import { useNmeaStore } from '@/store/nmeaStore';

jest.useRealTimers();

describe('StressTestService', () => {
  let svc: StressTestService;

  beforeEach(() => {
    svc = new StressTestService();
    // reset store
    const state = useNmeaStore.getState();
    state.data = {} as any;
    state.rawSentences = [];
  });

  afterEach(() => {
    svc.stop();
  });

  it('emits NMEA sentences into the store and can be stopped', async () => {
    expect(svc.isStressTestActive()).toBe(false);
    svc.start(200); // 200 msg/sec for test
    expect(svc.isStressTestActive()).toBe(true);

    // wait a short while to accumulate some messages
    await new Promise((res) => setTimeout(res, 120));

    svc.stop();
    expect(svc.isStressTestActive()).toBe(false);

    const raw = useNmeaStore.getState().rawSentences;
    expect(raw.length).toBeGreaterThan(0);
    // At least one sentence should look like an NMEA sentence
    expect(raw[0].startsWith('$')).toBe(true);
  });
});
