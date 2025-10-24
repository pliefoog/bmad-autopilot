import { useNmeaStore } from '../store/nmeaStore';

// StressTestService: Emits realistic NMEA sentence strings at high rates.
// Sentences are pushed into the store via addRawSentence so the normal
// parsing chain can be exercised by tests and performance runs.
export class StressTestService {
  private interval: NodeJS.Timeout | null = null;
  private active = false;
  private msgRate = 500;

  isStressTestActive() {
    return this.active;
  }

  start(rate: number = 500) {
    this.msgRate = rate;
    this.active = true;
    const addRawSentence = useNmeaStore.getState().addRawSentence;
    let count = 0;

    // Helper to create simple VTG and GGA sentences (checksum omitted for brevity)
    const makeVTG = (speedKn: number) => `$GPVTG,,T,,M,${speedKn.toFixed(1)},N,${(speedKn*1.852).toFixed(1)},K`;
    const makeGGA = (lat: number, lon: number) => {
      // Convert decimal degrees to NMEA ddmm.mmmm format (simple)
      const toNmea = (d: number, isLat: boolean) => {
        const abs = Math.abs(d);
        const degrees = Math.floor(abs);
        const minutes = (abs - degrees) * 60;
        if (isLat) {
          const dd = String(degrees).padStart(2,'0');
          return `${dd}${minutes.toFixed(4)}`;
        }
        const dd = String(degrees).padStart(3,'0');
        return `${dd}${minutes.toFixed(4)}`;
      };
      const latRaw = toNmea(lat, true);
      const latDir = lat >= 0 ? 'N' : 'S';
      const lonRaw = toNmea(lon, false);
      const lonDir = lon >= 0 ? 'E' : 'W';
      return `$GPGGA,000000,${latRaw},${latDir},${lonRaw},${lonDir},1,08,1.0,0.0,M,0.0,M,,`;
    };

    const intervalMs = Math.max(1, Math.floor(1000 / this.msgRate));
    this.interval = setInterval(() => {
      if (!this.active) return;
      const speed = Math.random() * 12; // knots
      const lat = 37 + Math.random() * 0.01;
      const lon = -122 + Math.random() * 0.01;
      // Alternate sentence types to exercise parser
      const sentence = (count % 3 === 0) ? makeGGA(lat, lon) : makeVTG(speed);
      addRawSentence(sentence);
      count++;
      if (count % 1000 === 0) {
        // Lightweight performance hook
        // eslint-disable-next-line no-console
        console.log(`[StressTest] Sent ${count} synthetic NMEA sentences`);
      }
    }, intervalMs);
    if (this.interval && typeof (this.interval as any).unref === 'function') {
      (this.interval as any).unref();
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.active = false;
  }
}

export default StressTestService;
