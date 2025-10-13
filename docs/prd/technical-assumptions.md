# Technical Assumptions

## Repository Structure: Monorepo

**Decision:** Single repository containing shared core logic and platform-specific UI layers.

**Rationale:** Simplifies dependency management, enables code sharing across platforms (NMEA parsing, business logic, widget framework), and reduces overhead for solo developer or small team (NFR15). Aligns with React Native best practices.

**Structure:**
- `/src/core` - Shared TypeScript: NMEA parsing, widget framework, autopilot protocols, business logic
- `/src/mobile` - React Native mobile app (iOS + Android)
- `/src/desktop` - React Native Windows/macOS extensions (Phase 1.5)
- `/src/widgets` - Reusable widget components
- `/src/services` - NMEA connection, settings persistence, alarm management

## Service Architecture: Client-Side Monolith

**Decision:** MVP is entirely client-side with no backend services.

**Rationale:**
- No cloud dependencies reduces complexity and meets 7-month timeline constraint
- Aligns with NFR6 (offline-first) and NFR13 (local storage only)
- Boat's local WiFi network is isolated environment (no internet required)
- Eliminates hosting costs, backend maintenance, user account management

**Architecture:**
- NMEA Connection Service: Manages TCP/UDP socket connections to WiFi bridge
- Widget Rendering Engine: Manages dashboard layout and widget lifecycle
- Autopilot Control Service: Implements Raymarine EVO protocol
- Settings/Storage Service: Persists user preferences and layouts locally
- Alarm Manager: Monitors NMEA data streams and triggers configured alarms

**Phase 2 Consideration:** If analytics/telemetry or multi-device sync added post-MVP, will introduce minimal backend (Node.js/Express, PostgreSQL, AWS S3) - but descoped from MVP per user feedback.

## Testing Requirements: Automated + Real-Boat Validation

**Decision:** ≥70% automated test coverage (NFR18) plus extensive real-boat beta testing.

**Test Strategy:**
- **Unit tests:** NMEA parsing, widget logic, alarm triggers (Jest + React Native Testing Library)
- **Integration tests:** NMEA connection, autopilot command transmission, settings persistence
- **Playback mode tests:** All widgets and features validated against recorded NMEA files
- **Real-boat validation:** Month 6-7 beta with 50 users, 10+ documented autopilot sessions
- **Stress testing:** NFR10 validation (500 messages/second realistic load based on NMEA2000 CAN bus bandwidth)

**Key Testing Challenges:**
- Limited physical boat access during development (mitigated by playback mode - FR31)
- Raymarine EVO protocol reverse-engineered (requires extensive beta testing across firmware versions)
- WiFi bridge compatibility matrix (must test Quark-Elec, Actisense, + 1 other - NFR1)

## Frontend: React Native with TypeScript

**Decision:** React Native (v0.76+) with TypeScript for all platforms.

**Rationale:**
- Single codebase achieves iOS + Android + Windows + macOS (NFR7)
- TypeScript provides type safety critical for NMEA parsing and autopilot control
- Large ecosystem and community support
- Proven in production apps (reduces risk vs. newer frameworks)
- Platform extensions (React Native for Windows/macOS) mature and Microsoft-maintained

**Key Libraries:**
- UI: React Native core components, React Native Reanimated (smooth animations), React Native Gesture Handler (drag-drop)
- Networking: `react-native-tcp-socket` (v6.3+), `react-native-udp`
- NMEA Parsing: `nmea-simple` (NMEA0183), `@canboat/canboatjs` (NMEA2000 PGNs)
- Charts/Gauges: React Native SVG + custom instrument components
- Storage: AsyncStorage (mobile), platform-specific equivalents for desktop
- Error Tracking: Sentry React Native SDK

## Backend: None for MVP

**Decision:** No backend, cloud services, or APIs in MVP.

**Rationale:** Meets NFR13 (local storage only), NFR6 (offline-first), and 7-month timeline. All data processing happens client-side.

**Phase 1.5+ Consideration:** If user feedback drives need for cloud features (trip sync, analytics), will evaluate Node.js/Express + PostgreSQL + AWS S3.

## Database: Local Storage Only

**Decision:**
- **Mobile:** AsyncStorage backed by SQLite for settings, dashboard layouts, alarm history
- **Desktop (Phase 1.5):** Platform-native storage (UserDefaults/macOS, LocalStorage/Windows)

**Rationale:** No cloud sync in MVP (NFR13), so simple local persistence sufficient. SQLite provides relational queries if needed for alarm history (FR41).

**Data Stored:**
- User settings (FR30): Unit preferences, display mode, WiFi bridge config
- Dashboard layouts (FR6): Widget positions, sizes, configurations per device
- Alarm history (FR41): Last 10 triggered alarms
- NMEA parameter mappings (FR35, FR43): User-configured data source selections

## Integration: NMEA WiFi Bridges

**Decision:** Support Quark-Elec A032, Actisense W2K-1, and ≥1 additional WiFi bridge via TCP/UDP sockets.

**Connection Details:**
- **TCP port 2000** (industry standard for marine WiFi bridges)
- **UDP port 2000** (client connects to specific IP address and port - not broadcast)
- **WiFi bridge IP address:** User-configured via FR29 (typically 192.168.x.x on boat's local network)

**Data Format Variations:**
The app must handle three NMEA data format variations per FR2:
1. **NMEA0183 ASCII sentences** (e.g., `$GPGGA`, `$WIMWV`)
2. **NMEA2000 PGNs in binary format** (Actisense N2K format)
3. **NMEA2000 PGNs encapsulated in NMEA0183 sentences** (`$PCDIN` format)
   - Critical for Raymarine EVO autopilot control via NMEA0183-only WiFi bridges
   - Autopilot commands sent as NMEA2000 PGNs wrapped in NMEA0183 wrapper sentences

**NMEA2000 CAN Bus Characteristics:**
- NMEA2000 uses CAN 2.0B at **250 kbit/s** bandwidth
- Typical marine networks generate **50-200 messages/second**
- High-traffic boats (many instruments) may reach **300-500 messages/second** peak
- NFR10 stress testing uses 500 messages/second as realistic upper bound

**Integration Requirements (FR1, FR2, NFR1):**
- TCP/UDP socket connection with automatic reconnection (exponential backoff per FR1)
- Parse all three NMEA data format variations
- Decode NMEA2000 PGNs using `@canboat/canboatjs` library
- Implement Raymarine EVO autopilot protocol (reference: github.com/matztam/raymarine-evo-pilot-remote)
- Handle PGN encapsulation/de-encapsulation for NMEA0183 bridges

**Assumptions:**
- WiFi bridges handle SeaTalkng → NMEA2000 protocol conversion if needed
- Boat's WiFi network is local only (no internet gateway required per NFR6)

**Risk:** Some proprietary PGNs may be undocumented - will handle gracefully per NFR16.

## Hosting/Infrastructure: App Store Distribution + Direct Testing

**Decision:** Distribute via app stores for public launch, but support direct installation for development/beta testing to avoid App Store review delays.

**Development & Beta Testing (Month 1-7):**
- **iOS Development:** Xcode direct install to developer devices (no App Store involvement)
- **iOS Beta:** TestFlight distribution (up to 10,000 beta testers, no App Store review required for beta builds)
- **Android Development:** Direct APK sideloading for development
- **Android Beta:** Google Play Internal/Closed Testing (no public review required)
- **Desktop (Phase 1.5):** Direct installation of unsigned builds for development

**Public Launch (Month 7-8):**
- **iOS App Store** (requires App Store review, but only for public launch)
- **Google Play Store** (requires Play Store review, but only for public launch)
- **Microsoft Store** (Phase 1.5)
- **Mac App Store** (Phase 1.5)

**Key Point:** MVP development and beta testing (Month 1-7) completely bypasses App Store review hassles. Only public launch requires store approval. This protects the 7-month timeline from App Store review delays.

**Code Signing:**
- Apple Developer account ($99/year) - required for TestFlight and App Store
- Google Play Developer account ($25 one-time) - required for beta and public release
- Microsoft Partner Center (free) - Phase 1.5

## Security/Compliance: Privacy-First, Local-Only

**Decision:** No user data collection, no cloud transmission, no user accounts in MVP.

**Privacy/Security Implications:**
- No privacy policy conflicts (no data leaves device per NFR13)
- No GDPR/CCPA compliance burden
- No security vulnerabilities from cloud exposure
- Network traffic stays on boat's local WiFi (NFR6)
- Crash reporting (NFR14) requires user opt-in consent (FR34 wizard)

**App Store Compliance (NFR12):**
- Privacy policy required (even if "we don't collect data")
- Terms of service for liability disclaimers (autopilot control safety)
- Age rating: 4+ / Everyone (navigation app)

## Additional Technical Assumptions from Brief

**Cross-Platform Development:**
- React Native provides ~95% code sharing across iOS/Android
- Desktop platforms (Phase 1.5) have slightly less sharing due to platform extensions
- Platform-specific code uses `.ios.tsx`, `.android.tsx`, `.windows.tsx`, `.macos.tsx` file suffixes
- Performance differences between platforms acceptable as long as NFR4 (responsive UI) met on all

**Voice Recognition (Phase 2):**
- Deferred to Phase 2 per Brief
- When implemented: Use platform-native APIs (iOS Speech, Android SpeechRecognizer, Web Speech API)
- Assumption unvalidated: Voice recognition works adequately in 60+ dB cockpit noise environment

**Battery Life (NFR5):**
- 8+ hours continuous use requirement achievable through:
  - Efficient React Native rendering (avoid unnecessary re-renders)
  - Throttled NMEA data updates (max 1/second to UI per FR33)
  - Background processing optimization
  - Screen dimming in Night/Red-Night modes (FR26)

**Raymarine EVO Protocol:**
- Assumption: Reverse-engineered protocol from matztam GitHub repo is complete and accurate
- Risk: Raymarine may change protocol in firmware updates
- Mitigation: Test extensively with beta users on different EVO firmware versions (Month 5-7)
- NMEA2000 PGN-based commands work via NMEA0183 bridges using `$PCDIN` encapsulation

**Market Timing:**
- Assumption: Target users have technical literacy to install/configure WiFi bridges
- Assumption: Users willing to pay $79.99 for instrument app (price point from forum research, not formal validation)
- Assumption: Word-of-mouth marketing effective in boating community forums

---
