# Task: Add intermittent-disconnect integration tests (fup-2)

owner: qa/dev
priority: high
story: 1.4

description: |
  Add deterministic integration tests that simulate server restarts and socket closes
  to verify the `NmeaConnectionManager` (or equivalent) correctly reconnects and recovers state.

acceptance_criteria:
  - Tests simulate a mock server that closes connections mid-stream and restarts.
  - Connection manager reconnects automatically and resumes data ingestion.
  - Tests assert no resource leaks (sockets/timers) after reconnect.
