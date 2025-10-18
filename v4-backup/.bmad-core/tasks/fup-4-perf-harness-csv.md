# Task: Add formal perf harness with CSV sampling (fup-4)

owner: dev
priority: medium
story: 1.4

description: |
  Extend the bench to emit per-second CSV output and capture basic CPU/RSS metrics during runs.
  Provide scripts to run multiple target rates (e.g., 200/500/800/1000 msg/sec) and produce a CSV report.

acceptance_criteria:
  - Bench can run with `--csv <file>` to create a per-second CSV of messages processed and basic metrics.
  - Script `scripts/bench/run-matrix.sh` (or node equivalent) runs the matrix and produces a combined CSV.
  - Initial run added to story gate notes with results.
