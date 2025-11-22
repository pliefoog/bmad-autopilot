# Complete Web Browser + WiFi Bridge Setup

## Current Status ✅

You can now run the app in a web browser for **UI validation**:

```bash
npm run web
```

This shows the full UI but native features (NMEA connection, file system) are mocked.

---

## Connecting to Real WiFi Bridge from Browser

Browsers **cannot** directly connect to TCP/UDP sockets (security restriction).

**Solution:** Use the WebSocket bridge server I created.

### Architecture

```
Browser ←→ WebSocket (ws://localhost:8080) ←→ Node.js Bridge ←→ TCP (WiFi Bridge)
```

### Step 1: Update Your Web App to Use WebSocket

Create `src/services/webSocketConnection.web.ts`:

```typescript
// Web-specific NMEA connection using WebSocket
export class WebSocketNMEAConnection {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private onData: (data: string) => void,
    private onStatusChange: (status: string) => void
  ) {}

  connect() {
    try {
      this.ws = new WebSocket('ws://localhost:8080');

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to bridge server');
        this.onStatusChange('connected');

        // Request connection to WiFi bridge
        this.ws?.send(JSON.stringify({ type: 'connect' }));
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'nmea':
            // NMEA data from WiFi bridge
            this.onData(data.data);
            break;

          case 'connection':
            this.onStatusChange(data.status);
            break;

          case 'error':
            console.error('[WebSocket] Error:', data.message);
            this.onStatusChange('error');
            break;
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.onStatusChange('error');
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        this.onStatusChange('disconnected');

        // Auto-reconnect after 5 seconds
        this.reconnectTimer = setTimeout(() => {
          console.log('[WebSocket] Reconnecting...');
          this.connect();
        }, 5000);
      };

    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.onStatusChange('error');
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'disconnect' }));
      this.ws.close();
      this.ws = null;
    }
  }

  sendAutopilotCommand(command: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'autopilot-command',
        command: command,
      }));
    } else {
      console.error('[WebSocket] Cannot send command - not connected');
    }
  }
}
```

### Step 2: Use Platform-Specific Connection

Update `src/mobile/App.tsx` to detect web platform:

```typescript
import { Platform } from 'react-native';
import { NMEAConnection } from '../services/nmeaConnection'; // Native
import { WebSocketNMEAConnection } from '../services/webSocketConnection.web'; // Web

const App = () => {
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    // Use different connection based on platform
    if (Platform.OS === 'web') {
      const webConn = new WebSocketNMEAConnection(
        (data) => {
          // Handle NMEA data
          useNmeaStore.getState().parseNmeaData(data);
        },
        (status) => {
          // Handle connection status
          useNmeaStore.getState().setConnectionStatus(status);
        }
      );
      webConn.connect();
      setConnection(webConn);
    } else {
      // Native TCP connection for iOS/Android
      const nativeConn = new NMEAConnection(ip, port);
      nativeConn.connect();
      setConnection(nativeConn);
    }
  }, []);

  // ... rest of app
};
```

### Step 3: Start the Bridge Server

In **Terminal 1** (Bridge Server):
```bash
cd boatingInstrumentsApp
node server/nmea-websocket-bridge.js 192.168.1.10 10110
```

Expected output:
```
🌐 NMEA WebSocket Bridge Server
================================
WebSocket Server: ws://localhost:8080
WiFi Bridge: 192.168.1.10:10110

✅ WebSocket server listening on port 8080
💡 Connect your web browser to: ws://localhost:8080
```

In **Terminal 2** (Web App):
```bash
npm run web
```

Browser opens at `http://localhost:3000` and automatically connects to bridge server at `ws://localhost:8080`, which then connects to your WiFi bridge.

---

## Testing Without a Boat

### Option 1: Mock NMEA Data (Current)

The mocks in `__mocks__/` simulate NMEA connections. All TCP/UDP calls log to console.

### Option 2: Use Playback Mode

Create sample NMEA file:
```bash
cat > vendor/sample-data/test.nmea << 'EOF'
$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
$SDDBT,12.4,f,3.8,M,2.1,F*3A
$WIMWV,045,R,12.5,N,A*27
$VWVHW,,,045,M,5.2,N,9.6,K*5A
EOF
```

Update the bridge server to stream from file:
```javascript
// In server/nmea-websocket-bridge.js
const fs = require('fs');

// Replace TCP connection with file streaming
const streamFromFile = (filePath) => {
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.split('\n');
  let index = 0;

  setInterval(() => {
    if (index < lines.length) {
      const line = lines[index];
      console.log(`📡 File → Browser: ${line}`);

      wss.clients.forEach((client) => {
        client.send(JSON.stringify({
          type: 'nmea',
          data: line,
          timestamp: Date.now(),
        }));
      });

      index++;
    } else {
      index = 0; // Loop
    }
  }, 1000); // 1 message per second
};

// Usage:
// node server/nmea-websocket-bridge.js --file vendor/sample-data/test.nmea
```

---

## Development Workflow

### UI Development (No Boat Needed)
```bash
npm run web
```
- Fast iteration
- Hot reload
- Mock data
- All widgets visible

### Real Data Testing (With Boat or Bridge Server)

**Terminal 1:**
```bash
node server/nmea-websocket-bridge.js 192.168.1.10 10110
```

**Terminal 2:**
```bash
npm run web
```

**Browser:** Auto-connects via WebSocket → displays real NMEA data

### Production Testing (iOS/Android/Desktop)
```bash
npm run ios      # Direct TCP connection
npm run android  # Direct TCP connection
```
No bridge server needed - native apps connect directly to WiFi bridge.

---

## What Works Where

| Feature | Web Browser | iOS/Android | Desktop |
|---------|-------------|-------------|---------|
| **UI Validation** | ✅ Perfect | ✅ Perfect | ✅ Perfect |
| **NMEA Connection** | ✅ Via Bridge | ✅ Direct TCP | ✅ Direct TCP |
| **Autopilot Control** | ✅ Via Bridge | ✅ Direct TCP | ✅ Direct TCP |
| **File System** | ❌ Mocked | ✅ Native | ✅ Native |
| **Performance** | ⚠️ Good | ✅ Excellent | ✅ Excellent |

---

## Summary

✅ **Current:** `npm run web` works for UI validation (native features mocked)

✅ **For Real NMEA:** Start bridge server + update app to use WebSocket on web

✅ **For Production:** Use iOS/Android/Desktop with direct TCP connection

---

## Quick Commands

```bash
# UI validation only (mock data)
npm run web

# Real NMEA data (requires bridge server + code update)
# Terminal 1:
node server/nmea-websocket-bridge.js 192.168.1.10 10110

# Terminal 2:
npm run web

# Native apps (no bridge needed)
npm run ios
npm run android
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-12
**Status:** Web UI Working ✅ | WebSocket Bridge Ready (needs app integration)
