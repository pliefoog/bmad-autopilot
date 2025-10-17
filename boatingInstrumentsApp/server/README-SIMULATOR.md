# Enhanced NMEA Bridge Simulator - Usage Guide

## Overview

The Enhanced NMEA Bridge Simulator is a comprehensive multi-protocol server that simulates marine WiFi bridge hardware for development and testing without requiring physical boat equipment.

## Features

- **Multi-Protocol Support**: TCP, UDP, and WebSocket servers running simultaneously
- **Bridge Mode Support**: NMEA 0183 and NMEA 2000 bridge simulation
- **Algorithmic Data Generation**: Realistic depth, speed, wind, and GPS data
- **Autopilot Control**: Bidirectional command processing for Raymarine autopilot systems
- **Scenario-Based Testing**: YAML-configured test scenarios
- **Performance Monitoring**: Real-time statistics and resource monitoring
- **Backward Compatibility**: Seamless integration with existing development workflows

## Quick Start

### Basic Usage

```bash
# Start simulator with default settings
node server/nmea-bridge-simulator.js

# Start with specific scenario
node server/nmea-bridge-simulator.js --scenario basic-navigation

# Start in NMEA 2000 bridge mode
node server/nmea-bridge-simulator.js --bridge-mode nmea2000
```

### Recording Playback Modes

```bash
# Global playback mode (default) - single timeline for all clients
node server/nmea-bridge-simulator.js --recording nmea_recording_20250720_003925.json

# Per-client playback mode - independent timeline for each client
node server/nmea-bridge-simulator.js --recording file.json --playback-mode per-client --loop
```

### Available Servers

- **TCP Server**: `localhost:2000` (WiFi bridge simulation)
- **UDP Server**: `localhost:2000` (high-frequency data)
- **WebSocket Server**: `ws://localhost:8080` (web browser compatibility)

## Usage Scenarios

### 1. Web Development

Perfect for developing and testing the web UI:

```bash
# Terminal 1: Start simulator
node server/nmea-bridge-simulator.js --scenario basic-navigation

# Terminal 2: Start web development server
npm run web
```

Access your app at `http://localhost:3000` with live NMEA data streaming.

### 2. Mobile Development (iOS/Android)

For React Native mobile development:

```bash
# Start simulator on your development machine
node server/nmea-bridge-simulator.js --bridge-mode nmea0183

# Your mobile app connects to your computer's IP:2000 via TCP
# Example: 192.168.1.100:2000
```

### 3. Autopilot Testing

Focus on autopilot control development:

```bash
# Start autopilot scenario
node server/nmea-bridge-simulator.js --scenario autopilot-engagement
```

## Bridge Modes

### NMEA 0183 Bridge Mode (Default)

Simulates traditional WiFi bridges that convert NMEA 2000 to NMEA 0183:

- **Instrument Data**: Standard NMEA 0183 sentences (DBT, VTG, MWV, GGA)
- **Autopilot Control**: NMEA 2000 PGNs encapsulated in `$PCDIN` sentences
- **Format**: `$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59`

### NMEA 2000 Bridge Mode

Simulates advanced bridges with native NMEA 2000 support:

- **All Data**: Native NMEA 2000 PGN messages
- **Autopilot Control**: Direct PGN communication
- **Format**: `PGN:126208,Data:1,180`

## Test Scenarios

### basic-navigation.yml

Standard marine navigation scenario:
- Depth: 15±5 feet sine wave
- Speed: 6±0.5 knots Gaussian distribution
- Wind: Random walk starting at 45°
- GPS: Realistic boat movement patterns
- Duration: 1 hour

### autopilot-engagement.yml

Autopilot testing scenario:
- Multiple phases: manual → autopilot → heading adjustments
- Realistic autopilot behavior simulation
- Command/response validation
- Duration: 30 minutes

## NMEA Data Generated

### Standard Sentences

- **$IIDBT**: Depth Below Transducer
- **$IIVTG**: Track Made Good and Speed Over Ground
- **$IIMWV**: Wind Speed and Angle
- **$IIGGA**: GPS Fix Data

### Autopilot Sentences

- **NMEA 0183 Mode**: `$PCDIN` encapsulated PGNs
- **NMEA 2000 Mode**: Native PGN messages

## Autopilot Commands

### Engagement Commands

```bash
# NMEA 0183 Mode
$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59  # Engage
$PCDIN,01F112,00,00,00,00,00,00,00,00*5A  # Disengage

# NMEA 2000 Mode
PGN:126208,Data:1    # Engage
PGN:126208,Data:0    # Disengage
```

### Heading Adjustments

```bash
# NMEA 0183 Mode
$PCDIN,01F113,00,01,00,00,00,00,00,00*5B  # +1 degree
$PCDIN,01F113,00,F6,00,00,00,00,00,00*5C  # -10 degrees

# NMEA 2000 Mode
PGN:126208,Data:+1   # +1 degree
PGN:126208,Data:-10  # -10 degrees
```

## Client Connection Examples

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

### WebSocket Client (Web)

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'nmea') {
    console.log('NMEA Data:', message.data);
  }
};

// Send autopilot command
ws.send(JSON.stringify({
  type: 'autopilot-command',
  command: '$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59'
}));
```

## Performance Characteristics

- **Message Rate**: 500+ messages/second sustained
- **Memory Usage**: <100MB for typical scenarios
- **CPU Usage**: <10% on modern development machines
- **Latency**: <1ms message dispatch
- **Concurrent Clients**: 50+ supported

## Monitoring and Debugging

### Real-time Statistics

The simulator provides continuous performance monitoring:

```
📊 Stats: 3 clients, 45 msg/s, 67MB RAM
```

### Autopilot State Tracking

Monitor autopilot commands and state changes:

```
🎮 Autopilot ENGAGED
🎮 Heading adjusted to 181°
```

### Client Connection Logging

Track client connections and disconnections:

```
📱 TCP client connected: tcp-192.168.1.100:12345
📱 WebSocket client connected: ws-192.168.1.100:54321
```

## Integration with Existing Workflows

### No Disruption to Current Development

The simulator is designed to enhance, not replace, your current development setup:

- **Web Development**: Continues to work with `npm run web`
- **Existing Tests**: All current tests continue to pass
- **Build Process**: No changes to build or deployment scripts

### Gradual Migration

You can switch between the original bridge and the enhanced simulator:

```bash
# Original bridge (still available)
node server/nmea-websocket-bridge.js

# Enhanced simulator (recommended)
node server/nmea-bridge-simulator.js
```

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
Error: EADDRINUSE: address already in use :::2000
```
Solution: Kill existing processes using the port or use different ports.

**WebSocket Connection Failed**
```bash
WebSocket connection to 'ws://localhost:8080/' failed
```
Solution: Ensure the simulator is running and WebSocket server is enabled.

**No NMEA Data Received**
```bash
TCP connection established but no data received
```
Solution: Check that data generation is started and client is properly connected.

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set environment variable for debug output
DEBUG=* node server/nmea-bridge-simulator.js
```

## Recording File Playback

### JSON Recording Format

The simulator supports high-fidelity recording playback with precise timing and two distinct playback modes:

#### Global Playback Mode (Default)
Single shared timeline for all clients - simulates real marine bridge behavior:

```bash
# Play recording with original timing (global mode)
node server/nmea-bridge-simulator.js --recording recordings/session.json

# Play compressed recording at 2x speed
node server/nmea-bridge-simulator.js --recording recordings/session.json.gz --speed 2.0

# Loop recording continuously
node server/nmea-bridge-simulator.js --recording recordings/session.json --loop
```

#### Per-Client Playback Mode
Independent timeline for each client - ideal for deterministic testing:

```bash
# Each client gets independent playback from the beginning
node server/nmea-bridge-simulator.js --recording file.json --playback-mode per-client

# Per-client mode with looping and speed control
node server/nmea-bridge-simulator.js --recording file.json --playbook-mode per-client --speed 3.0 --loop
```

**Mode Comparison:**
- **Global Mode**: Clients joining late miss early recording data (realistic marine bridge behavior)
- **Per-Client Mode**: Each client receives complete recording from start (deterministic testing)

### Recording File Format

```json
{
  "metadata": {
    "start_time": 1752964773.0942159,
    "end_time": 1752964823.527086,
    "duration": 50.43287014961243,
    "message_count": 799,
    "created": "2025-07-20T00:40:23.527089",
    "version": "1.0"
  },
  "messages": [
    {
      "timestamp": 1752964773.131632,
      "relative_time": 0.03741621971130371,
      "message": "$IIMWV,345.0,R,11.25,N,A*38",
      "sequence": 0
    }
  ]
}
```

### Playback Options

- **Timing Preservation**: Maintains original message intervals from real bridge
- **Speed Control**: 0.5x to 10x playback speed for testing scenarios
- **Compression Support**: Automatic .json.gz decompression
- **Loop Mode**: Continuous playback for long-running tests
- **Mixed Mode**: Recording + algorithmic data combination

## Advanced Configuration

### Custom Scenarios

Create scenarios using recordings or algorithmic data:

```yaml
name: "Custom Test Scenario"
description: "My specific testing requirements"
duration: 1800  # 30 minutes

# Option 1: Recording-based (recommended)
playback:
  mode: "recording"
  source: "recordings/my-session.json.gz"
  timing: "preserve"
  speed: 1.0
  loop: true

# Option 2: Algorithmic fallback
fallback:
  mode: "algorithmic"
  data:
    depth:
      type: "sine_wave"
      base: 20
      amplitude: 8
      frequency: 0.2
```

### Performance Tuning

Adjust message generation frequency:

```javascript
// In nmea-bridge-simulator.js
this.messageInterval = setInterval(() => {
  this.generateAndBroadcastNMEAData();
}, 50); // 20Hz instead of 10Hz
```

## API Reference

### Command Line Options

- `--scenario <name>`: Load specific test scenario
- `--bridge-mode <mode>`: Set bridge mode (nmea0183, nmea2000)
- `--recording <file>`: Play JSON recording file with precise timing
- `--speed <factor>`: Playback speed (0.5x to 10x), default: 1.0
- `--loop`: Loop recording continuously
- `--playback-mode <mode>`: Playback mode: 'global' (default) or 'per-client'
- `--help`: Show help message

### WebSocket Message Format

```javascript
// Incoming NMEA data
{
  "type": "nmea",
  "data": "$IIDBT,,f,15.0,M,8.2,F*5E\r\n",
  "timestamp": 1640995200000
}

// Autopilot status update
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

## Contributing

To contribute improvements to the simulator:

1. Add tests for new functionality
2. Ensure backward compatibility
3. Update documentation
4. Verify performance requirements are met

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review existing tests for usage examples
3. Examine scenario files for configuration options
4. Use debug mode for detailed logging