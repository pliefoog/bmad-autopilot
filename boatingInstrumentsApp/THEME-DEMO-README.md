# BMad Marine Theme Demo - Story 2.14

## 🎯 What This Demonstrates

This sample app showcases the **Story 2.14: Marine-Compliant Theme System** implementation with:

- **Day Mode**: High contrast colors for bright sunlight visibility
- **Night Mode**: Dark backgrounds with reduced brightness for low light
- **Red-Night Mode**: Pure red spectrum colors (no blue/green light) for night vision preservation  
- **Native Brightness Control**: Automatic screen brightness adjustment per theme mode

## 🚀 Quick Start

### Current Setup Status: ✅ READY

The web development server is configured and the theme demo is active.

```bash
# Check current status
./switch-app.sh status

# Theme demo is active - just refresh your browser!
# http://localhost:8081
```

## 🔧 App Management

Use the included script to switch between demo and full dashboard:

```bash
# Switch to theme demo (Story 2.14 showcase)
./switch-app.sh demo

# Switch to full marine dashboard
./switch-app.sh full

# Check which app is currently active
./switch-app.sh status
```

## 🧪 Testing the Theme System

### In the Browser (http://localhost:8081):

1. **Theme Switching**: Use the theme switcher at the top to cycle through modes
2. **Native Brightness**: Toggle the "Native Screen Control" switch
3. **Visual Inspection**: Notice how Red-Night mode uses only red colors
4. **Theme Details**: Tap "View Details" for implementation info

### Marine Compliance Validation:

```bash
# Run the comprehensive theme compliance tests
npm test -- __tests__/themeCompliance.test.ts

# Should show: 11 tests passing ✅
# Tests verify red-night purity, marine safety standards, etc.
```

## 📱 What You Should See

### Day Mode (Default)
- Bright blue/white theme optimized for sunlight visibility
- High contrast for outdoor marine use

### Night Mode  
- Dark theme with reduced brightness
- Comfortable for low-light conditions

### Red-Night Mode 🔴
- **CRITICAL**: Pure red spectrum only (#FF0000, #CC0000, etc.)
- Zero blue/green light emission for night vision preservation
- Essential for marine navigation safety

### Native Brightness Control
- **Day**: 100% brightness
- **Night**: 40% max brightness  
- **Red-Night**: 20% max brightness
- Uses Expo Brightness API for system-level control

## 🏗️ Technical Implementation

### Files Modified for Story 2.14:
- `src/core/themeStore.ts` - Enhanced with native brightness + pure red colors
- `src/widgets/ThemeSwitcher.tsx` - Added native brightness toggle
- `src/utils/themeCompliance.ts` - NEW: Marine safety validation system
- `__tests__/themeCompliance.test.ts` - NEW: Comprehensive test suite

### Key Features:
- ✅ Marine-compliant color palettes
- ✅ Native OS brightness integration  
- ✅ Development-time validation warnings
- ✅ Red-night purity testing (RGB analysis)
- ✅ Theme persistence across app restarts
- ✅ Smooth theme switching without flicker

## 🧭 Marine Safety Compliance

The red-night theme is specifically designed for marine navigation:

- **Night Vision Preservation**: Red light (620-750nm wavelength) doesn't destroy rhodopsin in retinal rods
- **Zero Blue/Green**: Eliminates 450-570nm wavelengths that impair night vision
- **Safety Critical**: Essential for safe marine navigation in darkness
- **Compliance Testing**: Automated RGB analysis ensures no blue/green light emission

## 🔄 Restoring Original App

Your original dashboard app is safely backed up:

```bash
# Restore full dashboard
./switch-app.sh full

# The backup is at: app/index.tsx.backup
```

## ✅ Story 2.14 Completion Status

- [x] **Day/Night/Red-Night themes** implemented with marine-compliant colors
- [x] **Native brightness control** integration with Expo Brightness API  
- [x] **Theme compliance validation** system with development warnings
- [x] **Comprehensive test suite** (11 tests passing)
- [x] **Marine safety standards** verified for red-night mode
- [x] **Smooth theme switching** without UI flicker
- [x] **Theme persistence** across app restarts

**Status: Ready for Review ✅**

---

*Marine theme system with night vision preservation - Story 2.14 Complete!* 🌊⚓