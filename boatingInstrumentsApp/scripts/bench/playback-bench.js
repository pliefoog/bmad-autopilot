#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseNmeaSentence } = require('nmea-simple');

// CLI: node playback-bench.js <file> <rate> <durationSec> [--csv out.csv] [--sampleMs 500]
const argv = process.argv.slice(2);
const file = argv[0] || path.join(process.cwd(), 'vendor', 'sample-data', 'high_density.nmea');
const rate = Number(argv[1]) || 500;
const durationSec = Number(argv[2]) || 5;
let csvPath = null;
let sampleMs = 500;

// parse optional flags
for (let i = 3; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--csv' && argv[i + 1]) {
    csvPath = argv[++i];
  } else if (a === '--sampleMs' && argv[i + 1]) {
    sampleMs = Number(argv[++i]);
  }
}

const raw = fs
  .readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

console.log(
  `Bench: file=${file} rate=${rate} msg/sec duration=${durationSec}s lines=${raw.length} csv=${
    csvPath || 'none'
  } sampleMs=${sampleMs}`,
);

let count = 0;
let idx = 0;
const intervalMs = Math.max(1, 1000 / rate);

// Sampling state
const samples = [];
let lastCpu = process.cpuUsage();
let lastTime = Date.now();

const sendInterval = setInterval(() => {
  const s = raw[idx++ % raw.length];
  try {
    parseNmeaSentence(s);
  } catch (e) {}
  count++;
}, intervalMs);

const sampleTimer = setInterval(() => {
  const now = Date.now();
  const cpu = process.cpuUsage(lastCpu);
  const mem = process.memoryUsage();
  const deltaMs = now - lastTime;
  const cpuUserMs = cpu.user / 1000; // microseconds -> ms
  const cpuSystemMs = cpu.system / 1000;
  samples.push({
    ts: new Date().toISOString(),
    deltaMs,
    cpuUserMs,
    cpuSystemMs,
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    count,
  });
  lastCpu = process.cpuUsage();
  lastTime = now;
}, sampleMs);

setTimeout(() => {
  clearInterval(sendInterval);
  clearInterval(sampleTimer);
  const rateObserved = count / durationSec;
  const summary = { count, duration: durationSec, rate: rateObserved };
  console.log('Bench result:', summary);
  if (csvPath) {
    const header = 'ts,deltaMs,cpuUserMs,cpuSystemMs,rss,heapUsed,heapTotal,count\n';
    const rows = samples
      .map(
        (s) =>
          `${s.ts},${s.deltaMs},${s.cpuUserMs},${s.cpuSystemMs},${s.rss},${s.heapUsed},${s.heapTotal},${s.count}`,
      )
      .join('\n');
    try {
      fs.writeFileSync(csvPath, header + rows);
      console.log('Wrote CSV to', csvPath);
    } catch (e) {
      console.warn('CSV write failed', e.message);
    }
  }
  process.exit(0);
}, durationSec * 1000);
