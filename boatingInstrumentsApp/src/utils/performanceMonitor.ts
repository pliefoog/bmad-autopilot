export class PerformanceMonitor {
  private count = 0;
  private startTs: number | null = null;

  start() {
    this.count = 0;
    this.startTs = Date.now();
  }

  record(n = 1) {
    this.count += n;
  }

  stop() {
    this.startTs = null;
  }

  getStats() {
    const now = Date.now();
    const duration = this.startTs ? (now - this.startTs) / 1000 : 0;
    const rate = duration > 0 ? this.count / duration : 0;
    return { count: this.count, duration, rate };
  }
}

export default PerformanceMonitor;
