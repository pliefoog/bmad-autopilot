# NMEA WebSocket Bridge Server

Bridge server that allows web browsers to receive NMEA data from WiFi bridges or recorded files.

## Features

✅ **Live WiFi Bridge Mode** - Connect to real NMEA WiFi bridge via TCP
✅ **File Playback Mode** - Stream NMEA data from recorded files
✅ **Configurable Rate** - Control playback speed (messages/second)
✅ **Loop Support** - Continuous playback for testing
✅ **Autopilot Commands** - Bi-directional communication (live mode) or simulation (file mode)
✅ **WebSocket API** - Standard WebSocket protocol for browser compatibility

---

## Quick Start

### Live Mode (Real WiFi Bridge)

```bash
node nmea-websocket-bridge-enhanced.js --live 192.168.1.10 10110
```

Connects to WiFi bridge at `192.168.1.10:10110` and forwards NMEA data to connected browsers.

### File Playback Mode

```bash
node nmea-websocket-bridge-enhanced.js --file ../vendor/sample-data/sailing-demo.nmea 10 true
```

Streams NMEA data from file at 10 messages/second with looping enabled.

---

## Usage

### Live WiFi Bridge Mode

```bash
node nmea-websocket-bridge-enhanced.js --live <host> <port>
```

**Arguments:**
- `<host>` - WiFi bridge IP address (e.g., `192.168.1.10`)
- `<port>` - WiFi bridge TCP port (e.g., `10110` or `2000`)

**Example:**
```bash
node nmea-websocket-bridge-enhanced.js --live 192.168.1.10 10110
```

**Output:**
```
🌐 Enhanced NMEA WebSocket Bridge Server
=========================================
Mode: Live WiFi Bridge
WebSocket Server: ws://localhost:8080
WiFi Bridge: 192.168.1.10:10110

✅ WebSocket server listening on port 8080
💡 Connect your web browser to: ws://localhost:8080

🔌 Connecting to WiFi bridge: 192.168.1.10:10110
✅ Connected to WiFi bridge
📱 Web client connected: ::ffff:127.0.0.1
📡 WiFi Bridge → Browser: $GPGGA,123519,4807.038,N,01131...
```

### File Playback Mode

```bash
node nmea-websocket-bridge-enhanced.js --file <path> [rate] [loop]
```

**Arguments:**
- `<path>` - Path to NMEA file (required)
- `[rate]` - Messages per second (default: `10`)
- `[loop]` - Loop playback `true`/`false` (default: `true`)

**Examples:**
```bash
# Basic playback (10 msg/sec, looping)
node nmea-websocket-bridge-enhanced.js --file ../vendor/sample-data/sailing-demo.nmea

# High-speed playback (100 msg/sec)
node nmea-websocket-bridge-enhanced.js --file ../vendor/sample-data/sailing-demo.nmea 100

# Play once without looping
node nmea-websocket-bridge-enhanced.js --file ../vendor/sample-data/sailing-demo.nmea 10 false

# Slow playback (1 msg/sec) for debugging
node nmea-websocket-bridge-enhanced.js --file ../vendor/sample-data/sailing-demo.nmea 1 true
```

**Output:**
```
🌐 Enhanced NMEA WebSocket Bridge Server
=========================================
Mode: File Playback
WebSocket Server: ws://localhost:8080
NMEA File: /path/to/sailing-demo.nmea
Playback Rate: 10 messages/second
Loop: Yes

✅ Loaded 32 NMEA sentences from file
📊 Sample: $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47

✅ WebSocket server listening on port 8080
💡 Connect your web browser to: ws://localhost:8080

▶️  Starting file playback...
📡 File → Browser [10/32]: $SDDBT,12.4,f,3.8,M,2.1,F*3A...
📡 File → Browser [20/32]: $WIMWV,046,R,12.9,N,A*29...
📡 File → Browser [30/32]: $VWVHW,,,048,M,5.9,N,10.9,K*51...
🔄 Looping playback...
```

---

## Sample NMEA Files

Located in `../vendor/sample-data/`:

### `sailing-demo.nmea`
- GPS position data
- Depth readings (12-16 feet)
- Wind data (10-15 knots, 38-47° apparent)
- Speed data (5-6 knots)
- Ideal for testing sailing widgets

### Creating Custom Files

Record NMEA data:
```bash
# From real WiFi bridge
nc 192.168.1.10 10110 > my-recording.nmea

# Or create manually
cat > custom.nmea << 'EOF'
$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
$SDDBT,12.4,f,3.8,M,2.1,F*3A
$WIMWV,045,R,12.5,N,A*27
EOF
```

---

## WebSocket API

Connect from browser:
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to bridge server');

  // Request connection/playback start
  ws.send(JSON.stringify({ type: 'connect' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'connection':
      console.log('Status:', data.status);
      break;

    case 'nmea':
      console.log('NMEA data:', data.data);
      // Parse and display NMEA sentence
      break;

    case 'error':
      console.error('Error:', data.message);
      break;
  }
};
```

### Client → Server Messages

**Connect:**
```json
{ "type": "connect" }
```

**Disconnect:**
```json
{ "type": "disconnect" }
```

**Playback Control (file mode only):**
```json
{ "type": "playback-control", "action": "pause" }
{ "type": "playback-control", "action": "resume" }
{ "type": "playback-control", "action": "restart" }
{ "type": "playback-control", "action": "seek", "position": 100 }
```

**Autopilot Command:**
```json
{ "type": "autopilot-command", "command": "$ECAPB,1*2D\r\n" }
```

### Server → Client Messages

**Connection Status:**
```json
{
  "type": "connection",
  "status": "connected",
  "mode": "file-playback",
  "file": "sailing-demo.nmea",
  "totalLines": 32,
  "rate": 10
}
```

**NMEA Data:**
```json
{
  "type": "nmea",
  "data": "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n",
  "timestamp": 1697234567890
}
```

**Error:**
```json
{
  "type": "error",
  "message": "Connection refused"
}
```

---

## Complete Workflow

### Terminal 1: Start Bridge Server

```bash
cd boatingInstrumentsApp/server

# File playback mode
node nmea-websocket-bridge-enhanced.js --file ../vendor/sample-data/sailing-demo.nmea 10 true
```

### Terminal 2: Start Web App

```bash
cd boatingInstrumentsApp
npm run web
```

Browser opens at `http://localhost:3000` and automatically connects to `ws://localhost:8080`.

---

## Troubleshooting

### "Error: File not found"
```bash
# Check file path is correct
ls ../vendor/sample-data/sailing-demo.nmea

# Use absolute path if needed
node nmea-websocket-bridge-enhanced.js --file /full/path/to/file.nmea
```

### "Port 8080 already in use"
```bash
# Kill existing process
lsof -ti:8080 | xargs kill -9

# Or edit server file to use different port
```

### "No data in browser"
```bash
# Check browser console for WebSocket errors
# Open DevTools → Console

# Verify server is running
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8080/
```

### Playback too fast/slow
```bash
# Adjust rate parameter
node nmea-websocket-bridge-enhanced.js --file file.nmea 5  # Slower (5 msg/sec)
node nmea-websocket-bridge-enhanced.js --file file.nmea 50 # Faster (50 msg/sec)
```

---

## Performance Notes

- **Low Rate (1-10 msg/sec):** Good for visual debugging
- **Medium Rate (10-50 msg/sec):** Realistic boat conditions
- **High Rate (100-500 msg/sec):** Stress testing (matches NMEA2000 CAN bus)
- **Memory:** ~1MB per 10,000 NMEA sentences loaded

---

## Development Tips

### Record Real NMEA Data

```bash
# Record from WiFi bridge
nc 192.168.1.10 10110 | tee recording-$(date +%Y%m%d-%H%M%S).nmea

# Stop with Ctrl+C when done
```

### Validate NMEA File

```bash
# Check sentence count
grep -c '^\$' sailing-demo.nmea

# View unique sentence types
grep '^\$' sailing-demo.nmea | cut -d',' -f1 | sort | uniq -c

# Validate checksums (basic check)
grep '^\$.*\*[0-9A-F]{2}$' sailing-demo.nmea
```

### Test Different Scenarios

```bash
# Calm conditions
node nmea-websocket-bridge-enhanced.js --file calm-sailing.nmea 5

# Rough conditions (high update rate)
node nmea-websocket-bridge-enhanced.js --file storm-data.nmea 50

# Autopilot testing
node nmea-websocket-bridge-enhanced.js --file autopilot-test.nmea 10
```

---

**Server Version:** 2.0 (Enhanced with File Playback)
**Last Updated:** 2025-10-12
**WebSocket Port:** 8080 (configurable in code)
