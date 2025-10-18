#!/bin/bash
# Mobile Development Setup for LOW SYSTEM SPACE Scenario
# Project: bmad-autopilot
# Author: Mary (Business Analyst)
# Date: 2025-10-18
#
# SCENARIO: System drive has <25 GB free - cannot use App Store Xcode install
# SOLUTION: Download and extract Xcode directly to external drive

set -e

echo "=========================================="
echo "Mobile Dev Setup - Low Space Edition"
echo "=========================================="
echo ""
echo "⚠️  OPTIMIZED FOR: Systems with <25 GB free space"
echo "   All downloads and installations go to external drive"
echo ""

# Verify external drive
if [ ! -d "/Volumes/SSD_I" ]; then
  echo "❌ ERROR: External drive /Volumes/SSD_I not found!"
  exit 1
fi

# Check system space
SYSTEM_FREE=$(df -h / | awk 'NR==2 {print $4}')
echo "System drive free space: $SYSTEM_FREE"
echo "External drive: /Volumes/SSD_I"
echo ""

# Create structure
echo "📁 Creating directory structure..."
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Downloads
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/avd
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Build-Caches
echo "✅ Directories created"
echo ""

# Configure environment
echo "⚙️  Configuring environment variables..."
cp ~/.zshrc ~/.zshrc.backup-$(date +%Y%m%d-%H%M%S)

cat >> ~/.zshrc << 'EOF'

# ============================================
# Mobile Development - Low Space Configuration
# All tools on external drive
# Date: $(date +%Y-%m-%d)
# ============================================

export ANDROID_HOME=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk
export ANDROID_AVD_HOME=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/avd
export DEVELOPER_DIR=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/Xcode.app/Contents/Developer
export GRADLE_USER_HOME=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Build-Caches/gradle
export COCOAPODS_CACHE_DIR=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Build-Caches/cocoapods

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

alias xcode-ext="open /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/Xcode.app"

EOF

echo "✅ Environment configured"
echo ""

# Android project config
PROJECT_PATH="/Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp"
if [ -d "$PROJECT_PATH/android" ]; then
  echo "sdk.dir=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk" > "$PROJECT_PATH/android/local.properties"
  echo "✅ Android project configured"
fi
echo ""

echo "=========================================="
echo "✅ CONFIGURATION COMPLETE"
echo "=========================================="
echo ""
echo "NEXT: XCODE INSTALLATION (3 Options)"
echo ""
echo "────────────────────────────────────────"
echo "OPTION 1: xcodes Tool (EASIEST)"
echo "────────────────────────────────────────"
echo ""
echo "1. Install xcodes:"
echo "   brew install xcodesorg/made/xcodes"
echo ""
echo "2. Install Xcode to external drive:"
echo "   xcodes install 16.0 \\"
echo "     --path /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode \\"
echo "     --experimental-unxip"
echo ""
echo "3. Configure:"
echo "   sudo xcode-select --switch /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/Xcode.app/Contents/Developer"
echo "   sudo xcodebuild -license accept"
echo ""
echo "────────────────────────────────────────"
echo "OPTION 2: Manual Download (MORE CONTROL)"
echo "────────────────────────────────────────"
echo ""
echo "1. Visit: https://developer.apple.com/download/all/"
echo "   Login with Apple ID"
echo "   Search: 'Xcode 16'"
echo ""
echo "2. Download to external drive:"
echo "   Save to: /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Downloads/"
echo ""
echo "3. Extract on external drive:"
echo "   cd /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Downloads"
echo "   xip --expand Xcode_16.0.xip"
echo "   # ⏳ Takes 10-15 minutes, watch progress"
echo ""
echo "4. Move to final location:"
echo "   mv Xcode.app /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/"
echo ""
echo "5. Configure:"
echo "   sudo xcode-select --switch /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/Xcode.app/Contents/Developer"
echo "   sudo xcodebuild -license accept"
echo "   sudo xcodebuild -runFirstLaunch"
echo ""
echo "6. Cleanup:"
echo "   rm /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Downloads/Xcode_16.0.xip"
echo ""
echo "────────────────────────────────────────"
echo "OPTION 3: Aria2 Download (FASTEST)"
echo "────────────────────────────────────────"
echo ""
echo "1. Install aria2:"
echo "   brew install aria2"
echo ""
echo "2. Get download URL:"
echo "   Visit: https://developer.apple.com/download/all/"
echo "   Right-click Xcode → Copy Link Address"
echo ""
echo "3. Download with aria2:"
echo "   cd /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Downloads"
echo "   aria2c -x 16 -s 16 'PASTE_URL_HERE'"
echo ""
echo "4. Extract and configure (same as Option 2, steps 3-6)"
echo ""
echo "=========================================="
echo "AFTER XCODE: Android Studio Setup"
echo "=========================================="
echo ""
echo "1. Reload shell:"
echo "   source ~/.zshrc"
echo ""
echo "2. Install Android Studio (app on system, SDK on external):"
echo "   brew install --cask android-studio"
echo ""
echo "3. Launch and configure:"
echo "   open -a 'Android Studio'"
echo "   - Choose 'Custom' installation"
echo "   - SDK Location: /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk"
echo "   - Install API 33, 34, Platform-Tools, Build-Tools 36.0.0"
echo ""
echo "4. Install support tools:"
echo "   brew install cocoapods watchman"
echo ""
echo "5. Install iOS dependencies:"
echo "   cd /Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp/ios"
echo "   pod install"
echo ""
echo "=========================================="
echo "ESTIMATED SPACE USAGE"
echo "=========================================="
echo ""
echo "System Drive:"
echo "  Android Studio app:     ~3 GB"
echo "  Homebrew packages:      ~1 GB"
echo "  Total new usage:        ~4 GB"
echo ""
echo "External Drive:"
echo "  Xcode.app:             ~18 GB"
echo "  Android SDK:           ~25 GB"
echo "  Android AVD:           ~8 GB"
echo "  iOS Simulators:        ~6 GB"
echo "  Total usage:           ~57 GB"
echo ""
echo "⚠️  CRITICAL: All downloads must go to external drive!"
echo ""
