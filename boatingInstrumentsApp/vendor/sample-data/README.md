Sample NMEA files for testing

Files:
- gga.nmea — GGA sentences (GPS fix)
- vtg.nmea — VTG sentences (track and speed)
- dbt.nmea — DBT sentences (depth)
- mwv.nmea — MWV sentences (wind angle/speed)
- hdg.nmea — HDG sentences (heading)
- multi.nmea — Mixed sentence file covering multiple instruments
- high_density.nmea — Denser mixed file for stress/speed tests
- malformed_checksum.nmea — Sentences with invalid checksums for parser error tests
- truncated.nmea — Truncated/incomplete sentences to test robustness

Usage:
- Playback files are under `vendor/sample-data/` relative to project root.
- Use `PlaybackService.startPlayback('vendor/sample-data/<file>.nmea', {speed: <0.5-10>, loop: true|false})` to replay.
- Use these files in unit/integration tests to exercise parser and error handling.
