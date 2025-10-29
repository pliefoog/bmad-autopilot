import { PlaybackService } from '@/services/playbackService';
import { useNmeaStore } from '@/store/nmeaStore';
import { parseNmeaSentence } from 'nmea-simple';
import fs from 'fs';
import path from 'path';

jest.useRealTimers();

function applyParsedToData(parsed: any, data: any) {
  // mimic NmeaConnectionManager mapping logic
  if (!parsed) return;
  if (parsed.sentenceId === 'DBT' && 'depthMeters' in parsed) {
    data.depth = Number(parsed.depthMeters);
  } else if (parsed.sentenceId === 'VTG' && 'speedKnots' in parsed) {
    data.speed = Number(parsed.speedKnots);
  } else if (parsed.sentenceId === 'MWV' && 'windSpeed' in parsed && 'windAngle' in parsed) {
    data.windAngle = Number(parsed.windAngle);
    data.windSpeed = Number(parsed.windSpeed);
  } else if (parsed.sentenceId === 'GGA' && 'latitude' in parsed && 'longitude' in parsed) {
    data.gpsPosition = { lat: Number(parsed.latitude), lon: Number(parsed.longitude) };
    const fixType = 'fixType' in parsed ? parsed.fixType : undefined;
    data.gpsQuality = {
      fixType: fixType === 'fix' ? 1 : fixType === 'dgps-fix' ? 2 : 0,
      satellites: 'satellitesInView' in parsed ? Number(parsed.satellitesInView) : undefined,
      hdop: 'horizontalDilution' in parsed ? Number(parsed.horizontalDilution) : undefined,
    };
  } else if (parsed.sentenceId === 'HDG' && 'heading' in parsed) {
    data.heading = Number(parsed.heading);
  }
}

describe('Playback parity', () => {
  it('playback produces same nmeaData as canonical parser for sample file', async () => {
    const svc = new PlaybackService();
    // reset store
    const store = useNmeaStore.getState();
    store.reset();

    const samplePath = path.join(process.cwd(), 'vendor', 'sample-data', 'sample.nmea');
    const raw = fs.readFileSync(samplePath, { encoding: 'utf8' });
    const sentences = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    // Build expected data by parsing sentences directly
    const expected: any = {};
    for (const s of sentences) {
      try {
        const p = parseNmeaSentence(s);
        applyParsedToData(p, expected);
      } catch (e) {
        // ignore parse errors in expected build (playback may also ignore)
      }
    }

    // Start playback fast so test runs quickly
    svc.startPlayback('vendor/sample-data/sample.nmea', { speed: 10, loop: false });
    // wait enough time for all sentences to emit (interval base 1s / speed)
    const waitMs = Math.max(2000, Math.ceil(sentences.length * 1000 / 10) + 200);
    await new Promise(res => setTimeout(res, waitMs));
    svc.stopPlayback();

    const actual = useNmeaStore.getState().nmeaData as any;

    // Compare expected and actual for keys present in expected
    for (const key of Object.keys(expected)) {
      const exp = expected[key];
      const act = actual[key];
      if (typeof exp === 'number') {
        expect(typeof act).toBe('number');
        // allow small tolerance
        expect(Math.abs(act - exp)).toBeLessThan(1e-3);
      } else if (typeof exp === 'object') {
        expect(act).toBeDefined();
        // shallow compare numeric fields
        for (const sub of Object.keys(exp)) {
          if (typeof exp[sub] === 'number') {
            expect(Math.abs(act[sub] - exp[sub])).toBeLessThan(1e-3);
          } else {
            expect(act[sub]).toEqual(exp[sub]);
          }
        }
      } else {
        expect(act).toEqual(exp);
      }
    }
  }, 20000);
});
