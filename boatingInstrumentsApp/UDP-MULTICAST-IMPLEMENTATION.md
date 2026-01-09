# UDP Multicast Implementation (Industry Standard)

## Overview

Implemented **NMEA 0183 industry-standard UDP multicast** across the entire stack:
- NMEA Bridge Simulator (server)
- React Native App (client)
- Test utilities

This replaces the previous non-standard unicast UDP implementation that required client registration.

## Industry Standard: NMEA 0183 UDP Multicast

**Multicast Address:** `239.2.1.1`  
**Port:** `10110`  
**Protocol:** UDP IPv4  
**Standard:** NMEA 0183 Amendment 3.01

### How UDP Multicast Works

```
Server (NMEA Bridge)
┌─────────────────────────────────────────────┐
│ Broadcasts to 239.2.1.1:10110              │
│ (multicast group)                           │
└──────────────────┬──────────────────────────┘
                   │
                   │ Network delivers to all group members
                   ▼
        Multicast Group 239.2.1.1
                   │
    ┌──────────────┼──────────────┬────────────┐
    ▼              ▼              ▼            ▼
 Client 1       Client 2      Client 3    Client N
 (joins         (joins        (joins      (joins
 multicast)     multicast)    multicast)  multicast)
```

**Key Concepts:**
- **Server**: Sends packets to multicast address (broadcast)
- **Clients**: Join multicast group to receive packets
- **No registration**: Clients automatically receive data
- **No tracking**: Server doesn't maintain client list
- **Standard across industry**: OpenCPN, SignalK, Yacht Devices, WiFi NMEA bridges

## Changes Made

### 1. NMEA Bridge Server (`server/lib/protocol-servers.js`)

**Before (Non-Standard Unicast):**
```javascript
// Tracked individual UDP clients
handleUDPMessage(message, remote) {
  clients.set(clientId, { type: 'udp', remote });
}

// Sent to each registered client
broadcast() {
  clients.forEach(client => {
    if (client.type === 'udp') {
      udpServer.send(message, client.remote.port, client.remote.address);
    }
  });
}
```

**After (Standard Multicast):**
```javascript
// No client tracking needed

// Send to multicast address - all subscribers receive
const NMEA_MULTICAST_ADDR = '239.2.1.1';
const NMEA_MULTICAST_PORT = 10110;

broadcast() {
  this.udpServer.send(message, NMEA_MULTICAST_PORT, NMEA_MULTICAST_ADDR);
}
```

### 2. React Native App (`src/services/nmea/connection/PureConnectionManager.ts`)

**Before (Registration Ping):**
```typescript
// Sent ping to register with server
socket.bind(config.port);
socket.send('PING\r\n', config.port, config.ip);
```

**After (Join Multicast Group):**
```typescript
// Join multicast group to receive broadcasts
const NMEA_MULTICAST_ADDR = '239.2.1.1';
const NMEA_MULTICAST_PORT = 10110;

socket.bind(NMEA_MULTICAST_PORT);
socket.addMembership(NMEA_MULTICAST_ADDR);  // Subscribe to multicast
```

### 3. Test Script (`test-udp-nmea.js`)

**Before:**
- Bound to random port
- Sent registration ping
- Received unicast responses

**After:**
- Binds to multicast port 10110
- Joins multicast group 239.2.1.1
- Receives multicast broadcasts

## Testing

### Start NMEA Bridge
```bash
cd boatingInstrumentsApp
node server/nmea-bridge.js --scenario ../marine-assets/test-scenarios/navigation/coastal-sailing.yml --loop
```

### Test UDP Multicast
```bash
cd boatingInstrumentsApp
node test-udp-nmea.js
```

**Expected Output:**
```
═══════════════════════════════════════════════════════════
🧪 UDP NMEA Multicast Test (Industry Standard)
═══════════════════════════════════════════════════════════
📍 Multicast Group: 239.2.1.1:10110
📡 Protocol: NMEA 0183 Amendment 3.01 UDP Multicast
⏰ Started: 2026-01-09T...

✅ UDP socket bound to port 10110
✅ Joined multicast group 239.2.1.1
📡 Waiting for NMEA multicast messages...
   (No registration needed - multicast delivers to all group members)

✅ First message received!
───────────────────────────────────────────────────────────
[1] 0.1s (32.1 msg/s) - $IIXDR,P,101325,P,BARO,C,22.5,C,CABTEMP*45
```

### App Connection

In ConnectionConfigDialog:
1. Select "UDP" protocol
2. Connection automatically uses multicast (hardcoded)
3. No configuration needed - industry standard

## Advantages of Multicast

✅ **Industry Standard**: Matches real marine electronics  
✅ **Simpler Code**: No client tracking or registration logic  
✅ **More Clients**: Unlimited clients can join multicast group  
✅ **Better Performance**: Single send operation, not N unicast sends  
✅ **Auto-Discovery**: Clients automatically receive data when they join  
✅ **Resilient**: No client state to maintain or clean up

## Network Requirements

**Multicast Must Be Supported:**
- Local networks (LAN, WiFi) - ✅ Usually works
- Docker containers - ⚠️ Requires `--network host` or custom config
- Virtual machines - ⚠️ May need bridged networking
- VPNs - ❌ Often blocked
- Internet/WAN - ❌ Not routable beyond LAN

**Firewall Rules:**
- Allow UDP outbound to 239.2.1.1:10110
- Allow UDP inbound from 239.2.1.1:10110
- Some firewalls require explicit multicast rules

## Debugging Multicast

### Check if multicast packets are being sent:
```bash
# Mac/Linux
sudo tcpdump -i any host 239.2.1.1

# Expected output:
# IP 192.168.1.100.12345 > 239.2.1.1.10110: UDP, length 65
```

### Check multicast routing:
```bash
# Mac
netstat -g

# Linux
ip maddr show
```

### Common Issues

**No messages received:**
1. Firewall blocking multicast
2. Network interface doesn't support multicast
3. NMEA Bridge not running
4. Wrong network interface selected (VPN, VM, Docker)

**Works on localhost, not on network:**
- Multicast TTL too low (should be 128)
- Router blocking multicast packets
- IGMP snooping on switch

## References

- **NMEA 0183 Amendment 3.01** - UDP Multicast specification
- **RFC 1112** - Host Extensions for IP Multicasting
- **OpenCPN Documentation** - UDP multicast configuration
- **SignalK Specification** - UDP data sources
- **Yacht Devices YDWG-02** - Uses 239.2.1.1:10110

## Migration Notes

**Breaking Change:** Existing UDP configurations will automatically use multicast.

**Old Behavior:** App sent ping to register with specific server IP/port  
**New Behavior:** App joins multicast group (ignores IP in config)

**Compatibility:** TCP and WebSocket protocols unchanged.
