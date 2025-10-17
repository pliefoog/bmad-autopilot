import net from 'net';
import fs from 'fs';
import path from 'path';
import { parseAndValidate } from '@/utils/nmeaValidator';

export class MockServer {
  private server: net.Server | null = null;
  private interval: NodeJS.Timeout | null = null;
  private sentences: string[] = [];
  private invalidSentences: string[] = [];

  start(port = 10110, filePath?: string, rate = 50) {
    if (filePath) {
      const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      const raw = fs.readFileSync(absolute, { encoding: 'utf8' });
      this.sentences = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      // Pre-scan loaded sentences to record invalid ones for testing/inspection
      try {
        this.invalidSentences = this.sentences.filter(s => !parseAndValidate(s).ok);
      } catch (e) {
        this.invalidSentences = [];
      }
    }

    this.server = net.createServer((socket) => {
      let idx = 0;
      const perSocketInterval = setInterval(() => {
        if (this.sentences.length === 0) return;
        const line = this.sentences[idx++ % this.sentences.length];
        // Validate before sending; record invalid sentences and send INVALID: prefix for tests
        const validation = parseAndValidate(line);
        if (!validation.ok) {
          this.invalidSentences.push(line);
          socket.write(`INVALID:${line}\r\n`);
        } else {
          socket.write(line + '\r\n');
        }
      }, Math.max(1, 1000 / rate));
      // allow node to exit if this is the only handle
      if (typeof (perSocketInterval as any).unref === 'function') {
        (perSocketInterval as any).unref();
      }

      socket.on('error', () => {});
      socket.on('close', () => {
        try { clearInterval(perSocketInterval); } catch (e) {}
      });
    });

    this.server.listen(port);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.server) {
      try {
        // destroy any open connections by closing the server and its sockets
        this.server.getConnections((_, sockets) => {
          // no-op: getConnections requires callback but server.close will handle
        });
        try { this.server.close(); } catch (e) {}
        if (typeof (this.server as any).unref === 'function') {
          (this.server as any).unref();
        }
      } catch (e) {}
      this.server = null;
    }
  }

  getInvalidSentences() {
    return this.invalidSentences.slice();
  }
}

export default MockServer;
