Testing & dev scripts

Quick commands (run from `boatingInstrumentsApp`):

# Run unit tests
npm test

# Run integration tests (all)
npm run test:integration

# Run specific integration tests
npm run test:integration:connection
npm run test:integration:malformed

# Run mock server validation test (single test)
![CI - Fast Tests](https://github.com/%REPO_OWNER%/%REPO_NAME%/actions/workflows/ci-fast.yml/badge.svg)

Testing & dev scripts

Quick commands (run from `boatingInstrumentsApp`):

# Run unit tests
npm test

# Run integration tests (all)
npm run test:integration

# Run specific integration tests
npm run test:integration:connection
npm run test:integration:malformed

# Run mock server validation test (single test)
npm run dev:mock

# Run the parser bench (node script)
# Usage: npm run dev:bench -- <file> <rate> <duration>
# Example: npm run dev:bench -- vendor/sample-data/high_density.nmea 500 5
npm run dev:bench -- vendor/sample-data/high_density.nmea 500 5

# Notes
- The bench script uses `nmea-simple` to parse sentences at a target rate and prints basic stats to console.
- Mock server and playback are designed for developer use only (not production). Use sample files in `vendor/sample-data/`.

# CI & new tests
- The repository CI runs the Jest test suite for `boatingInstrumentsApp` (unit + integration). Recent additions include:
  - `__tests__/services/stopPlayback.test.ts` — verifies `PlaybackService.stopPlayback()` clears timers and stops emissions.
  - `__tests__/integration/playbackUi.test.tsx` — verifies playback start and streaming updates the store.
  - `__tests__/integration/modeToggleWidgets.test.tsx` — verifies switching between playback and live modes updates widgets and prevents stale state.

Run the full test suite locally to mirror CI:
```bash
npm test
```

Fast CI checks (run during PRs):
```bash
npm run test:ci-fast
```
