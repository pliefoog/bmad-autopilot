# Boating Instruments App

Transform your smartphone, tablet, or desktop into a comprehensive marine instrument display and autopilot controller.

## 📱 Overview

The **Boating Instruments App** connects to boat NMEA networks via WiFi bridges to provide real-time marine data visualization and Raymarine Evolution autopilot control. It's designed for solo sailors and powerboaters who need flexible, customizable instrument displays accessible from anywhere on the vessel.

**Key Features:**
- 🎯 10 Marine Instrument Widgets (Depth, Speed, Wind, GPS, Compass, Engine, Battery, Tanks, Autopilot, Rudder)
- 🎮 Raymarine Evolution Autopilot Control
- 📱 Cross-Platform (iOS, Android, Windows*, macOS*)
- 🎨 Customizable Widget Layouts (Drag & Drop)
- 🌙 Day/Night/Red-Night Display Modes
- 🔔 Safety-Critical Alarms
- 📊 Real-time NMEA 0183/2000 Data Parsing

_* Windows and macOS support coming in Phase 1.5_

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm
- Xcode 14+ (iOS, macOS only)
- Android Studio (Android)

### Setup

```bash
# Clone repository
git clone <repository-url>
cd bmad-autopilot/boatingInstrumentsApp

# Install dependencies
npm install

# iOS: Install CocoaPods
cd ios && bundle exec pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS (in new terminal)
npm run ios

# Or run on Android (in new terminal)
npm run android
```

### Testing Without a Boat

Use **Playback Mode** to test with pre-recorded NMEA data:

```bash
npm run dev:bench -- vendor/sample-data/sailing_session.nmea 10 30
```

Or launch the app and skip the setup wizard to enter **Demo Mode** with synthetic data.

---

## 📚 Documentation

### Getting Started

- **[Quick Start Guide](QUICK-START.md)** - 5-minute setup for daily development
- **[Setup and Testing Guide](SETUP-AND-TESTING.md)** - Complete installation instructions for all platforms
- **[Platform Troubleshooting](PLATFORM-TROUBLESHOOTING.md)** - Solutions to common iOS/Android issues

### Development

- **[Testing Strategy](TESTING-STRATEGY.md)** - Comprehensive testing approach and coverage goals
- **[Architecture Documentation](docs/architecture.md)** - Full-stack technical architecture
- **[Product Requirements](docs/prd.md)** - Complete PRD with epic breakdown

### Testing

- **[Testing README](boatingInstrumentsApp/README-testing.md)** - Quick testing commands reference

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Integration Tests
```bash
npm run test:integration
```

### Check Coverage (Target: ≥70%)
```bash
npm test -- --coverage
```

### Run Fast CI Tests
```bash
npm run test:ci-fast
```

**Test Categories:**
- **Unit Tests:** Widgets, services, stores, utilities
- **Integration Tests:** Connection resilience, mode switching, playback UI
- **Performance Tests:** Throughput (500 msg/sec), widget latency (<100ms)

See [Testing Strategy](TESTING-STRATEGY.md) for detailed information.

---

## 🏗️ Project Structure

```
bmad-autopilot/
├── boatingInstrumentsApp/        # React Native application
│   ├── src/                      # Source code
│   │   ├── components/           # Reusable UI components
│   │   ├── widgets/              # Marine instrument widgets
│   │   ├── services/             # NMEA, storage, playback services
│   │   ├── store/                # Zustand state management
│   │   ├── hooks/                # Custom React hooks
│   │   ├── theme/                # Design system (Day/Night/Red-Night)
│   │   └── utils/                # Utility functions
│   │
│   ├── __tests__/                # Test files
│   │   ├── integration/          # Integration tests
│   │   ├── services/             # Service tests
│   │   └── *.test.tsx            # Widget/component tests
│   │
│   ├── ios/                      # iOS native code
│   ├── android/                  # Android native code
│   ├── vendor/sample-data/       # NMEA test data files
│   │
│   ├── App.tsx                   # Root component
│   ├── package.json              # Dependencies
│   └── jest.config.js            # Test configuration
│
├── docs/                         # Project documentation
│   ├── prd.md                    # Product Requirements Document
│   ├── architecture.md           # Technical architecture
│   └── qa/                       # QA documentation
│
├── SETUP-AND-TESTING.md          # Complete setup guide
├── QUICK-START.md                # Quick reference guide
├── PLATFORM-TROUBLESHOOTING.md   # Platform-specific issues
├── TESTING-STRATEGY.md           # Testing approach
└── README.md                     # This file
```

---

## 🎯 Key Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React Native | 0.82 | Cross-platform mobile/desktop |
| **Language** | TypeScript | 5.8+ | Type-safe development |
| **State** | Zustand | 5.0+ | Global state management |
| **Networking** | react-native-tcp-socket | 6.3+ | TCP/UDP NMEA connections |
| **Parsing** | nmea-simple, @canboat/canboatjs | Latest | NMEA 0183/2000 parsing |
| **UI** | React Native SVG, Reanimated | Latest | Custom gauges & animations |
| **Testing** | Jest, React Native Testing Library | Latest | Unit & integration testing |
| **Monitoring** | Sentry React Native SDK | Latest | Crash reporting |

---

## 📊 Quality Targets (PRD Requirements)

| Metric | Target | Current Status |
|--------|--------|---------------|
| **Test Coverage** (NFR18) | ≥70% | ✅ Tracking |
| **Crash-Free Rate** (NFR3) | 99.5%+ | ⏳ Pre-launch |
| **Connection Success** (NFR1) | 98%+ | ⏳ Pre-launch |
| **Autopilot Command Success** (NFR2) | 99%+ | ⏳ Pre-launch |
| **Widget Update Latency** (NFR4) | <100ms | ✅ Passing |
| **NMEA Throughput** (NFR10) | 500 msg/sec | ✅ Passing |
| **Battery Life** (NFR5) | 8+ hours | ⏳ Manual testing |

---

## 🚢 Supported Hardware

### WiFi Bridges (Tested)
- ✅ Quark-Elec A032
- ✅ Actisense W2K-1
- 🔄 Additional bridges being validated

### Autopilot Systems
- ✅ Raymarine Evolution Series
  - EV-100 (Wheel & Tiller)
  - EV-200 (Wheel & Tiller)
  - EV-400 (Hydraulic)
- 🔄 Additional autopilot systems in Phase 2

### NMEA Protocols
- ✅ NMEA 0183 (ASCII sentences)
- ✅ NMEA 2000 (PGN messages)
- ✅ NMEA 2000 over 0183 encapsulation ($PCDIN)

---

## 🗺️ Development Roadmap

### ✅ Completed
- Project initialization and setup
- NMEA 0183/2000 parsing
- TCP/UDP socket connections
- 10 core marine widgets
- Zustand state management
- Playback mode for testing
- Comprehensive test suite (70%+ coverage)
- Theme system (Day/Night/Red-Night)

### 🚧 In Progress (Epic 3 - Month 4-5)
- Raymarine Evolution autopilot control
- Bi-directional command encoding
- Tack/Gybe 5-second countdown
- Closed beta testing (10 users)

### 📅 Upcoming

**Epic 4 - Month 6: Alarms & UX Polish**
- Safety alarms (depth, wind, engine, battery)
- Grouped alarm widgets
- First-run setup wizard
- Beta expansion (50 users)

**Epic 5 - Month 7: Quality Gates & Launch**
- 99.5% crash-free rate validation
- 98%+ connection success across 3+ WiFi bridges
- 10+ documented autopilot control sessions
- iOS App Store submission
- Google Play Store submission

**Phase 1.5 - Month 8-9: Desktop & Custom Widgets**
- Windows 10/11 support
- macOS 11+ support (Intel & Apple Silicon)
- Custom widget composition capability

**Phase 2 - Future**
- Voice commands
- Trip logging to GPX
- Cloud sync (optional)
- Additional autopilot system support

---

## 🤝 Contributing

This project is currently in pre-launch development. Beta testing opportunities coming in Month 6-7.

**Development Workflow:**
1. Create feature branch from `main`
2. Write tests first (TDD approach)
3. Implement feature
4. Ensure tests pass: `npm test`
5. Check coverage: `npm test -- --coverage`
6. Submit pull request

**Code Quality Requirements:**
- ✅ All tests pass
- ✅ Coverage ≥70% maintained
- ✅ No ESLint errors
- ✅ Code formatted with Prettier
- ✅ TypeScript strict mode (no `any` types)

---

## 📄 License

[License information to be added]

---

## 🆘 Support

### Documentation
- [Setup Guide](SETUP-AND-TESTING.md) - Installation help
- [Quick Start](QUICK-START.md) - Daily development commands
- [Troubleshooting](PLATFORM-TROUBLESHOOTING.md) - Common issues

### External Resources
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [NMEA 0183 Reference](http://www.nmea.org/)

### Issue Reporting

If you encounter issues during setup or development:

1. Check [Platform Troubleshooting](PLATFORM-TROUBLESHOOTING.md)
2. Search existing GitHub issues
3. Open new issue with:
   - Platform (iOS/Android)
   - Node/npm versions
   - Error logs
   - Steps to reproduce

---

## 🎯 Target Audience

**Primary Users:**
- **Solo/Short-Handed Sailors** (30-45ft sailboats)
  - Need cockpit access to instruments without leaving helm
  - Overnight passages requiring night vision modes
  - Autopilot control from anywhere on boat

**Secondary Users:**
- **Powerboaters** (40-50ft motor yachts)
  - Comprehensive engine monitoring
  - Fuel and systems management
  - Dual-engine support

**Technical Requirements:**
- Existing NMEA WiFi bridge on boat
- Smartphone, tablet, or desktop device
- Basic technical literacy for WiFi configuration

---

## 📈 Project Metrics

**Timeline:** 7-month MVP (iOS + Android)

**Development Status:** Month 3-4 (Widget Framework Complete)

**Team Size:** Solo developer + AI assistance + beta testers

**Budget:** Bootstrap/self-funded

**Pricing Model:** $79.99 one-time purchase (no subscription)

**Target:** 150 paying users by Month 12

---

## 🏆 Success Criteria (Month 7 Launch)

- ✅ All 44 functional requirements implemented (FR1-FR44)
- ✅ 99.5%+ crash-free session rate (sustained 2 weeks)
- ✅ 98%+ first-connection success rate (3+ WiFi bridges)
- ✅ 99%+ autopilot command success rate
- ✅ 10+ documented autopilot control sessions (video proof)
- ✅ 50 beta testers actively using
- ✅ ≥70% test coverage maintained
- ✅ iOS App Store approval
- ✅ Google Play Store approval

---

**Version:** MVP - Pre-Launch
**Last Updated:** 2025-10-12
**Status:** Active Development - Epic 3 (Autopilot Control & Beta)

---

*Built with ⚓ for the boating community*
