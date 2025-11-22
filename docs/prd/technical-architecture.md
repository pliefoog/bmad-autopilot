# Technical Architecture

## Technology Stack

**UI Framework:** React Native (v0.76+)
- **Mobile:** React Native core for iOS and Android
- **Desktop:** React Native for Windows and React Native for macOS (Microsoft-maintained)
- **Language:** TypeScript for type safety and maintainability
- **State Management:** React Context API + Zustand (or Redux Toolkit) for global state

**Networking Layer:**
- **TCP/UDP Sockets:**
  - `react-native-tcp-socket` (v6.3+) - TCP socket API for Android, iOS, and macOS with SSL/TLS support
  - `react-native-udp` - UDP socket API for Android and iOS
- **NMEA Parsing:**
  - `nmea-simple` - NMEA 0183 sentence parser with TypeScript support
  - `@canboat/canboatjs` - TypeScript library for NMEA 2000 PGN parsing and encoding
- **Connection Management:** Custom reconnection logic with exponential backoff

**UI Components:**
- **Cross-Platform:** React Native core components (View, Text, TouchableOpacity, etc.)
- **Advanced UI:** React Native Reanimated for smooth animations and gestures
- **Drag & Drop:** React Native Gesture Handler + custom drag-drop implementation
- **Charts/Gauges:** React Native SVG + custom instrument components (analog compass rose, bar graphs, angle indicators)
- **Theme System:** Marine-compliant day/night/red-night modes following USCG/IMO scotopic vision standards (see [marine-night-vision-standards.md](../marine-night-vision-standards.md))

**Platform-Specific Adaptations:**
- **Windows:** React Native for Windows + WinUI 3 controls where needed
- **macOS:** React Native for macOS + AppKit integration for native feel
- **Mobile:** Standard React Native iOS/Android APIs

**Data Persistence:**
- **Settings & Layouts:** AsyncStorage (mobile) with platform-specific equivalents (UserDefaults/SharedPreferences)
- **Recorded NMEA Files:** File system access via `react-native-fs` or platform-specific file APIs

**Error Tracking & Monitoring:**
- **Crash Reporting:** Sentry React Native SDK
- **Analytics:** Minimal telemetry for crash-free rate monitoring (NFR3: 99.5%+)

**Development Tools:**
- **Build System:** Metro bundler (React Native default)
- **Testing:** Jest + React Native Testing Library
- **Linting:** ESLint + Prettier
- **Type Checking:** TypeScript strict mode

## Architecture Patterns

**Layer Architecture:**
```
┌─────────────────────────────────────┐
│   Presentation Layer (UI)           │
│   - Widgets (Depth, Speed, etc.)    │
│   - Dashboard Layout Manager        │
│   - Settings Screens                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Business Logic Layer              │
│   - NMEA Data Store (state)         │
│   - Autopilot Command Handler       │
│   - Alarm Manager                   │
│   - Unit Converter                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Data Access Layer                 │
│   - NMEA Connection Manager         │
│   - TCP/UDP Socket Abstraction      │
│   - NMEA 0183/2000 Parser           │
│   - Settings Persistence            │
└─────────────────────────────────────┘
```

**Key Design Decisions:**

1. **Single Codebase Strategy:** React Native core codebase (~95% shared) with platform-specific extensions for Windows/macOS where needed. Platform files use `.ios.tsx`, `.android.tsx`, `.windows.tsx`, `.macos.tsx` suffixes.

2. **Widget System:** Component-based architecture where each widget is a self-contained React component that subscribes to relevant NMEA data streams via context/state management.

3. **Real-Time Data Flow:**
   - TCP/UDP socket receives raw NMEA bytes
   - Parser converts to structured data objects
   - State manager updates subscribed widget components
   - React's rendering engine updates UI (<1s latency per FR33)

4. **Connection Resilience:** Automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, 15s max) and clear connection status indicators in UI.

5. **Responsive Layout:** Flexbox-based layout system that adapts widget grid dynamically based on screen dimensions, with separate phone/tablet/desktop breakpoints.

## Deployment Strategy

**Mobile:**
- iOS: Xcode build → App Store submission
- Android: Gradle build → Google Play Store submission

**Desktop:**
- Windows: React Native Windows build → MSIX packaging → Microsoft Store
- macOS: React Native macOS build → .app bundle → Mac App Store (notarized)

**Code Signing:** Platform-specific certificates (Apple Developer, Google Play, Microsoft Partner Center)

**Update Strategy:** App store updates for MVP; future over-the-air updates via CodePush for non-native changes

---
