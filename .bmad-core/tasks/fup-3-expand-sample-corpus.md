# Task: Expand sample data set (fup-3)

owner: dev
priority: medium
story: 1.4

description: |
  Add timestamped logs, instrument-specific recordings, and additional malformed variants
  under `vendor/sample-data/` to improve test coverage for parsing and validation.

acceptance_criteria:
  - At least 5 new sample files added (including timestamped and malformed variants).
  - Each new file referenced in a unit/integration test to ensure parser behavior.
