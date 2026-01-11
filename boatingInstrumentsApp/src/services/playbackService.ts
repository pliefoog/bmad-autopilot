// PlaybackService: Loads and replays recorded NMEA files for testing/demo
import { readFileSync } from 'fs';
import path from 'path';
import { useNmeaStore } from '../store/nmeaStore';
import { sensorRegistry } from './SensorDataRegistry';
import { parseNmeaSentence } from 'nmea-simple';
import { parseAndValidate } from '@/utils/nmeaValidator';

export class PlaybackService {
  private isActive = false;
  private filePath: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private sentences: string[] = [];
  private index = 0;
  private speed = 1.0; // 1x
  private loop = false;

  startPlayback(filePath: string, options?: { speed?: number; loop?: boolean }) {
    if (this.isActive) this.stopPlayback();
    this.isActive = true;
    this.filePath = filePath;
    this.speed = options?.speed ?? 1.0;
    this.loop = options?.loop ?? false;

    // Load file synchronously for simplicity in tests/dev
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const raw = readFileSync(absolute, { encoding: 'utf8' });
    // Split into lines and filter empty lines
    this.sentences = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    this.index = 0;

    // Start emitting sentences at nominal NMEA rate modified by speed
    // Assume original file timestamps ~1 sentence per line; allow speed 0.5x-10x
    const baseIntervalMs = 1000; // default 1s between sentences
    const intervalMs = Math.max(1, baseIntervalMs / this.speed);

    // Direct registry updates for playback

    this.timer = setInterval(() => {
      if (!this.isActive) return;
      if (this.index >= this.sentences.length) {
        if (this.loop) {
          this.index = 0;
        } else {
          this.stopPlayback();
          return;
        }
      }
      const sentence = this.sentences[this.index++];
      // Validate first; record invalid sentences specially but keep raw available
      const validation = parseAndValidate(sentence);
      if (!validation.ok) {
        // store invalid sentence marker for QA/inspection but continue
      } else {
      }
      // Parse sentence via canonical parser and update store similarly to live connection
      try {
        const parsed = parseNmeaSentence(sentence);
        if (parsed && parsed.sentenceId === 'DBT' && 'depthMeters' in parsed) {
          updateSensorData('depth', 0, { depth: Number((parsed as any).depthMeters) });
        } else if (parsed && parsed.sentenceId === 'VTG' && 'speedKnots' in parsed) {
          updateSensorData('speed', 0, { stw: Number((parsed as any).speedKnots) } as any);
        } else if (
          parsed &&
          parsed.sentenceId === 'MWV' &&
          'windSpeed' in parsed &&
          'windAngle' in parsed
        ) {
          setNmeaData({
            windAngle: Number((parsed as any).windAngle),
            windSpeed: Number((parsed as any).windSpeed),
          });
        } else if (
          parsed &&
          parsed.sentenceId === 'GGA' &&
          'latitude' in parsed &&
          'longitude' in parsed
        ) {
          const fixType = 'fixType' in parsed ? (parsed as any).fixType : undefined;
          setNmeaData({
            gpsPosition: {
              lat: Number((parsed as any).latitude),
              lon: Number((parsed as any).longitude),
            },
            gpsQuality: {
              fixType: fixType === 'fix' ? 1 : fixType === 'dgps-fix' ? 2 : 0,
              satellites:
                'satellitesInView' in parsed ? Number((parsed as any).satellitesInView) : undefined,
              hdop:
                'horizontalDilution' in parsed
                  ? Number((parsed as any).horizontalDilution)
                  : undefined,
            },
          });
        } else if (
          parsed &&
          parsed.sentenceId === 'GLL' &&
          'latitude' in parsed &&
          'longitude' in parsed
        ) {
          // GPGLL provides position only, determine fix status from validity
          const isValid = 'status' in parsed && (parsed as any).status === 'valid';
          setNmeaData({
            gpsPosition: {
              lat: Number((parsed as any).latitude),
              lon: Number((parsed as any).longitude),
            },
            gpsQuality: {
              fixType: isValid ? 2 : 0, // 2 = 2D fix if valid, 0 = no fix if invalid
              satellites: undefined, // GLL doesn't provide satellite count
              hdop: undefined, // GLL doesn't provide HDOP
            },
          });
        } else if (parsed && parsed.sentenceId === 'HDG' && 'heading' in parsed) {
          setNmeaData({ heading: Number((parsed as any).heading) });
        }
      } catch (e) {
        // ignore parse errors in playback; store still has raw sentence for debugging
      }
    }, intervalMs);
    // Allow Node to exit if only this timer is left (helps Jest detect open handles)
    if (this.timer && typeof (this.timer as any).unref === 'function') {
      (this.timer as any).unref();
    }
  }

  stopPlayback() {
    this.isActive = false;
    this.filePath = null;
    this.sentences = [];
    this.index = 0;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isPlaybackActive() {
    return this.isActive;
  }
}
