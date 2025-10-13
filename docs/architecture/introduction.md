# Introduction

This document outlines the complete full-stack architecture for the **Boating Instruments App**, including the React Native UI layer ("frontend"), NMEA service layer ("backend"), and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

## Architecture Overview

This is a **React Native cross-platform application** with an embedded NMEA data processing service layer. Unlike traditional web full-stack apps with separate client/server deployments, this architecture runs entirely on-device:

- **UI Layer (Frontend):** React Native components, widgets, screens
- **Service Layer (Backend):** TCP socket management, NMEA parsing, autopilot command encoding
- **State Bridge:** Zustand stores connecting service layer to UI layer
- **External Integration:** WiFi bridge hardware providing NMEA data stream

The app transforms smartphones, tablets, and desktop devices into comprehensive marine instrument displays by processing real-time NMEA 0183/2000 data streams from boat networks.

## Starter Template

**Selected Starter:** Expo SDK 51+ with TypeScript

**Initial Setup Command:**
```bash
npx create-expo-app boating-instruments --template blank-typescript
```

**Pre-configured Choices:**
- Metro bundler for JavaScript packaging
- Expo Router for file-based navigation
- Built-in support for iOS/Android builds via EAS
- Hot reload and instant previews via Expo Go
- TypeScript configuration included

**Constraints Imposed:**
- Must use Expo-compatible libraries for native modules (TCP sockets require config plugins)
- Build process through EAS (Expo Application Services)
- Slightly larger bundle size than bare React Native (~20MB additional overhead)

**What Can Be Modified:**
- Can eject to bare workflow if needed for custom native modules
- State management library (Zustand chosen)
- UI component approach (custom widgets chosen over component libraries)

---
