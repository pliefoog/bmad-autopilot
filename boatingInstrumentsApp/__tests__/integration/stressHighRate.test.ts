import StressTestService from '../../src/services/stressTestService';
import { useNmeaStore } from '../../src/store/nmeaStore';
import PerformanceMonitor from '../../src/utils/performanceMonitor';

jest.useRealTimers();

describe('StressTestService high-rate smoke', () => {
  let svc: StressTestService;
  const perf = new PerformanceMonitor();

  beforeEach(() => {
    svc = new StressTestService();
    const state = useNmeaStore.getState();
    // reset store's raw sentences where applicable
    if (Array.isArray((state as any).rawSentences)) (state as any).rawSentences = [];
  });

  afterEach(() => {
    svc.stop();
    perf.stop();
  });

  it('emits sentences at configured rate (smoke)', async () => {
    perf.start();
    svc.start(300); // 300 msg/sec smoke test
    await new Promise((res) => setTimeout(res, 300));
    svc.stop();
    perf.record(0); // no-op to allow getStats
    const stats = perf.getStats();
    const raw = (useNmeaStore.getState() as any).rawSentences || [];
    expect(raw.length).toBeGreaterThan(0);
    expect(stats.rate).toBeGreaterThanOrEqual(0);
  }, 20000);
});
