# NMEA Data Flow Architecture

This document shows how NMEA data flows through the boating instruments application.

## High-Level Data Flow

```mermaid
flowchart LR
    A[NMEA Source] --> B[Connection Manager]
    B --> C[Protocol Parser]
    C --> D[Data Store]
    D --> E[Widgets]
    E --> F[User Display]

    style A fill:#e1f5ff
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#e8f5e9
    style E fill:#fff9c4
    style F fill:#fce4ec
```

## Detailed Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant ConnectionManager
    participant WebSocket
    participant Parser
    participant Store
    participant Widget

    User->>UI: Select TCP/UDP/WS connection
    UI->>ConnectionManager: connect(config)
    ConnectionManager->>WebSocket: new WebSocket(url)

    loop Every NMEA sentence
        WebSocket->>ConnectionManager: onMessage(data)
        ConnectionManager->>Parser: parseNMEA(sentence)

        alt Valid NMEA
            Parser->>Store: updateData(parsed)
            Store->>Widget: notify subscribers
            Widget->>UI: rerender with new data
        else Invalid NMEA
            Parser->>ConnectionManager: logError()
        end
    end

    User->>UI: Disconnect
    UI->>ConnectionManager: disconnect()
    ConnectionManager->>WebSocket: close()
```

## Connection Manager State Machine

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: connect()
    Connecting --> Connected: onOpen
    Connecting --> Error: onError
    Connected --> Disconnecting: disconnect()
    Connected --> Error: onError/timeout
    Error --> Disconnected: reset
    Disconnecting --> Disconnected: onClose
    Disconnected --> [*]

    Connected --> Connected: onData (receiving)
```

## Data Parsing Pipeline

```mermaid
flowchart TD
    A[Raw NMEA String] --> B{Validate Checksum}
    B -->|Valid| C[Parse Sentence Type]
    B -->|Invalid| Z[Log Error & Skip]

    C --> D{Sentence Type?}
    D -->|GGA| E[GPS Position Parser]
    D -->|VTG| F[Speed Parser]
    D -->|MWV| G[Wind Parser]
    D -->|DBT| H[Depth Parser]
    D -->|MTW| I[Water Temp Parser]
    D -->|RPM| J[Engine Parser]
    D -->|Other| K[Generic Parser]

    E --> L[Update nmeaStore.gps]
    F --> M[Update nmeaStore.speed]
    G --> N[Update nmeaStore.wind]
    H --> O[Update nmeaStore.depth]
    I --> P[Update nmeaStore.waterTemp]
    J --> Q[Update nmeaStore.engine]
    K --> R[Update nmeaStore.raw]

    L --> S[Trigger Widget Updates]
    M --> S
    N --> S
    O --> S
    P --> S
    Q --> S
    R --> S

    style B fill:#fff3e0
    style D fill:#f3e5f5
    style S fill:#e8f5e9
    style Z fill:#ffebee
```

## Store Architecture

```mermaid
classDiagram
    class NMEAStore {
        +gps: GPSData
        +speed: SpeedData
        +wind: WindData
        +depth: DepthData
        +engine: EngineData
        +connection: ConnectionState
        +updateGPS(data)
        +updateSpeed(data)
        +subscribe(callback)
    }

    class ConnectionManager {
        +connection: WebSocket
        +state: ConnectionState
        +config: ConnectionConfig
        +connect()
        +disconnect()
        +onData(sentence)
    }

    class Parser {
        +parseGGA(sentence)
        +parseVTG(sentence)
        +parseMWV(sentence)
        +validateChecksum(sentence)
    }

    class Widget {
        +store: NMEAStore
        +presentation: PresentationStore
        +render()
    }

    ConnectionManager --> Parser: uses
    Parser --> NMEAStore: updates
    Widget --> NMEAStore: subscribes
    Widget --> PresentationStore: uses formatting
```

## Widget Rendering Flow

```mermaid
flowchart TD
    A[Store Update] --> B[Zustand Notify Subscribers]
    B --> C[Widget useStore Hook]
    C --> D[Widget Component]
    D --> E{Has Data?}

    E -->|Yes| F[Get Presentation]
    E -->|No| G[Show N/A]

    F --> H[useMetricDisplay Hook]
    H --> I[Format Value]
    I --> J[Apply Units]
    J --> K[Apply Precision]
    K --> L[Render Display]

    L --> M[PrimaryMetricCell]
    M --> N[User Sees Value]

    style A fill:#e8f5e9
    style D fill:#fff9c4
    style H fill:#f3e5f5
    style M fill:#e1f5ff
```

## Error Handling Flow

```mermaid
flowchart TD
    A[NMEA Data Received] --> B{Connection OK?}
    B -->|No| C[ConnectionError]
    C --> D[Show Error State]
    C --> E[Attempt Reconnect]

    B -->|Yes| F{Valid Format?}
    F -->|No| G[ParseError]
    G --> H[Log to Console]
    G --> I[Show Last Valid Data]

    F -->|Yes| J{Checksum Valid?}
    J -->|No| K[ChecksumError]
    K --> H
    K --> I

    J -->|Yes| L[Parse Successful]
    L --> M[Update Store]
    M --> N[Update Widgets]

    style C fill:#ffebee
    style G fill:#ffebee
    style K fill:#ffebee
    style M fill:#e8f5e9
```

## Protocol Support Matrix

```mermaid
graph LR
    A[NMEA Bridge] --> B[NMEA 0183]
    A --> C[NMEA 2000]
    A --> D[Hybrid Mode]

    B --> E[TCP/Serial]
    C --> F[UDP Multicast]
    D --> G[Both Protocols]

    E --> H[WebSocket Bridge]
    F --> H
    G --> H

    H --> I[React Native App]

    style A fill:#e1f5ff
    style I fill:#e8f5e9
```

---

## Key Files Reference

### Connection Management
- [PureConnectionManager.ts](../../boatingInstrumentsApp/src/services/nmea/connection/PureConnectionManager.ts) - Core connection logic
- [ConnectionConfigDialog.tsx](../../boatingInstrumentsApp/src/components/dialogs/ConnectionConfigDialog.tsx) - Connection UI

### Data Store
- [nmeaStore.ts](../../boatingInstrumentsApp/src/store/nmeaStore.ts) - Zustand store for NMEA data
- [presentationStore.ts](../../boatingInstrumentsApp/src/presentation/presentationStore.ts) - Unit formatting

### Parsing
- [nmea-bridge.js](../../boatingInstrumentsApp/server/nmea-bridge.js) - Server-side NMEA bridge
- [protocol-servers.js](../../boatingInstrumentsApp/server/lib/protocol-servers.js) - Protocol implementations

### Widgets
- [DepthWidget.tsx](../../boatingInstrumentsApp/src/widgets/DepthWidget.tsx) - Example widget
- [SpeedWidget.tsx](../../boatingInstrumentsApp/src/widgets/SpeedWidget.tsx) - Example widget
- [GPSWidget.tsx](../../boatingInstrumentsApp/src/widgets/GPSWidget.tsx) - Complex widget

---

## Development Notes

### Adding New NMEA Sentence Support

1. Add parser in `nmea-bridge.js` or client-side parser
2. Update `nmeaStore.ts` with new data structure
3. Create widget component
4. Add presentation format in `presentationStore.ts`

### Testing Data Flow

Use VS Code tasks to start NMEA simulator:
- **Task:** "Start NMEA Bridge: Basic Navigation"
- **Task:** "Start Full Web Development Stack (Safari)"

### Debugging Tips

Enable logging for specific subsystems:
```javascript
// In Safari/Chrome console
enableLog('nmea.gps')     // GPS parsing
enableLog('nmea.connection') // Connection events
enableLog('nmea.parser')  // All parsing
disableLog('nmea.gps')    // Turn off logging
```

---

*See also: [Memory Optimization Guide](../../MEMORY-OPTIMIZATION-GUIDE.md) for performance tips*
