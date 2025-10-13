# Tech Stack

This is the **DEFINITIVE technology selection** for the entire project. All development must use these exact versions and technologies.

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.3+ | Type-safe React Native development | Catches NMEA parsing errors at compile time; excellent IDE support; industry standard for React Native |
| **Frontend Framework** | React Native | 0.74+ | Cross-platform mobile/desktop UI foundation | Only mature framework supporting iOS, Android, Windows, macOS from single codebase; 95% code sharing |
| **Development Platform** | Expo | SDK 51+ | Build tooling, OTA updates, native module access | EAS simplifies multi-platform builds; OTA critical for marine app bug fixes; config plugins enable TCP sockets |
| **UI Component Library** | Custom (No library) | N/A | Marine-specific instrument widgets | Material/NativeBase don't match Raymarine aesthetic; custom SVG gauges provide exact control; smaller bundle |
| **State Management** | Zustand | 4.5+ | Global state for NMEA data, widgets, settings | <1KB bundle; excellent TypeScript; selector-based subscriptions prevent re-render cascades; 10x faster than Redux for real-time streams |
| **Routing** | Expo Router | 3.5+ | File-based navigation | Built on React Navigation; reduces boilerplate; deep linking support for future features |
| **Animation** | React Native Reanimated | 3.8+ | 60-120 FPS animations, compass rotation | Runs on UI thread bypassing JS bridge; supports ProMotion displays; critical for 10+ simultaneous widget updates |
| **Vector Graphics** | React Native SVG | 15.1+ | Compass roses, analog gauges, custom icons | Scalable without raster images; smaller bundle; crisp on all screen densities |
| **Styling** | StyleSheet API + Theme Context | Built-in | Component styling with Day/Night/Red-Night modes | Native to RN; performant; no CSS-in-JS overhead; custom theme provider for display modes |
| **Form Handling** | React Hook Form | 7.51+ | Settings forms, alarm config, WiFi connection | Minimal re-renders; built-in validation; excellent performance and TypeScript support |
| **Networking** | react-native-tcp-socket | 6.0+ | TCP connection to WiFi bridge for NMEA stream | Direct socket access; handles 500 msg/sec throughput; Expo compatible via config plugin |
| **NMEA Parsing** | Custom NMEA Parser | N/A | Parse NMEA 0183/2000 into structured data | Existing libraries lack Raymarine autopilot PGN support; custom parser optimized for performance |
| **Local Storage** | Expo SecureStore + AsyncStorage | Built-in | Widget layouts, settings, WiFi credentials | SecureStore for sensitive data (IP addresses); AsyncStorage for preferences; async doesn't block UI |
| **Testing Framework** | Jest | 29.7+ | Unit and integration testing | Industry standard; works with Expo; snapshot testing for widgets |
| **Testing Library** | React Native Testing Library | 12.4+ | Component testing | Async utilities for NMEA data flows; encourages best practices; accessibility-focused |
| **Build Tool** | Metro (Expo) | Built-in | JavaScript bundler and dev server | Optimized for React Native; fast refresh; source maps; integrated with Expo workflow |
| **Linting** | ESLint + Prettier | 8.x / 3.x | Code quality and formatting | Enforce TypeScript strict mode; catch errors early; consistent code style across team |
| **Type Checking** | TypeScript Compiler | 5.3+ | Static type checking | Strict mode enabled; validates NMEA data types; prevents runtime errors |
| **Crash Reporting** | Sentry React Native SDK | Latest | Production error tracking and crash reports | Meets NFR3 (99.5%+ crash-free rate); detailed stack traces; performance monitoring |
| **Build & Deploy** | EAS (Expo Application Services) | Latest | Multi-platform builds and submissions | Handles iOS, Android, Windows, macOS builds from cloud; simplifies code signing |
| **Development Tools** | React DevTools + Flipper (optional) | Latest | Component inspection, network debugging | Essential for debugging real-time NMEA data flows and widget re-render optimization |

## Additional Stack Notes

**Why Zustand over Redux Toolkit?**
- **Bundle Size:** <1KB vs ~15KB (critical for 8-hour battery life goal)
- **Performance:** No Context Provider wrapping eliminates re-render cascades
- **Real-Time Fit:** Direct subscriptions to specific NMEA data slices (e.g., only depth widget subscribes to depth)
- **Developer Experience:** Minimal boilerplate; excellent TypeScript inference

**Why React Native Reanimated over Animated API?**
- **UI Thread Execution:** Runs on native UI thread, bypassing JS bridge bottleneck
- **ProMotion Support:** Automatically leverages 120Hz displays on iPhone 14/15 Pro
- **Gesture Handling:** Integrated with React Native Gesture Handler for drag-and-drop widgets (Epic 2)
- **Performance:** Critical for maintaining 60 FPS with 10+ widgets updating simultaneously

**Why react-native-tcp-socket?**
- **Direct TCP Access:** WiFi bridges expose NMEA on TCP port 10110 (not HTTP/WebSocket)
- **NMEA 2000 Support:** Handles binary PGN messages from Raymarine autopilot
- **Throughput:** Tested to handle 500+ messages/second without blocking UI thread
- **Expo Compatibility:** Works via config plugin (no bare workflow ejection required)

**Why Custom NMEA Parser?**
- **Raymarine-Specific PGNs:** Existing libraries (`nmea-simple`, `@canboat/canboatjs`) lack proprietary autopilot command support
- **Performance:** Custom parser optimized for mobile; avoids unnecessary object allocations
- **Bundle Size:** Only include parsers for messages we actually use (~20KB vs ~200KB for full libraries)

**Why No UI Component Library?**
- **Aesthetic Mismatch:** Material Design/iOS HIG don't match Raymarine's professional nautical design
- **Bundle Size:** Removing unused components from libraries adds complexity
- **Flexibility:** Marine widgets (compass rose, analog depth gauge) are highly specialized
- **Performance:** Custom components optimized for real-time data updates

---
