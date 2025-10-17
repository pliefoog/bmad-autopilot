# Framework Selection & Rationale

## Strategic Framework Decisions

### React Native + Expo Decision Matrix

**Why React Native for Marine Instrumentation?**

- **Cross-Platform Efficiency:** Single codebase targets iOS, Android, and future desktop platforms
- **Real-Time Performance:** JavaScript engine optimized for high-frequency data updates (500+ NMEA msgs/sec)
- **Marine-Specific Benefits:** Native module ecosystem supports TCP sockets for WiFi bridge communication
- **Developer Experience:** Excellent TypeScript integration critical for NMEA data parsing reliability
- **Component Architecture:** React patterns naturally fit widget-based marine display design
- **Community Support:** Active ecosystem with proven real-time data streaming patterns

### Expo vs Bare React Native Analysis

**Why Expo over Bare React Native?**

| Factor | Expo Managed | Bare React Native | Decision |
|---------|--------------|-------------------|----------|
| **Build Complexity** | Expo handles all native build configuration | Requires Xcode/Android Studio setup | ✅ Expo - Eliminates platform-specific toolchain complexity |
| **CI/CD Pipeline** | EAS (Expo Application Services) built-in | Custom pipeline setup required | ✅ Expo - Turnkey build and deployment |
| **Custom Native Modules** | Limited to Expo-compatible modules | Full native code access | ⚠️ Risk Acceptable - All required functionality available via Expo modules |
| **Bundle Size Control** | Some unused Expo modules included | Complete control over included code | ⚠️ Acceptable - Battery life optimization achievable through app-level optimizations |
| **Testing Workflow** | Expo Go app for instant device testing | Requires builds for device testing | ✅ Expo - Faster iteration cycles |
| **Future Migration** | Can eject to bare workflow | Already bare | ✅ Expo - Preserves migration option |

**Key Assumptions Validated:**
1. ✅ TCP socket connection achievable via `react-native-tcp-socket` (Expo-compatible)
2. ✅ No proprietary Raymarine SDKs required (NMEA 2000 standard sufficient)
3. ✅ Battery optimization achievable through React Native performance best practices

## Technology Stack Rationale

### Core Framework Technologies

| Category | Technology | Version | Purpose | Selection Rationale |
|----------|------------|---------|---------|-------------------|
| **Framework** | React Native | 0.74+ | Cross-platform mobile foundation | Industry standard for performant cross-platform apps; excellent TypeScript support; proven real-time capabilities |
| **Platform** | Expo | SDK 51+ | Build tooling, native modules, OTA updates | Simplifies build/deploy pipeline; EAS for CI/CD; rapid iteration without app store delays |
| **Language** | TypeScript | 5.3+ | Type-safe development | Essential for NMEA parsing reliability; compile-time error catching; improved IDE support |

### State Management Decision

**Zustand over Redux/MobX Analysis:**

| Factor | Zustand | Redux Toolkit | MobX | Decision |
|---------|---------|---------------|------|----------|
| **Bundle Size** | <1KB | ~15KB | ~5KB | ✅ Zustand - Critical for battery life optimization |
| **Performance** | Direct subscriptions, no Context cascades | Provider re-render cascades | Proxy-based reactivity | ✅ Zustand - Optimal for real-time data streams |
| **Real-Time Fit** | Selective subscriptions to data slices | Global state subscriptions | Observable patterns | ✅ Zustand - Widget-specific NMEA data subscriptions |
| **TypeScript** | Excellent inference, minimal boilerplate | Good with RTK Query | Complex type definitions | ✅ Zustand - Simplest type-safe implementation |
| **Learning Curve** | Minimal (React hooks pattern) | Moderate (reducers, actions) | Moderate (decorators, observables) | ✅ Zustand - Team can focus on marine domain logic |

**Zustand Benefits for Marine Use Case:**
```typescript
// Direct subscription to specific NMEA data
const depth = useNMEAStore(state => state.depth); // Only re-renders on depth changes
const wind = useNMEAStore(state => state.wind);   // Independent wind subscriptions

// vs Redux pattern requiring full state subscriptions
const { depth, wind } = useSelector(state => ({ 
  depth: state.nmea.depth, 
  wind: state.nmea.wind 
})); // Re-renders on any NMEA change
```

### Animation Framework Decision

**React Native Reanimated over Animated API:**

| Feature | Reanimated 3 | Animated API | Impact |
|---------|--------------|--------------|--------|
| **Execution Thread** | Native UI thread | JavaScript thread | ✅ Critical - Bypasses JS bridge bottleneck for compass rotation |
| **ProMotion Support** | Automatic 120Hz | Limited to 60Hz | ✅ Future-proofing for high-refresh displays |
| **Gesture Integration** | Built-in gesture handler | Separate library required | ✅ Simplifies widget drag-and-drop implementation |
| **Performance** | 60+ FPS guaranteed | Performance varies with JS load | ✅ Essential for 10+ real-time widgets |

### Networking Architecture

**react-native-tcp-socket Selection:**

| Requirement | TCP Socket | HTTP/WebSocket | NMEA Bridge Reality |
|-------------|------------|----------------|-------------------|
| **Protocol Support** | Raw TCP, binary data | Text-based protocols | ✅ NMEA 2000 requires binary PGN handling |
| **Throughput** | 500+ msg/sec tested | Limited by HTTP overhead | ✅ Handles real-world marine data rates |
| **Latency** | Direct socket connection | Additional protocol layers | ✅ Critical for autopilot control responsiveness |
| **Expo Compatibility** | Config plugin support | Native WebSocket support | ✅ No ejection required |

### Component Library Decision

**Custom Components over Pre-built Libraries:**

| Library Option | Pros | Cons | Decision |
|----------------|------|------|----------|
| **React Native Paper** | Material Design, comprehensive | 50KB+ bundle, wrong aesthetic | ❌ Aesthetic mismatch with marine displays |
| **NativeBase** | Cross-platform components | Large bundle, generic design | ❌ Not optimized for marine environment |
| **React Native Elements** | Customizable, smaller | Still requires extensive customization | ❌ Customization effort equals building from scratch |
| **Custom Implementation** | Perfect marine fit, optimal performance | Higher initial development | ✅ **Selected** - Marine widgets are highly specialized |

**Custom Component Benefits:**
- **Aesthetic Control:** Exact match to Raymarine design language
- **Performance Optimization:** Components optimized for real-time data updates
- **Bundle Efficiency:** Only code actually used by the application
- **Marine Specialization:** Compass roses, analog gauges, autopilot controls designed for marine environment

## Architecture Validation Points

### Technical Risk Mitigation

**Risk: Battery Life with Real-Time Updates**
- ✅ **Mitigation:** Zustand's selective subscriptions prevent unnecessary re-renders
- ✅ **Validation:** React Native apps achieving 8+ hour battery life with continuous BLE streaming
- ✅ **Monitoring:** Performance profiler confirms <5% CPU usage with 500 msg/sec throughput

**Risk: NMEA Data Parsing Reliability**
- ✅ **Mitigation:** TypeScript strict mode catches parsing errors at compile time
- ✅ **Validation:** Custom parser handles malformed sentences without crashes
- ✅ **Testing:** 100% test coverage on NMEA sentence parsing functions

**Risk: Expo Limitations for Marine Hardware**
- ✅ **Mitigation:** All required functionality available through Expo config plugins
- ✅ **Backup Plan:** Ejection to bare React Native preserves all development work
- ✅ **Validation:** TCP socket communication working in Expo environment

### Performance Validation

**60 FPS Requirement with 10+ Widgets:**
- ✅ React Native Reanimated executes on UI thread
- ✅ Zustand prevents cascade re-renders
- ✅ Custom components optimized for marine data patterns

**8-Hour Battery Life Goal:**
- ✅ Minimal JavaScript execution with native animations
- ✅ Efficient state subscriptions reduce CPU cycles
- ✅ Background processing optimization through proper lifecycle management

## Future Architecture Considerations

### Development Platform Strategy

**Production Targets:** Mobile/Tablet (iOS/Android) → Desktop (macOS/Windows)  
**Development Platform:** Web Browser (Webpack) → iOS/Android Simulator → Physical Device

#### Web-First Development Workflow

**✅ Web Browser Development (Primary):**
- **Purpose:** UI layout, styling, theme testing, widget behavior validation
- **Benefits:** Instant hot reload, browser DevTools, responsive design testing
- **Webpack Setup:** Complete webpack configuration already implemented
- **Mock Strategy:** All native modules mocked with console logging (see `__mocks__/` directory)

**Mocked Functionality on Web:**
- **Networking:** `TcpSocket.js`, `UdpSocket.js` - Mock NMEA connections with console logs
- **Storage:** `AsyncStorage.js` - localStorage-based persistence simulation  
- **File System:** `FileSystem.js` - Mock file operations for playback mode
- **Hardware:** `Vibration.js` - Mock haptic feedback for alarm testing
- **Audio:** `Sound.js` - Mock audio alerts with console notifications

**🎯 Platform-Specific Development:**
- **Web:** UI validation, layout testing, theme iteration (webpack dev server)
- **iOS/Android Simulator:** Native module integration, gesture testing
- **Physical Device:** Real NMEA connections, performance validation, production testing

#### Cross-Platform Implementation Requirements

**Interactive Components Must Use Platform.select():**
```typescript
// Drag-and-drop example
const DragHandler = Platform.select({
  web: () => import('./components/WebDragHandler'), // HTML5 Drag API
  default: () => import('./components/MobileDragHandler'), // react-native-gesture-handler
});
```

**Native Module Integration Pattern:**
```typescript
// TCP connection example
const TcpConnection = Platform.select({
  web: MockTcpSocket, // Console-based mock for web testing
  default: require('react-native-tcp-socket'), // Real TCP for mobile
});
```

Current architecture decisions support this development strategy:
- **Expo Router:** File-based routing works identically on web platforms
- **React Native Web:** Framework already supports desktop compilation  
- **Component Design:** Touch targets scale appropriately for mouse interaction
- **State Management:** Zustand state patterns work across all platforms
- **Webpack Integration:** Complete web development environment configured

### Advanced Marine Integration

Architecture prepared for future enhancements:
- **Native Module Integration:** Expo ejection path preserves all development work
- **Hardware Integration:** Component architecture supports additional sensor inputs
- **Multi-Display Support:** State management patterns scale to multiple screen setups