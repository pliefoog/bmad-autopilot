# Deployment Architecture

## Build & Deployment Strategy

**iOS Deployment:**
- **Platform:** Expo Application Services (EAS)
- **Build Command:** `eas build --platform ios`
- **Distribution:** App Store Connect
- **Code Signing:** Apple Developer Program certificate

**Android Deployment:**
- **Platform:** Expo Application Services (EAS)
- **Build Command:** `eas build --platform android`
- **Distribution:** Google Play Console
- **Code Signing:** Android keystore

**Windows/macOS Deployment:**
- **Platform:** Platform-specific builds (future Phase 1.5)
- **Distribution:** Microsoft Store / Mac App Store

## Environments

| Environment | Purpose | NMEA Bridge | Sentry Enabled |
|-------------|---------|-------------|----------------|
| **Development** | Local development with Expo Go | 192.168.1.10:10110 or Playback Mode | No |
| **Staging** | Pre-production testing on devices | Test boat WiFi bridge | Yes |
| **Production** | Live app store releases | User's boat WiFi bridge | Yes |

---
