import PerformanceMonitor from '../../src/utils/performanceMonitor';

describe('PerformanceMonitor', () => {
  it('records counts and computes rate', () => {
    const m = new PerformanceMonitor();
    m.start();
    m.record(50);
    // wait a bit using fake timers
    jest.useFakeTimers();
    jest.advanceTimersByTime(1000);
    const stats = m.getStats();
    expect(stats.count).toBe(50);
    // rate should be >= 0
    expect(stats.rate).toBeGreaterThanOrEqual(0);
    jest.useRealTimers();
  });
});
