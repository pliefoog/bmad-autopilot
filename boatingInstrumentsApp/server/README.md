# NMEA Bridge - Unified Marine Testing Tool

Comprehensive multi-protocol server that supports live hardware connections, file playback, and scenario-based testing for marine NMEA development.

## Features

✅ **Live WiFi Bridge Mode** - Connect to real NMEA WiFi bridge via TCP  
✅ **File Playbook Mode** - Stream NMEA data from recorded files with precise timing  
✅ **Scenario Mode** - Generate synthetic NMEA data from predefined test scenarios  
✅ **Multi-Protocol Support** - TCP, UDP, and WebSocket servers running simultaneously  
✅ **Autopilot Control** - Bidirectional Raymarine autopilot command processing  
✅ **Performance Optimized** - 500+ msg/sec, <100MB RAM, <1ms latency  
✅ **Control API** - REST API on port 9090 for external tool integration  

---

## Quick Start

### Live Mode (Real WiFi Bridge)

```bash
node nmea-bridge.js --live 192.168.1.10 10110
```

Connects to WiFi bridge at `192.168.1.10:10110` and forwards NMEA data to connected browsers.

### File Playback Mode

```bash
node nmea-bridge.js --file ../vendor/sample-data/sailing-demo.nmea --rate 10 --loop
```

Streams NMEA data from file at 10 messages/second with looping enabled.

### Scenario Mode

```bash
node nmea-bridge.js --scenario basic-navigation --loop
```

Generates realistic marine data using the built-in basic navigation scenario.

---

## Usage

🌊 **Unified NMEA Bridge Tool v3.0**

### Live WiFi Bridge Mode

Connect to real NMEA WiFi bridge hardware:

```bash
node nmea-bridge.js --live <host> <port>
```

**Arguments:**
- `<host>` - WiFi bridge IP address (e.g., `192.168.1.10`)
- `<port>` - WiFi bridge TCP port (e.g., `10110` or `2000`)

**Example:**
```bash
node nmea-bridge.js --live 192.168.1.10 10110
```

**Output:**
```
🚀 Starting NMEA Bridge in live mode...
✅ NMEA Bridge ready!
📡 Mode: LIVE
🌐 Protocol Servers:
   • TCP: localhost:2000
   • UDP: localhost:2000
   • WebSocket: localhost:8080
� Control API: localhost:9090
```

### File Playback Mode

Stream NMEA data from recorded files with precise timing:

```bash
node nmea-bridge.js --file <path> [--rate <n>] [--loop]
```

**Arguments:**
- `<path>` - Path to NMEA file (required)
- `--rate <n>` - Messages per second (default: 10)
- `--loop` - Loop playback continuously

**Examples:**
```bash
# Basic playback (10 msg/sec, looping)
node nmea-bridge.js --file ../vendor/sample-data/sailing-demo.nmea --loop

# High-speed playback (100 msg/sec)
node nmea-bridge.js --file ../vendor/sample-data/sailing-demo.nmea --rate 100

# Slow playback (1 msg/sec) for debugging
node nmea-bridge.js --file ../vendor/sample-data/sailing-demo.nmea --rate 1
```

### Scenario Mode

Generate synthetic NMEA data using predefined test scenarios:

```bash
node nmea-bridge.js --scenario <name> [--loop] [--speed <n>]
```

**Arguments:**
- `<name>` - Scenario name (see Available Scenarios below)
- `--loop` - Loop scenario continuously
- `--speed <n>` - Simulation speed multiplier (default: 1.0)

**Examples:**
```bash
# Standard navigation data
node nmea-bridge.js --scenario basic-navigation --loop

# Realistic coastal sailing conditions  
node nmea-bridge.js --scenario coastal-sailing --loop

# Autopilot testing workflow
node nmea-bridge.js --scenario autopilot-engagement --speed 2.0
```

### Available Scenarios

**Built-in scenarios:**
- `basic-navigation` - Standard depth, speed, wind, and GPS data
- `coastal-sailing` - Realistic coastal sailing conditions  
- `autopilot-engagement` - Complete autopilot workflow

### Common Options

- `--verbose, -v` - Enable verbose logging
- `--quiet, -q` - Suppress status messages
- `--help, -h` - Show help message

### Protocol Servers

The unified tool provides multiple connection points:

- **TCP Server**: `localhost:2000` (WiFi bridge simulation)
- **UDP Server**: `localhost:2000` (high-frequency data streaming)
- **WebSocket Server**: `ws://localhost:8080` (web browser compatibility)  
- **Control API**: `http://localhost:9090` (REST API for automation)

---

## NMEA Data Generation

### Standard NMEA Sentences

The unified tool generates realistic marine data:

- **$IIDBT** - Depth Below Transducer (15±5 feet sine wave)
- **$IIVTG** - Track Made Good and Speed Over Ground (6±0.5 knots)
- **$IIMWV** - Wind Speed and Angle (random walk starting at 45°)
- **$IIGGA** - GPS Fix Data (realistic boat movement patterns)

### Autopilot Control

**NMEA 0183 Mode** (default):
- Format: `$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59`
- Encapsulates NMEA 2000 PGNs for compatibility

**NMEA 2000 Mode** (advanced):
- Format: Native PGN messages like `PGN:126208,Data:1,180`
- Direct NMEA 2000 communication

### Sample NMEA Files

Located in `../vendor/sample-data/`:

#### `sailing-demo.nmea`
- GPS position data
- Depth readings (12-16 feet)
- Wind data (10-15 knots, 38-47° apparent)
- Speed data (5-6 knots)
- Ideal for testing sailing widgets

### Creating Custom Files

Record NMEA data from real hardware:
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

## Client Connection Examples

### WebSocket Client (Web Browser)

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to NMEA Bridge');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'nmea':
      console.log('NMEA Data:', message.data);
      // Parse and display NMEA sentence
      break;
    
    case 'autopilot-status':
      console.log('Autopilot Update:', message.data);
      break;
      
    case 'error':
      console.error('Error:', message.message);
      break;
  }
};

// Send autopilot command
ws.send(JSON.stringify({
  type: 'autopilot-command',
  command: '$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59'
}));
```

### TCP Client (React Native)

```typescript
import TcpSocket from 'react-native-tcp-socket';

const client = TcpSocket.createConnection({
  port: 2000,
  host: '192.168.1.100', // Your development machine IP
});

client.on('data', (data) => {
  console.log('NMEA Data:', data.toString());
});

// Send autopilot command
client.write('$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59\r\n');
```

### WebSocket Message Formats

**Incoming NMEA Data:**
```json
{
  "type": "nmea",
  "data": "$IIDBT,,f,15.0,M,8.2,F*5E\r\n",
  "timestamp": 1640995200000
}
```

**Autopilot Status Updates:**
```json
{
  "type": "autopilot-status",
  "data": {
    "mode": "COMPASS",
    "engaged": true,
    "targetHeading": 180,
    "currentHeading": 179
  },
  "timestamp": 1640995200000
}
```

**Error Messages:**
```json
{
  "type": "error",
  "message": "Connection failed",
  "timestamp": 1640995200000
}
```

---

## Development Workflows

### Web Development

Perfect combination for React Native web development:

```bash
# Terminal 1: Start NMEA Bridge with realistic data
cd boatingInstrumentsApp/server
node nmea-bridge.js --scenario coastal-sailing --loop

# Terminal 2: Start web development server
cd boatingInstrumentsApp
npm run web
```

Browser opens at `http://localhost:8082` and automatically connects to `ws://localhost:8080`.

### Mobile Development (iOS/Android)

For React Native mobile development:

```bash
# Start NMEA Bridge on your development machine
node nmea-bridge.js --scenario basic-navigation --loop

# Your mobile app connects to your computer's IP:2000 via TCP
# Example: 192.168.1.100:2000
```

### Autopilot Testing

Focus on autopilot control development:

```bash
# Start autopilot scenario with realistic command sequences
node nmea-bridge.js --scenario autopilot-engagement --loop
```

### Hardware Integration Testing

Test with real WiFi bridge hardware:

```bash
# Connect to actual marine WiFi bridge
node nmea-bridge.js --live 192.168.1.10 10110
```

---

## Troubleshooting

### Common Issues

**"Error: EADDRINUSE: address already in use"**
```bash
# Kill existing processes using the ports
lsof -ti:2000,8080,9090 | xargs kill -9

# Or check what's using the ports
lsof -i :2000
lsof -i :8080  
lsof -i :9090
```

**"WebSocket connection failed"**
```bash
# Verify NMEA Bridge is running
curl http://localhost:9090/api/health

# Check WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8080/
```

**"No NMEA data received"**
```bash
# Check if data generation is active
curl http://localhost:9090/api/status

# Enable verbose logging for debugging
node nmea-bridge.js --scenario basic-navigation --verbose
```

**"Scenario not found"**
```bash
# List available scenarios
node nmea-bridge.js --help

# Check for custom scenario files
ls scenarios/
```

### Debug Mode

Enable detailed logging for comprehensive troubleshooting:

```bash
# Verbose mode shows all internal operations
node nmea-bridge.js --scenario basic-navigation --verbose

# Quiet mode suppresses status messages (useful for scripting)
node nmea-bridge.js --scenario basic-navigation --quiet
```

---

## Performance Characteristics

The unified NMEA Bridge is optimized for high-performance marine development:

- **Message Rate**: 500+ messages/second sustained
- **Memory Usage**: <100MB for typical scenarios
- **CPU Usage**: <10% on modern development machines  
- **Latency**: <1ms message dispatch
- **Concurrent Clients**: 50+ supported across all protocols

### Performance Guidelines

- **Low Rate (1-10 msg/sec):** Good for visual debugging and step-through testing
- **Medium Rate (10-50 msg/sec):** Realistic boat conditions and normal development
- **High Rate (100-500 msg/sec):** Stress testing and NMEA2000 CAN bus simulation
- **Memory**: ~1MB per 10,000 NMEA sentences for file mode

---

## Simulator Control API

The unified tool provides a comprehensive REST API for external tool integration:

### Base URL: `http://localhost:9090`

**Health Check:**
```bash
curl http://localhost:9090/api/health
```

**Status Information:**
```bash
curl http://localhost:9090/api/status
```

**Available Scenarios:**
```bash
curl http://localhost:9090/api/scenarios/
```

**Inject Custom Data:**
```bash
curl -X POST http://localhost:9090/api/inject-data \
  -H "Content-Type: application/json" \
  -d '{"message": "$IIDBT,15.0,f,4.6,M,2.5,F*3A"}'
```

**Simulate Error Conditions:**
```bash
curl -X POST http://localhost:9090/api/simulate-error \
  -H "Content-Type: application/json" \
  -d '{"type": "connection-loss", "duration": 5000}'
```

### API Documentation

Complete OpenAPI 3.0.3 specification available at:
- **Specification File**: [`openapi.yaml`](./openapi.yaml)
- **13 REST Endpoints** with comprehensive examples
- **External Integration Support** for automation tools

---

## Development Tips

### Record Real NMEA Data

```bash
# Record from WiFi bridge with timestamp
nc 192.168.1.10 10110 | tee recording-$(date +%Y%m%d-%H%M%S).nmea

# Stop with Ctrl+C when done
```

### Validate NMEA Files

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
# Calm conditions - low frequency data
node nmea-bridge.js --scenario basic-navigation --speed 0.5

# Rough conditions - high update rate
node nmea-bridge.js --scenario coastal-sailing --speed 2.0

# Autopilot workflow testing
node nmea-bridge.js --scenario autopilot-engagement --loop
```

---

## Integration with Development Tools

### VS Code Tasks

Use the predefined VS Code tasks for streamlined development:

- `Ctrl+Shift+P` → `Tasks: Run Task` → `Start NMEA Bridge: Scenario - Basic Navigation`
- `Ctrl+Shift+P` → `Tasks: Run Task` → `Start NMEA Bridge: Live Mode - Hardware Connection`
- `Ctrl+Shift+P` → `Tasks: Run Task` → `Start Full Web Development Stack`

### No Disruption to Current Workflows

The unified tool enhances existing development without breaking changes:

- **Web Development**: Continues to work with `npm run web`
- **Existing Tests**: All current tests continue to pass
- **Build Process**: No changes to build or deployment scripts

---

**Tool Version:** 3.0 (Epic 10.3 - Unified CLI)  
**Last Updated:** 2025-10-27  
**Architecture**: [Epic 10.1/10.2 Modular Components](../../docs/nmea-bridge-simulator-architecture.md)  
**API Reference**: [`openapi.yaml`](./openapi.yaml)
