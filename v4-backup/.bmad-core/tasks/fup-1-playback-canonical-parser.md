# Task: Wire playback through canonical parser (fup-1)

owner: dev
priority: high
story: 1.4

description: |
  Route playbackService output through the canonical parsing path used by the live
  NMEA connection (using `nmea-simple.parseNmeaSentence`) to ensure playback and
  live modes produce identical parsed outputs.

acceptance_criteria:
  - Playback sentences are parsed with the canonical parser before being applied to the store.
  - Parity unit/integration test exists that compares parsed outputs for a representative set of sample files.
  - No regressions in existing playback/integration tests.
