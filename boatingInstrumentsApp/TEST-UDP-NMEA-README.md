# UDP NMEA Connection Test

Tests UDP connection to NMEA Bridge simulator and validates message reception.

## Industry Standard Ports

Based on research of marine WiFi bridge vendors and NMEA standards:

- **TCP: 2000** ✅ (SignalK, OpenCPN, Actisense NGT-1, Yacht Devices, most WiFi bridges)
- **UDP: 10110** ✅ (NMEA 0183 multicast standard - RFC 2030, OpenCPN default)
- **WebSocket: 8080** ✅ (SignalK, modern bridges)

## Usage

```bash
# Test with default settings (localhost:10110)
node test-udp-nmea.js

# Test specific host and port
node test-udp-nmea.js <host> <port>

# Examples
node test-udp-nmea.js 127.0.0.1 10110        # Industry standard port
node test-udp-nmea.js 192.168.1.100 2000     # Legacy port on remote host
node test-udp-nmea.js bridge.local 10110     # DNS hostname
```

## Prerequisites

1. **Start NMEA Bridge Simulator:**
   ```bash
   cd boatingInstrumentsApp
   node server/nmea-bridge.js --scenario ../marine-assets/test-scenarios/navigation/coastal-sailing.yml --loop
   ```

2. **Verify simulator is running:**
   - Should see: `UDP: localhost:10110 (NMEA 0183 standard)`

## What the Test Does

1. Creates UDP socket and binds to the specified port
2. Sends registration "PING" message to the NMEA bridge
3. Listens for incoming NMEA messages
4. Displays first 10 messages, then every 100th message
5. Shows message rate statistics
6. On Ctrl+C: Displays summary with message types and counts

## Expected Output

```
═══════════════════════════════════════════════════════════
🧪 UDP NMEA Bridge Connection Test
═══════════════════════════════════════════════════════════
📍 Target: 127.0.0.1:10110
⏰ Started: 2026-01-09T...

✅ UDP socket listening on 0.0.0.0:10110
📤 Sent registration ping to 127.0.0.1:10110
📡 Waiting for NMEA messages...

✅ First message received!
───────────────────────────────────────────────────────────
[1] 0.1s (10.0 msg/s) - $GPGGA,123456.000,4807.038,N,01131.000,E,1,08,0.9,545.4...
[2] 0.2s (10.0 msg/s) - $GPRMC,123456.000,A,4807.038,N,01131.000,E,022.4,084.4...
...
Press Ctrl+C to stop...
```

## Troubleshooting

### No messages received after 5 seconds

1. **Check if NMEA Bridge is running:**
   ```bash
   # Look for these lines in bridge output:
   ✅ UDP server listening on 0.0.0.0:10110
   ```

2. **Check port number:**
   - New default: 10110 (NMEA 0183 standard)
   - Old default: 2000 (if using older bridge version)

3. **Check firewall:**
   ```bash
   # macOS - allow Node.js to receive UDP
   sudo pfctl -d  # Disable firewall temporarily for testing
   ```

4. **Verify UDP socket is bound:**
   ```bash
   netstat -an | grep 10110
   # Should show: udp4       0      0  *.10110                *.*
   ```

### Messages received but wrong content

- Check `--bridge-mode` flag on simulator:
  - `nmea0183` - Text NMEA sentences (default)
  - `nmea2000` - Binary PGN frames
  - `hybrid` - Both formats

## Port Changes

**January 2026 Update:** Changed UDP default from 2000 to 10110 to match NMEA 0183 industry standard.

### References
- NMEA 0183 standard: UDP multicast port 10110
- OpenCPN default UDP port: 10110
- SignalK: TCP 2000, WS 8080
- Actisense NGT-1: TCP 2000
- Yacht Devices YDWG-02: TCP 2000, UDP 10110
